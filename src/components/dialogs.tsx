"use client";

import { ArrowLeftRight, Copy, Download, Heart, Share2, Star, Users, X, CircleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MONTHS, destOf, evaluate, fmt, guideState, hrsLabel, originOf } from "@/lib/engine";
import { iconByName } from "@/lib/icons";
import { makeCard, type CardInput } from "@/lib/share-card";
import { useTrip, type SavedTrip } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DestIcon, Tag } from "./kit";

/* ------------------------------------------------------------ share card */
export function ShareCardDialog({ input, onClose }: { input: CardInput | null; onClose: () => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!input) return;
    let dead = false;
    setState("loading");
    makeCard(input, location.host)
      .then((cv) => {
        if (dead) return;
        cv.className = "block h-auto w-auto max-h-[62vh] max-w-full rounded-xl border border-line";
        cv.setAttribute("role", "img");
        cv.setAttribute("aria-label", "Pocketways share card");
        cvRef.current = cv;
        setState("ready");
        requestAnimationFrame(() => {
          holder.current?.replaceChildren(cv);
        });
      })
      .catch((e) => {
        if (dead) return;
        setErr(e?.message || "Try again");
        setState("error");
      });
    return () => { dead = true; };
  }, [input]);

  const name = input?.kind === "trip" ? (destOf(input.trip.id)?.name.split(" & ")[0] ?? "trip") : "shortlist";
  const fname = `pocketways-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  const blob = () => new Promise<Blob | null>((res) => cvRef.current?.toBlob(res, "image/png"));
  const act = async (a: "download" | "share" | "copy") => {
    const b = await blob();
    if (!b) return;
    if (a === "download") {
      const l = document.createElement("a");
      l.href = URL.createObjectURL(b);
      l.download = fname;
      document.body.appendChild(l);
      l.click();
      l.remove();
      setTimeout(() => URL.revokeObjectURL(l.href), 4000);
      toast("Image saved");
    } else if (a === "share") {
      const file = new File([b], fname, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] }))
        navigator.share({ files: [file], title: "Pocketways", text: input?.kind === "trip" ? `${name} on Pocketways` : "My Pocketways shortlist", url: location.origin }).catch(() => {});
      else toast("Image sharing isn't available in this browser. Use Download.");
    } else if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
      navigator.clipboard.write([new ClipboardItem({ "image/png": b })]).then(() => toast("Image copied")).catch(() => toast("Couldn't copy the image"));
    } else toast("Copying images isn't available here. Use Download.");
  };

  return (
    <Dialog open={!!input} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1040px,96vw)]">
        <DialogHeader className="px-[18px] pt-[18px] pb-3 text-left">
          <DialogTitle className="text-xl font-bold">Share card</DialogTitle>
          <DialogDescription className="text-[13px]">Download it or send it straight to a chat</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto px-[18px] pt-1 pb-4">
        {state === "loading" && <div className="grid place-items-center pt-1.5" aria-busy="true" aria-label="Drawing your card"><Skeleton className="aspect-[9/16] h-[min(58vh,520px)] rounded-xl" /></div>}
        {state === "error" && <div className="py-10 text-center text-sm"><CircleAlert className="mx-auto mb-2 size-6 text-bad" /><b>Couldn&apos;t draw the card</b><p className="text-muted-foreground">{err}</p></div>}
        <div ref={holder} className="grid place-items-center pt-1.5" />
        </div>
        {state === "ready" && (
          <DialogFooter className="flex-row flex-wrap gap-2 border-t border-line px-3.5 pt-3 pb-3.5 sm:justify-start">
            <Button onClick={() => act("download")}><Download /> Download image</Button>
            <Button variant="outline" onClick={() => act("share")}><Share2 /> Share</Button>
            <Button variant="outline" onClick={() => act("copy")}><Copy /> Copy image</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------- compare */
export function CompareTray({ onOpen }: { onOpen: () => void }) {
  const compare = useTrip((s) => s.compare);
  const toggle = useTrip((s) => s.toggleCompare);
  const clear = useTrip((s) => s.clearCompare);
  if (!compare.length) return null;
  return (
    <div className="tw-rise fixed bottom-20 left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-line bg-surface p-2 pl-3 min-[1101px]:bottom-6">
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {compare.map((c) => {
          const d = destOf(c.id)!;
          return (
            <span key={c.id} className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 py-1 pr-1 pl-2.5 text-[13px]">
              <DestIcon d={d} className="size-3.5" />
              {d.name.split(" & ")[0]}
              <button type="button" onClick={() => toggle(c.id)} aria-label={`Remove ${d.name}`} className="grid size-5 place-items-center rounded-full hover:bg-primary/20"><X className="size-3" /></button>
            </span>
          );
        })}
      </div>
      {compare.length < 2 && <span className="hidden text-xs text-muted-foreground sm:inline">Add one more trip</span>}
      <Button size="sm" disabled={compare.length < 2} onClick={onOpen} className="rounded-lg"><ArrowLeftRight /> Compare</Button>
      <Button size="icon-sm" variant="outline" onClick={clear} aria-label="Clear compare list" className="rounded-lg"><X /></Button>
    </div>
  );
}

export function CompareDialog({ items, month, onClose, onOpenTrip }: { items: SavedTrip[] | null; month: number; onClose: () => void; onOpenTrip: (t: SavedTrip) => void }) {
  const saved = useTrip((s) => s.saved);
  const toggleSave = useTrip((s) => s.toggleSave);
  if (!items) return null;
  const rows = items.map((it) => {
    const d = destOf(it.id)!;
    const o = originOf(it.from)!;
    return { it, d, o, r: evaluate(guideState({ from: it.from, days: it.days, travelers: it.travelers || 2, stay: it.stay || "budget", month }), d) };
  });
  const cheapest = Math.min(...rows.map((x) => x.r.cost.total));
  const fastest = Math.min(...rows.map((x) => x.r.mode?.hrs ?? 99));
  const topRated = Math.max(...rows.map((x) => x.d.rating));
  const best = (on: boolean, t: string) => (on ? <span className="ml-1.5 inline-block align-middle"><Tag tone="good">{t}</Tag></span> : null);
  const small = (t: React.ReactNode) => <small className="mt-0.5 block text-xs text-muted-foreground">{t}</small>;
  const cell = "px-3.5 py-3 max-[600px]:p-2.5 text-left align-top text-[13.5px] font-normal border-b border-line group-last/row:border-b-0";
  const Row = ({ label, f }: { label: string; f: (x: (typeof rows)[number]) => React.ReactNode }) => (
    <tr className="group/row">
      <th scope="row" className={cn(cell, "sticky left-0 z-[1] w-[130px] max-[600px]:w-24 bg-surface text-[13px] font-medium text-muted-foreground")}>{label}</th>
      {rows.map((x) => <td key={x.it.id} className={cell}>{f(x)}</td>)}
    </tr>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1040px,96vw)]">
        <DialogHeader className="px-[18px] pt-[18px] pb-3 text-left">
          <DialogTitle className="text-xl font-bold">Compare trips</DialogTitle>
          <DialogDescription className="text-[13px]">{rows.length} trips, side by side</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto px-[18px] pt-1 pb-4 max-[600px]:px-3">
          <table className="w-full min-w-[620px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={cn(cell, "sticky left-0 z-[1] w-[130px] max-[600px]:w-24 bg-surface")} />
                {rows.map((x) => (
                  <th key={x.it.id} scope="col" className={cell}>
                    <div className="grid gap-0.5">
                      <span className="mb-1 grid size-[38px] place-items-center rounded-lg bg-surface-2 text-primary"><DestIcon d={x.d} className="size-5" /></span>
                      <b className="text-[17px]">{x.d.name}</b>
                      <small className="font-normal text-muted-foreground">From {x.o.name} · {x.it.days} days</small>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Total per person" f={(x) => <><b className="text-[22px] text-primary tabular-nums">{fmt(x.r.cost.total)}</b>{best(x.r.cost.total === cheapest, "Cheapest")}{small(`${fmt(x.r.cost.total * (x.it.travelers || 2))} for ${x.it.travelers || 2}`)}</>} />
              <Row label="Getting there" f={(x) => { if (!x.r.mode) return "Nearby"; const I = iconByName(x.r.mode.icon); return <><I className="mr-1 inline size-[15px] -translate-y-px" />{x.r.mode.name}{best(x.r.mode.hrs === fastest, "Fastest")}{small(`${hrsLabel(x.r.mode.hrs)} one way · ${fmt(x.r.cost.travel)} return`)}</>; }} />
              <Row label="Stay" f={(x) => <>{fmt(x.r.cost.stay)}{small(`${x.r.cost.nights} night${x.r.cost.nights > 1 ? "s" : ""}`)}</>} />
              <Row label="Food" f={(x) => fmt(x.r.cost.food)} />
              <Row label="Local transport" f={(x) => fmt(x.r.cost.local)} />
              <Row label="Activities" f={(x) => fmt(x.r.cost.act)} />
              <Row label="Weather" f={(x) => { const I = iconByName(x.r.wx.icon); return <><I className="mr-1 inline size-[15px] -translate-y-px" />{x.r.wx.label}{small(`in ${MONTHS[month - 1]}`)}</>; }} />
              <Row label="Season" f={(x) => <>{x.r.season === "peak" ? "Best season" : x.r.season === "off" ? "Off-season" : "Regular"}{best(x.r.season === "peak", "Good time")}</>} />
              <Row label="Rating" f={(x) => <><Star className="mr-1 inline size-[15px] -translate-y-px fill-current text-warn" />{x.d.rating}{best(x.d.rating === topRated, "Top rated")}</>} />
              <Row label="Best months" f={(x) => (
                <div className="grid min-w-[150px] grid-cols-12 gap-0.5">
                  {MONTHS.map((m, i) => (
                    <i key={m} title={m} className={cn("grid h-5 place-items-center rounded-sm text-[10px] font-semibold not-italic", x.d.best.includes(i + 1) ? "bg-good text-[#111]" : x.d.avoid.includes(i + 1) ? "bg-bad text-[#111]" : "bg-surface-2 text-muted-foreground", i + 1 === month && "outline-2 outline-offset-1 outline-foreground")}>{m[0]}</i>
                  ))}
                </div>
              )} />
              <Row label="Visa" f={(x) => x.d.visa ?? "Not needed"} />
              <tr className="group/row">
                <th className={cn(cell, "sticky left-0 z-[1] w-[130px] max-[600px]:w-24 bg-surface")} />
                {rows.map((x) => {
                  const on = saved.some((s) => s.id === x.it.id);
                  return (
                    <td key={x.it.id} className={cell}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button size="sm" className="rounded-lg" onClick={() => onOpenTrip(x.it)}>Open trip</Button>
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toggleSave(x.it.id)}><Heart className={cn(on && "fill-current")} />{on ? "Saved" : "Save"}</Button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <DialogFooter className="flex-row flex-wrap gap-2 border-t border-line px-3.5 pt-3 pb-3.5 sm:justify-start">
          <Button onClick={() => { onClose(); useTrip.getState().openPollDraft(items); }}><Users /> Let friends vote</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
