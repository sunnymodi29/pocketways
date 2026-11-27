"use client";

import { Clock, Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EXPIRY_CHOICES, type PollData } from "@/lib/poll-client";
import { cn } from "@/lib/utils";

export interface PollPatch {
  title: string;
  /** days from now; null for no limit; left out to keep the current deadline */
  expiresDays?: number | null;
}

/** The creator changes the title or the deadline. Choosing a deadline on an ended poll reopens it. */
export function PollEditDialog({ poll, open, onOpenChange, onSave, saving }: {
  poll: PollData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: PollPatch) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(poll.title);
  const [expires, setExpires] = useState<"keep" | number | null>("keep");
  useEffect(() => {
    if (open) { setTitle(poll.title); setExpires("keep"); }
  }, [open, poll.title]);

  const clean = title.trim();
  const changed = clean !== poll.title || expires !== "keep";
  const options: { value: "keep" | number | null; label: string }[] = [
    { value: "keep", label: poll.closed ? "Keep it ended" : "Keep as it is" },
    ...EXPIRY_CHOICES.map((c) => ({ value: c.days, label: c.label })),
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(520px,94vw)]">
        <DialogHeader className="px-[18px] pt-[18px] pb-3 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold"><Pencil className="size-5 text-primary" /> Edit poll</DialogTitle>
          <DialogDescription className="text-[13px]">Change the title or the deadline. The trips and votes stay as they are.</DialogDescription>
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
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"><Clock className="size-3.5" /> Voting stays open for</span>
            <div role="radiogroup" aria-label="How long voting stays open" className="flex flex-wrap gap-1.5">
              {options.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  role="radio"
                  aria-checked={expires === o.value}
                  onClick={() => setExpires(o.value)}
                  className={cn("rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-200", expires === o.value ? "border-primary bg-primary text-primary-foreground" : "border-line bg-surface-2 hover:border-primary/60")}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {poll.closed ? "This poll has ended. Pick a time to reopen it for voting." : "The new time counts from today."}
            </p>
          </div>
        </div>
        <DialogFooter className="flex-row flex-wrap gap-2 border-t border-line px-3.5 pt-3 pb-3.5 sm:justify-start">
          <Button
            disabled={saving || !clean || !changed}
            onClick={() => onSave({ title: clean, ...(expires !== "keep" ? { expiresDays: expires } : {}) })}
          >
            {saving ? <Loader2 className="tw-spin" /> : <Pencil />} Save changes
          </Button>
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
