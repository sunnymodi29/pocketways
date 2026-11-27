"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Check, CircleAlert, Link2, Trophy, User, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { destOf, evaluate, fmt, guideState, originOf } from "@/lib/engine";
import { waUrl } from "@/lib/links";
import { pollApi, pollMessage, rememberName, savedName, voterId, type PollData } from "@/lib/poll-client";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { SavedHost } from "./saved-host";
import { DestIcon, Num } from "./kit";
import { WhatsAppIcon } from "./brand-icons";

/** What the poll looks like right after this voter's picks change (before the server answers). */
function applyPicks(prev: PollData, picks: string[]): PollData {
  const before = new Set(prev.mine);
  const after = new Set(picks);
  return {
    ...prev,
    mine: picks,
    options: prev.options.map((o) => ({ ...o, votes: o.votes - (before.has(o.key) ? 1 : 0) + (after.has(o.key) ? 1 : 0) })),
    voter_count: Math.max(0, prev.voter_count + (before.size === 0 && after.size > 0 ? 1 : 0) - (before.size > 0 && after.size === 0 ? 1 : 0)),
  };
}

/** One letter (or the number, for "Friend 3") to stand in for a face. */
const initial = (name: string) => {
  const m = /^Friend (\d+)$/.exec(name);
  return m ? m[1] : (name.trim()[0] ?? "?").toUpperCase();
};

function Avatar({ name, className }: { name: string; className?: string }) {
  return <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/15 text-[11px] font-bold text-primary", className)}>{initial(name)}</span>;
}

/** Same shape as the real poll: title, a line of text, the name field and a few option rows. */
export function PollSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading the poll">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-9 w-full" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
          <Skeleton className="size-10 shrink-0" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48 max-w-full" /></div>
          <Skeleton className="h-6 w-6" />
        </div>
      ))}
    </div>
  );
}

