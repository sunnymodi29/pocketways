"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Check, ChevronDown, CircleAlert, Clock, Flag, Link2, Loader2, Pencil, Trash2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { destOf, evaluate, fmt, guideState, originOf } from "@/lib/engine";
import { waUrl } from "@/lib/links";
import { closesIn, pollApi, pollError, pollMessage, voterId, type PollData } from "@/lib/poll-client";
import { useAccount } from "@/lib/use-account";
import { PollEditDialog, type PollPatch } from "./poll-edit-dialog";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { SavedHost } from "./saved-host";
import { DestIcon, Num } from "./kit";
import { WhatsAppIcon } from "./brand-icons";

/** What the poll looks like right after this voter's picks change (before the server answers). */
function applyPicks(prev: PollData, picks: string[], myName: string): PollData {
  const before = new Set(prev.mine);
  const after = new Set(picks);
  // the voter list and the avatars change at the same moment as the counts, not when the server answers
  let voters = prev.voters;
  if (after.size > 0 && before.size === 0) {
    const unnamed = prev.voters.filter((v) => /^Friend \d+$/.test(v.name)).length;
    voters = [...prev.voters, { name: myName || `Friend ${unnamed + 1}`, picks, me: true }];
  } else if (after.size > 0) voters = prev.voters.map((v) => (v.me ? { ...v, picks } : v));
  else if (before.size > 0) voters = prev.voters.filter((v) => !v.me);
  return {
    ...prev,
    voters,
    mine: picks,
    options: prev.options.map((o) => ({ ...o, votes: o.votes - (before.has(o.key) ? 1 : 0) + (after.has(o.key) ? 1 : 0) })),
    voter_count: Math.max(0, prev.voter_count + (before.size === 0 && after.size > 0 ? 1 : 0) - (before.size > 0 && after.size === 0 ? 1 : 0)),
  };
}

