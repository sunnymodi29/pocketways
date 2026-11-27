"use client";

import { ArrowLeftRight, Heart, ImageIcon, Link2, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { destOf, evaluate, fmt, guideState, hrsLabel, originOf } from "@/lib/engine";
import { iconByName } from "@/lib/icons";
import { waUrl } from "@/lib/links";
import { POLL_WHY } from "@/lib/poll-client";
import { savedHash, useTrip, type SavedTrip } from "@/lib/store";
import { useGate } from "@/lib/use-gate";
import { DestIcon } from "./kit";
import { WhatsAppIcon } from "./brand-icons";

const costOf = (s: SavedTrip, month: number) =>
  evaluate(guideState({ from: s.from, days: s.days, travelers: s.travelers || 2, stay: s.stay || "budget", month }), destOf(s.id)!);

export function SavedPanel({
  onFind, onCard, onCompare,
}: {
  onFind: () => void;
  onCard: (items: SavedTrip[]) => void;
  onCompare: (items: SavedTrip[]) => void;
}) {
  const open = useTrip((s) => s.savedOpen);
  const shared = useTrip((s) => s.sharedList);
  const saved = useTrip((s) => s.saved);
  const month = useTrip((s) => s.S.month);
  const close = useTrip((s) => s.closeSaved);
  const toggleSave = useTrip((s) => s.toggleSave);
  const clearSaved = useTrip((s) => s.clearSaved);
  const openPollDraft = useTrip((s) => s.openPollDraft);
  const { gate } = useGate();
  const saveAll = useTrip((s) => s.saveAll);
  const openTrip = useTrip((s) => s.openSavedTrip);
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t); }, [armed]);

  const items = shared ?? saved;
  const url = () => location.origin + "/" + savedHash(items);
  const shareText = () =>
    `✈ My Pocketways shortlist (${items.length} trip${items.length > 1 ? "s" : ""}):\n` +
    items.slice(0, 8).map((s, i) => `${i + 1}. ${destOf(s.id)!.name} from ${originOf(s.from)!.name}: ${fmt(costOf(s, month).cost.total)}/person (${s.days} days)`).join("\n") +
    `\n\nSee the list ⬇\n${url()}`;
  const compare = () => (items.length < 2 ? toast("Save at least 2 trips to compare") : onCompare(items.slice(0, 4)));

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-line bg-surface p-0 sm:max-w-[440px]">
        <div className="border-b border-line p-5">
          <SheetTitle className="text-xl font-bold">{shared ? "Shared trips" : "My trips"}</SheetTitle>
          <SheetDescription className="text-[13px]">
            {shared ? "A shortlist someone shared with you" : items.length ? `${items.length} saved on this device` : "Saved on this device"}
          </SheetDescription>
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-5">
          {!items.length && (
            <div className="grid place-items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <Heart className="size-8 text-primary" />
              <b className="text-base text-foreground">No saved trips yet</b>
              <p className="max-w-[28ch]">Tap the heart on any trip to keep it here, then share your shortlist with friends.</p>
              <Button className="mt-2" onClick={() => { close(); onFind(); }}>Find trips</Button>
            </div>
          )}
          {items.map((s) => {
            const d = destOf(s.id)!;
            const o = originOf(s.from)!;
            const r = costOf(s, month);
            const ModeIcon = r.mode ? iconByName(r.mode.icon) : null;
            return (
              <div key={s.id + s.from + s.days} className="flex items-stretch gap-1.5">
                <button
                  type="button"
                  onClick={() => openTrip(s)}
                  className="group/item grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-transparent bg-surface-2 px-3 py-2.5 text-left transition-colors duration-200 hover:border-primary"
                >
                  <span className="grid size-[42px] place-items-center rounded-lg bg-surface text-primary"><DestIcon d={d} className="size-[22px]" /></span>
                  <span className="grid min-w-0 overflow-hidden">
                    <span className="truncate text-base font-semibold">{d.name}</span>
                    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12.5px] whitespace-nowrap text-muted-foreground">
                      <span><span className="max-[480px]:hidden">From </span>{o.name} · {s.days} days</span>
                      {ModeIcon && r.mode && (
                        <span className="inline-flex shrink-0 items-center gap-1"><ModeIcon className="size-3.5" />{hrsLabel(r.mode.hrs)}</span>
                      )}
                    </span>
                  </span>
                  <span className="grid text-right text-[17px] leading-tight font-bold text-primary tabular-nums">
                    {fmt(r.cost.total)}
                    <small className="text-[11px] font-normal text-muted-foreground">per person</small>
                  </span>
                </button>
                {!shared && (
                  <button
                    type="button"
                    onClick={() => toggleSave(s.id)}
                    aria-label={`Remove ${d.name}`}
                    title="Remove"
                    className="grid w-11 place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-bad/15 hover:text-bad"
                  >
                    <Trash2 className="size-[18px]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-line p-4">
            {shared ? (
              <>
                <Button className="rounded-lg" onClick={() => saveAll(items)}><Heart /> Save all to My trips</Button>
                <Button variant="outline" className="rounded-lg" onClick={compare}><ArrowLeftRight /> Compare</Button>
                <Button variant="outline" className="rounded-lg" onClick={() => window.open(waUrl(shareText()), "_blank", "noopener")}><WhatsAppIcon /> WhatsApp</Button>
              </>
            ) : (
              <>
                <Button className="rounded-lg bg-whatsapp text-[#04321a] hover:bg-whatsapp/85" onClick={() => window.open(waUrl(shareText()), "_blank", "noopener")}><WhatsAppIcon /> Share on WhatsApp</Button>
                <Button variant="outline" className="rounded-lg" onClick={() => navigator.clipboard.writeText(url()).then(() => toast("Link copied")).catch(() => toast("Couldn't copy the link"))}><Link2 /> Copy link</Button>
                <Button variant="outline" className="rounded-lg" onClick={() => { close(); onCard(items); }}><ImageIcon /> Share card</Button>
                <Button variant="outline" className="rounded-lg" onClick={compare}><ArrowLeftRight /> Compare</Button>
                <Button variant="outline" className="rounded-lg" onClick={() => gate(POLL_WHY, () => openPollDraft(items))}><Users /> Plan with friends</Button>
                <Button variant="outline" className="rounded-lg" onClick={() => { if (!armed) setArmed(true); else { clearSaved(); setArmed(false); } }}><Trash2 /> {armed ? "Tap again to clear" : "Clear all"}</Button>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
