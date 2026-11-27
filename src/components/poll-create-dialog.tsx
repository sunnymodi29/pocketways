"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CheckCheck, CircleDot, Clock, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { destOf } from "@/lib/engine";
import { EXPIRY_CHOICES, createPoll } from "@/lib/poll-client";
import { useTrip } from "@/lib/store";
import { DestIcon } from "./kit";
import { cn } from "@/lib/utils";

/** "Plan with friends": name the poll and choose whether people may pick several trips or just one. */
export function PollCreateDialog() {
  const items = useTrip((s) => s.pollDraft);
  const close = useTrip((s) => s.closePollDraft);
  const [title, setTitle] = useState("Where should we go?");
  const [multiple, setMultiple] = useState(true);
  const [expires, setExpires] = useState<number | null>(1);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (items) { setTitle("Where should we go?"); setMultiple(true); setExpires(1); setBusy(false); }
  }, [items]);

  const choice = (on: boolean, value: boolean, icon: React.ReactNode, head: string, sub: string) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setMultiple(value)}
      className={cn("flex flex-1 items-start gap-2.5 rounded-xl border bg-surface-2 p-3 text-left transition-colors duration-200", on ? "border-primary" : "border-transparent hover:border-primary/60")}
    >
      <span className={cn("mt-0.5", on ? "text-primary" : "text-muted-foreground")}>{icon}</span>
      <span className="grid gap-0.5"><b className="text-sm">{head}</b><small className="text-xs text-muted-foreground">{sub}</small></span>
    </button>
  );

  return (
    <Dialog open={!!items} onOpenChange={(o) => !o && !busy && close()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(560px,94vw)]">
        <DialogHeader className="px-[18px] pt-[18px] pb-3 text-left">
          <DialogTitle className="text-xl font-bold">Plan with friends</DialogTitle>
          <DialogDescription className="text-[13px]">Friends open the link, sign in and vote. {items?.length ?? 0} trips go on the poll.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 overflow-auto px-[18px] pt-1 pb-4 max-[600px]:px-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">Poll title</span>
            <input
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-transparent bg-surface-2 px-3 py-2.5 text-sm outline-none transition-colors duration-200 focus:border-primary"
            />
          </label>
          <div>
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">How can people vote?</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              {choice(multiple, true, <CheckCheck className="size-4" />, "Multiple choice", "Tick every trip they'd be happy with")}
              {choice(!multiple, false, <CircleDot className="size-4" />, "Single choice", "Each person picks just one trip")}
            </div>
          </div>
          <div>
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"><Clock className="size-3.5" /> Voting stays open for</span>
            <div role="radiogroup" aria-label="How long voting stays open" className="flex flex-wrap gap-1.5">
              {EXPIRY_CHOICES.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  role="radio"
                  aria-checked={expires === c.days}
                  onClick={() => setExpires(c.days)}
                  className={cn("rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-200", expires === c.days ? "border-primary bg-primary text-primary-foreground" : "border-line bg-surface-2 hover:border-primary/60")}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">After that, results stay visible but nobody can change a vote. You can also end it earlier from the poll page.</p>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">On the poll</span>
            <ul className="flex flex-wrap gap-1.5">
              {items?.map((t) => {
                const d = destOf(t.id);
                return d ? (
                  <li key={t.id + t.from + t.days} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1.5 text-[13px] font-semibold">
                    <DestIcon d={d} className="size-[15px]" />
                    {d.name.split(" & ")[0]}
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        </div>
        <DialogFooter className="flex-row flex-wrap gap-2 border-t border-line px-3.5 pt-3 pb-3.5 sm:justify-start">
          <Button
            disabled={busy}
            onClick={async () => {
              if (!items) return;
              setBusy(true);
              const ok = await createPoll(items, { title, multiple, expiresDays: expires }, { open: (url) => router.push(url), seed: (key, poll) => { qc.setQueryData(key, poll); qc.invalidateQueries({ queryKey: ["my-polls"] }); } });
              // the poll page opens without a reload, so the dialog has to be closed by hand
              if (ok) close();
              else setBusy(false);
            }}
          >
            {busy ? <Loader2 className="tw-spin" /> : <Users />} Create poll
          </Button>
          <Button variant="outline" disabled={busy} onClick={close}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
