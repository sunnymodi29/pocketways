"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Check, CircleAlert, Link2 } from "lucide-react";
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
import { Tag } from "./kit";
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
  const month = ((new Date().getMonth() + 1) % 12) + 1;

  return (
    <>
      <Header />
      <SavedHost />
      <main className="mx-auto w-full max-w-[640px] px-4 pt-[88px] pb-16">
        {poll.isPending && voter ? (
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
            <h1 className="text-3xl font-bold tracking-tight">{data.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.voter_count ? `${data.voter_count} ${data.voter_count === 1 ? "person has" : "people have"} voted` : "Be the first to vote"}
            </p>
            <p className="mt-5 text-sm">
              {data.multiple ? "Tick every trip you'd be happy with." : "Pick the one trip you'd go for."} Your vote can be changed any time; tap your pick again to withdraw it.
            </p>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">Your name</span>
              <input
                value={name}
                maxLength={24}
                autoComplete="nickname"
                placeholder="e.g. Asha"
                onChange={(e) => setName(e.target.value)}
                onBlur={() => rememberName(name)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <div className="mt-5 space-y-2.5">
              {data.options.map((o) => {
                const d = destOf(o.id);
                const og = originOf(o.from);
                if (!d || !og) return null;
                const r = evaluate(guideState({ from: o.from, days: o.days, month }), d);
                const on = data.mine.includes(o.key);
                const lead = o.votes > 0 && o.votes === maxV;
                return (
                  <div key={o.key} className={cn("flex items-center gap-3 rounded-xl border p-3 transition-colors", on ? "border-primary bg-primary/10" : "border-line bg-surface")}>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`${on ? "Remove my vote for" : "Vote for"} ${d.name}`}
                      onClick={() => toggle(o.key)}
                      className={cn("grid size-10 shrink-0 place-items-center rounded-lg border transition-colors duration-200", on ? "border-primary bg-primary text-primary-foreground" : "border-line hover:border-primary")}
                    >
                      {data.multiple ? <Check className={cn("size-5 transition-opacity", on ? "opacity-100" : "opacity-30")} /> : <span className={cn("size-3 rounded-full border-2 transition-colors", on ? "border-primary-foreground bg-primary-foreground" : "border-muted-foreground/60")} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-semibold">{d.name}{lead && <Tag tone="good">Leading</Tag>}</div>
                      <div className="text-xs text-muted-foreground"><span className="whitespace-nowrap">From {og.name} · {o.days} days</span> <span className="whitespace-nowrap">· {fmt(r.cost.total)} per person</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"><i className="block h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(o.votes / maxV) * 100}%` }} /></div>
                    </div>
                    <div className="w-6 text-center text-lg font-bold tabular-nums" aria-label={`${o.votes} votes`}>{o.votes}</div>
                    <Link href={`/#from=${o.from}&days=${o.days}&trip=${o.id}`} title="See this trip" aria-label={`See ${d.name}`} className="group/open grid size-10 shrink-0 place-items-center rounded-lg border border-line transition-colors duration-200 hover:border-primary hover:bg-primary/10 hover:text-primary"><ArrowUpRight className="size-4 transition-transform duration-200 ease-out group-hover/open:translate-x-0.5 group-hover/open:-translate-y-0.5" /></Link>
                  </div>
                );
              })}
            </div>
            {names.length > 0 && <p className="mt-3 text-[13px] text-muted-foreground">{(names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`) + " voted"}</p>}

            <div className="mt-6 flex flex-wrap gap-2">
              <Button className="rounded-lg bg-whatsapp text-[#04321a] hover:bg-whatsapp/85" onClick={() => window.open(waUrl(`Where should we go? Vote for the trips you like ⬇\n${data.options.slice(0, 5).map((o, i) => `${i + 1}. ${destOf(o.id)?.name} (${o.days} days)`).join("\n")}\n\n${url}`), "_blank", "noopener")}><WhatsAppIcon /> Invite on WhatsApp</Button>
              <Button variant="outline" className="rounded-lg" onClick={() => navigator.clipboard.writeText(url).then(() => toast("Poll link copied")).catch(() => toast("Couldn't copy"))}><Link2 /> Copy link</Button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