/** "Created 24 Nov 2026". */
const createdOn = (t: number) => "Created " + new Date(t * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** One letter (or the number, for "Friend 3") to stand in for a face. */
const initial = (name: string) => {
  const m = /^Friend (\d+)$/.exec(name);
  return m ? m[1] : (name.trim()[0] ?? "?").toUpperCase();
};

function Avatar({ name, className }: { name: string; className?: string }) {
  return <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/15 text-[11px] font-bold text-primary", className)}>{initial(name)}</span>;
}

/**
 * Same shape as the real poll, in the same two columns: on the left the label row, title, voters, hint and the trip
 * cards; on the right the "created by" card, "Who voted" and the invite buttons. Sizes match the real blocks so
 * nothing jumps when the poll arrives. It shows what a friend sees (no creator buttons), the most common way in.
 */
export function PollSkeleton() {
  return (
    <div className="grid gap-x-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_auto_1fr]" aria-busy="true" aria-label="Loading the poll">
      {/* who made it */}
      <div className="mb-5 rounded-2xl border border-line bg-surface p-4 lg:col-start-2 lg:row-start-1 lg:mb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-28" /></div>
        </div>
      </div>

      {/* the poll itself */}
      <div className="min-w-0 lg:col-start-1 lg:row-span-3 lg:row-start-1">
        <div className="flex items-center gap-2.5"><Skeleton className="h-[26px] w-28 rounded-full" /><Skeleton className="h-3.5 w-32" /></div>
        <Skeleton className="mt-3 h-[46px] w-3/4 max-w-md" />
        <div className="mt-3 flex min-h-7 items-center gap-2.5"><Skeleton className="size-7 shrink-0 rounded-full" /><Skeleton className="h-4 w-40" /></div>
        <Skeleton className="mt-3 h-5 w-full max-w-sm" />
        <div className="mt-5 space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
              <Skeleton className="size-12 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="mt-0.5 h-4 w-56 max-w-full" />
                <div className="mt-2.5 flex h-4 items-center gap-2"><Skeleton className="h-2 flex-1 rounded-full" /><Skeleton className="h-3 w-9" /></div>
              </div>
              <div className="w-9 space-y-1.5"><Skeleton className="mx-auto h-5 w-5" /><Skeleton className="h-2.5 w-full" /></div>
              <Skeleton className="size-10 shrink-0 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* who voted and the invite buttons */}
      <div className="mt-5 min-w-0 lg:col-start-2 lg:row-start-2 lg:mt-0">
        <Skeleton className="mb-3 h-[42px] w-full rounded-xl" />
        <div className="flex gap-2"><Skeleton className="h-9 flex-1 rounded-lg" /><Skeleton className="h-9 w-28 rounded-lg" /></div>
      </div>
    </div>
  );
}

export function PollView({ id }: { id: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [voter, setVoter] = useState("");
  const { isLoaded, isSignedIn, user } = useAccount();
  useEffect(() => { setVoter(voterId()); }, []);
  const key = ["poll", id, voter];

  const poll = useQuery({
    queryKey: key,
    queryFn: () => pollApi<PollData>(`/${id}?voter=${voter}`),
    enabled: !!voter,
    // while a vote is being saved, a refresh would show the old answer and make the page flicker back
    refetchInterval: () => (qc.isMutating({ mutationKey: ["vote", id] }) ? false : 4000),
    retry: (n, e) => !(e as { code?: number }).code && n < 2,
  });

  const meName = (user?.name || user?.email || "").split(/\s+/)[0];
  const vote = useMutation({
    mutationKey: ["vote", id],
    scope: { id: `vote-${id}` }, // quick taps are saved one after another, in the order they were made
    mutationFn: (picks: string[]) => pollApi<PollData>(`/${id}/vote`, { voter, picks }),
    onMutate: async (picks) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<PollData>(key);
      if (prev) qc.setQueryData<PollData>(key, applyPicks(prev, picks, meName));
      return { prev };
    },
    onError: (e, _p, ctx) => {
      toast(pollMessage(e));
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      if (pollError(e)?.code === 409) qc.invalidateQueries({ queryKey: key });
    },
    onSuccess: (data) => {
      // only the last answer in a burst of taps is shown; earlier ones are already out of date
      if (qc.isMutating({ mutationKey: ["vote", id] }) <= 1) qc.setQueryData(key, data);
      qc.invalidateQueries({ queryKey: ["my-polls"] });
    },
  });

  const [confirmEnd, setConfirmEnd] = useState(false);
  const end = useMutation({
    mutationFn: () => pollApi<PollData>(`/${id}/end`, {}),
    onSuccess: (d) => {
      qc.setQueryData<PollData>(key, (old) => (old ? { ...old, closed: true, closes: d.closes } : d));
      setConfirmEnd(false);
      toast("Poll ended. The results are final.");
    },
    onError: (e) => { toast(pollMessage(e)); setConfirmEnd(false); },
  });

  const [editOpen, setEditOpen] = useState(false);
  const edit = useMutation({
    mutationFn: (patch: PollPatch) => pollApi<PollData>(`/${id}`, { voter, ...patch }, "PATCH"),
    onSuccess: (d) => {
      qc.setQueryData(key, d);
      qc.invalidateQueries({ queryKey: ["my-polls"] });
      setEditOpen(false);
      toast("Poll updated");
    },
    onError: (e) => toast(pollMessage(e)),
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const del = useMutation({
    mutationFn: () => pollApi<{ deleted: boolean }>(`/${id}`, undefined, "DELETE"),
    onSuccess: () => {
      qc.removeQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["my-polls"] });
      toast("Poll deleted");
      router.push("/account#polls");
    },
    onError: (e) => { toast(pollMessage(e)); setConfirmDelete(false); },
  });

  const data = poll.data;
  const url = typeof location !== "undefined" ? location.href : "";
  const toggle = (k: string) => {
    if (!data || data.closed) return;
    let next: string[];
    if (data.multiple) next = data.mine.includes(k) ? data.mine.filter((x) => x !== k) : [...data.mine, k];
    else next = data.mine.includes(k) ? [] : [k]; // single choice: pick one, tap again to clear
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
      <main className="mx-auto w-full max-w-[1100px] px-4 pt-[88px] pb-16 sm:px-6 lg:px-8">
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
            <div className="grid gap-x-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_auto_1fr]">
              <aside aria-label="About this poll" className="tw-rise mb-5 rounded-2xl border border-line bg-surface p-4 lg:col-start-2 lg:row-start-1 lg:mb-3">
                <div className="flex items-center gap-3">
                  {data.creatorName ? (
                    <Avatar name={data.creatorName} className="size-10 text-sm" />
                  ) : (
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-muted-foreground"><Users className="size-4" /></span>
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <span className="truncate">{data.creatorName ? `Created by ${data.creatorName}` : "Group poll"}</span>
                      {data.owner && <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10.5px] font-semibold text-primary">You</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{createdOn(data.created)}</p>
                  </div>
                </div>
                {data.owner && (
                  <>
                    <div className={cn("mt-4 grid gap-2", data.closed ? "grid-cols-2" : "grid-cols-3")}>
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setEditOpen(true)}><Pencil /> Edit</Button>
                      {!data.closed && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("rounded-lg", confirmEnd && "border-bad/60 text-bad hover:bg-bad/10 hover:text-bad")}
                          disabled={end.isPending}
                          onBlur={() => setConfirmEnd(false)}
                          onClick={() => (confirmEnd ? end.mutate() : setConfirmEnd(true))}
                        >
                          {end.isPending ? <Loader2 className="tw-spin" /> : <Flag />} {confirmEnd ? "Confirm" : "End poll"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("rounded-lg", confirmDelete && "border-bad/60 text-bad hover:bg-bad/10 hover:text-bad")}
                        disabled={del.isPending}
                        onBlur={() => setConfirmDelete(false)}
                        onClick={() => (confirmDelete ? del.mutate() : setConfirmDelete(true))}
                      >
                        {del.isPending ? <Loader2 className="tw-spin" /> : <Trash2 />} {confirmDelete ? "Confirm" : "Delete"}
                      </Button>
                    </div>
                    {confirmEnd && <p className="mt-2 text-xs text-muted-foreground">Tap Confirm to end voting now. Results stay visible.</p>}
                    {confirmDelete && <p className="mt-2 text-xs text-bad">Tap Confirm to delete the poll and every vote on it. This can&apos;t be undone.</p>}
                  </>
                )}
              </aside>
              <div className="min-w-0 lg:col-start-1 lg:row-span-3 lg:row-start-1">

            <div className="tw-rise flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary uppercase"><Users className="size-3.5" /> Group poll</span>
              {data.closed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"><Flag className="size-3.5" /> Poll ended</span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><i className="size-1.5 animate-pulse rounded-full bg-good" /> Live</span>
                  {data.closes && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><Clock className="size-3.5" /> {closesIn(data.closes)}</span>}
                </>
              )}
            </div>
            <h1 className="tw-rise mt-3 text-[clamp(1.9rem,6vw,2.6rem)] leading-[1.1] font-bold tracking-tight" style={{ animationDelay: "0.05s" }}>{data.title}</h1>
            <div className="tw-rise mt-3 flex min-h-7 items-center" style={{ animationDelay: "0.1s" }}>
              <span
                aria-hidden
                className="flex shrink-0 -space-x-2 overflow-hidden transition-[width,margin] duration-300 ease-out"
                style={{ width: names.length ? 28 + (Math.min(names.length, 5) - 1) * 20 : 0, marginRight: names.length ? 10 : 0 }}
              >
                {names.slice(0, 5).map((n, i) => <Avatar key={i} name={n} className="tw-fade size-7 border-2 border-background bg-surface-2" />)}
              </span>
              <span className="text-sm text-muted-foreground">
                {data.voter_count ? <><b className="text-foreground"><Num value={data.voter_count} /></b> {data.voter_count === 1 ? "person has" : "people have"} voted</> : "Nobody has voted yet. Be the first."}
              </span>
            </div>

            {data.closed && leaders.length > 0 && (
              <div key={leaders.join()} className="tw-rise mt-5 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Trophy className="size-5" /></span>
                <div className="min-w-0">
                  <b className="block truncate">{data.closed ? (leaders.length === 1 ? `${leaders[0]} won` : `${leaders.join(" and ")} tied`) : leaders.length === 1 ? `${leaders[0]} is leading` : `${leaders.join(" and ")} are tied`}</b>
                  <span className="text-xs text-muted-foreground">{maxV} of {data.voter_count} {data.voter_count === 1 ? "vote" : "votes"}{data.closed ? ". Voting has ended." : " so far. Change it any time."}</span>
                </div>
              </div>
            )}

            {data.closed && leaders.length === 0 && (
              <div className="tw-rise mt-5 rounded-xl border border-line bg-surface p-3.5 text-sm text-muted-foreground">Voting has ended, and nobody voted.</div>
            )}

            {!data.closed && (
              <p className="tw-rise mt-3 text-sm text-muted-foreground" style={{ animationDelay: "0.12s" }}>
                {data.multiple ? "Tick every trip you'd be happy with." : "Pick the one trip you'd go for."}{" "}
                {isLoaded && isSignedIn && user && <>Voting as <b className="font-semibold text-foreground">{(user.name || user.email).split(/\s+/)[0]}</b>.</>}
              </p>
            )}

            <div className="mt-5 space-y-2.5">
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
                      disabled={data.closed}
                      onClick={() => toggle(o.key)}
                      className={cn("grid size-12 shrink-0 place-items-center rounded-xl border transition-colors duration-200", on ? "border-primary bg-primary text-primary-foreground" : "border-line bg-surface-2/60 hover:border-primary", data.closed && "pointer-events-none")}
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

              </div>
              <div className="mt-5 min-w-0 lg:col-start-2 lg:row-start-2 lg:mt-0">
            <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-out", data.voters.length ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
              <div className="min-h-0 overflow-hidden">
              <details className="group/who mb-3 rounded-xl border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span>Who voted <span className="text-muted-foreground">(<Num value={data.voters.length} ms={300} />)</span></span>
                  <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open/who:rotate-180" />
                </summary>
                <ul className="space-y-1.5 border-t border-line p-2.5">
                  {data.voters.map((v, i) => (
                    <li key={i} className="tw-fade flex items-center gap-2.5 rounded-lg bg-surface-2/50 px-3 py-2">
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
              </details>
              </div>
            </div>

            {!data.closed && (
            <section aria-label="Invite friends" className="tw-fade">
              <div className="flex flex-wrap gap-2">
                <Button className="flex-1 rounded-lg bg-whatsapp text-[#04321a] hover:bg-whatsapp/85" onClick={() => window.open(waUrl(`Where should we go? Vote for the trips you like ⬇\n${data.options.slice(0, 5).map((o, i) => `${i + 1}. ${destOf(o.id)?.name} (${o.days} days)`).join("\n")}\n\n${url}`), "_blank", "noopener")}><WhatsAppIcon /> Invite on WhatsApp</Button>
                <Button variant="outline" className="rounded-lg" onClick={() => navigator.clipboard.writeText(url).then(() => toast("Poll link copied")).catch(() => toast("Couldn't copy"))}><Link2 /> Copy link</Button>
              </div>
            </section>
            )}

              </div>
            </div>
          </>
        )}
      </main>
      {data?.owner && <PollEditDialog poll={data} open={editOpen} onOpenChange={setEditOpen} onSave={(patch) => edit.mutate(patch)} saving={edit.isPending} />}
    </>
  );
}