export function PollView({ id }: { id: string }) {
  const qc = useQueryClient();
  const [voter, setVoter] = useState("");
  const [name, setName] = useState("");
  useEffect(() => { setVoter(voterId()); setName(savedName()); }, []);
  const key = ["poll", id, voter];

  const poll = useQuery({
    queryKey: key,
    queryFn: () => pollApi<PollData>(`/${id}?voter=${voter}`),
    enabled: !!voter,
    refetchInterval: 4000,
    retry: (n, e) => !(e as { code?: number }).code && n < 2,
  });

  const vote = useMutation({
    mutationFn: (picks: string[]) => pollApi<PollData>(`/${id}/vote`, { voter, name, picks }),
    onMutate: async (picks) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<PollData>(key);
      if (prev) qc.setQueryData<PollData>(key, applyPicks(prev, picks));
      return { prev };
    },
    onError: (e, _p, ctx) => {
      toast(pollMessage(e));
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (data) => qc.setQueryData(key, data),
  });

  const data = poll.data;
  const url = typeof location !== "undefined" ? location.href : "";
  const toggle = (k: string) => {
    if (!data) return;
    let next: string[];
    if (data.multiple) next = data.mine.includes(k) ? data.mine.filter((x) => x !== k) : [...data.mine, k];
    else next = data.mine.includes(k) ? [] : [k]; // single choice: pick one, tap again to clear
    rememberName(name);
    vote.mutate(next);
  };
  const maxV = Math.max(1, ...(data?.options.map((o) => o.votes) ?? [0]));
  const names = data?.voters.map((v) => v.name) ?? [];
  const leaders = data && maxV > 0 ? data.options.filter((o) => o.votes === maxV).map((o) => destOf(o.id)?.name ?? "") : [];
  const month = ((new Date().getMonth() + 1) % 12) + 1;

  return (
    <>
      <Header />
      <SavedHost />
      <main className="mx-auto w-full max-w-[640px] px-4 pt-[88px] pb-16">
        {!voter || poll.isPending ? (
          <PollSkeleton />
        ) : poll.isError || !data ? (
          <div className="grid place-items-center gap-2 py-24 text-center">
            <CircleAlert className="size-8 text-bad" />
            <b className="text-lg">Can&apos;t open this poll</b>
            <p className="text-sm text-muted-foreground">{pollMessage(poll.error)}</p>
            <Button asChild className="mt-2"><Link href="/">Plan a trip</Link></Button>
          </div>
        ) : (
          <>
            <div className="tw-rise flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary uppercase"><Users className="size-3.5" /> Group poll</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><i className="size-1.5 animate-pulse rounded-full bg-good" /> Live</span>
            </div>
            <h1 className="tw-rise mt-3 text-[clamp(1.9rem,6vw,2.6rem)] leading-[1.1] font-bold tracking-tight" style={{ animationDelay: "0.05s" }}>{data.title}</h1>
            <div className="tw-rise mt-3 flex items-center gap-2.5" style={{ animationDelay: "0.1s" }}>
              {names.length > 0 && (
                <span className="flex -space-x-2">
                  {names.slice(0, 5).map((n, i) => <Avatar key={i} name={n} className="size-7 border-2 border-background bg-surface-2" />)}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {data.voter_count ? <><b className="text-foreground"><Num value={data.voter_count} /></b> {data.voter_count === 1 ? "person has" : "people have"} voted</> : "Nobody has voted yet. Be the first."}
              </span>
            </div>

            {leaders.length > 0 && (
              <div key={leaders.join()} className="tw-rise mt-5 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Trophy className="size-5" /></span>
                <div className="min-w-0">
                  <b className="block truncate">{leaders.length === 1 ? `${leaders[0]} is leading` : `${leaders.join(" and ")} are tied`}</b>
                  <span className="text-xs text-muted-foreground">{maxV} of {data.voter_count} {data.voter_count === 1 ? "vote" : "votes"} so far. Change it any time.</span>
                </div>
              </div>
            )}

            <section aria-label="Your vote" className="tw-rise mt-5 rounded-2xl border border-line bg-surface p-4" style={{ animationDelay: "0.15s" }}>
              <p className="text-sm font-semibold">{data.multiple ? "Tick every trip you'd be happy with" : "Pick the one trip you'd go for"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Tap your pick again to withdraw it.</p>
              <label className="relative mt-3 block">
                <span className="sr-only">Your name</span>
                <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={name}
                  maxLength={24}
                  autoComplete="nickname"
                  placeholder="Your name (optional), e.g. Asha"
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => rememberName(name)}
                  className="w-full rounded-lg border border-line bg-surface-2/60 py-2.5 pr-3 pl-9 text-sm transition-colors outline-none focus:border-primary"
                />
              </label>
            </section>

            <div className="mt-3 space-y-2.5">
              {data.options.map((o, i) => {
                const d = destOf(o.id);
                const og = originOf(o.from);
                if (!d || !og) return null;
                const r = evaluate(guideState({ from: o.from, days: o.days, month }), d);
                const on = data.mine.includes(o.key);
                const lead = o.votes > 0 && o.votes === maxV;
                const pct = data.voter_count ? Math.round((o.votes / data.voter_count) * 100) : 0;
                return (
                  <div key={o.key} style={{ animationDelay: `${0.2 + i * 0.07}s` }} className={cn("tw-rise flex items-center gap-3 rounded-2xl border p-3 transition-colors duration-200", on ? "border-primary bg-primary/10" : "border-line bg-surface hover:border-primary/50")}>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`${on ? "Remove my vote for" : "Vote for"} ${d.name}`}
                      onClick={() => toggle(o.key)}
                      className={cn("grid size-12 shrink-0 place-items-center rounded-xl border transition-colors duration-200", on ? "border-primary bg-primary text-primary-foreground" : "border-line bg-surface-2/60 hover:border-primary")}
                    >
                      {data.multiple ? <Check className={cn("size-5 transition-opacity", on ? "opacity-100" : "opacity-30")} /> : <span className={cn("size-3.5 rounded-full border-2 transition-colors", on ? "border-primary-foreground bg-primary-foreground" : "border-muted-foreground/60")} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <DestIcon d={d} className="size-4" />
                        <b className="text-[15px]">{d.name}</b>
                        {lead && <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-semibold text-primary-foreground"><Trophy className="size-3" /> Leading</span>}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground"><span className="whitespace-nowrap">From {og.name} · {o.days} days</span> <span className="whitespace-nowrap">· <b className="font-semibold text-foreground">{fmt(r.cost.total)}</b> per person</span></div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><i className={cn("block h-full rounded-full transition-all duration-700", lead ? "bg-primary" : "bg-primary/45")} style={{ width: `${pct}%` }} /></div>
                        <span className="w-9 text-right text-[11px] font-semibold text-muted-foreground tabular-nums">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-9 text-center" aria-label={`${o.votes} votes`}>
                      <div className="text-xl leading-none font-bold tabular-nums"><Num value={o.votes} ms={400} /></div>
                      <div className="mt-1 text-[10px] tracking-wide text-muted-foreground uppercase">{o.votes === 1 ? "vote" : "votes"}</div>
                    </div>
                    <Link href={`/#from=${o.from}&days=${o.days}&trip=${o.id}`} title="See this trip" aria-label={`See ${d.name}`} className="group/open grid size-10 shrink-0 place-items-center rounded-lg border border-line transition-colors duration-200 hover:border-primary hover:bg-primary/10 hover:text-primary"><ArrowUpRight className="size-4 transition-transform duration-200 ease-out group-hover/open:translate-x-0.5 group-hover/open:-translate-y-0.5" /></Link>
                  </div>
                );
              })}
            </div>

            {data.voters.length > 0 && (
              <section aria-label="Who voted" className="tw-fade mt-6">
                <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Who&apos;s in</h2>
                <ul className="space-y-1.5">
                  {data.voters.map((v, i) => (
                    <li key={i} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2">
                      <Avatar name={v.name} />
                      <span className="shrink-0 text-sm font-medium">{v.name}</span>
                      <span className="flex min-w-0 flex-1 flex-wrap justify-end gap-1">
                        {v.picks.map((k) => {
                          const o = data.options.find((x) => x.key === k);
                          const d = o && destOf(o.id);
                          return d ? <span key={k} className="rounded-full border border-line px-2 py-0.5 text-[11.5px] text-muted-foreground">{d.name}</span> : null;
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-label="Invite friends" className="tw-fade mt-6 rounded-2xl border border-dashed border-line p-4">
              <p className="text-sm font-semibold">Bring your friends in</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Anyone with the link can vote. Results update live.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="rounded-lg bg-whatsapp text-[#04321a] hover:bg-whatsapp/85" onClick={() => window.open(waUrl(`Where should we go? Vote for the trips you like ⬇\n${data.options.slice(0, 5).map((o, i) => `${i + 1}. ${destOf(o.id)?.name} (${o.days} days)`).join("\n")}\n\n${url}`), "_blank", "noopener")}><WhatsAppIcon /> Invite on WhatsApp</Button>
                <Button variant="outline" className="rounded-lg" onClick={() => navigator.clipboard.writeText(url).then(() => toast("Poll link copied")).catch(() => toast("Couldn't copy"))}><Link2 /> Copy link</Button>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
