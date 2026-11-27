"use client";

import { ArrowDown, ArrowUp, Check, Lock, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fmt, type DayPlan, type Slot } from "@/lib/engine";
import { useEdits } from "@/lib/edits";
import { useGate } from "@/lib/use-gate";
import { cn } from "@/lib/utils";

type Diet = "all" | "veg" | "nonveg";
const TIMES = ["Morning", "Afternoon", "Evening", "Night"];
const dot = (k: Slot["kind"]) => (k === "meal" ? "bg-warn" : k === "travel" ? "bg-blue" : k === "stay" ? "bg-good" : "bg-primary");

const itemsOf = (slots: Slot[], icon?: string) => slots.filter((s) => s.kind !== "meal").map((s) => (s.kind === "travel" ? `@${icon ?? "car-front"} ${s.text}` : s.text));
const clone = (p: DayPlan[]): DayPlan[] => JSON.parse(JSON.stringify(p));

/** Itinerary the traveller can reshape: edit, delete, reorder (also across days) and add stops. Saved on this device. */
export function EditableItinerary({ base, storeKey, onChange }: { base: DayPlan[]; storeKey: string; onChange?: (plan: DayPlan[]) => void }) {
  const { plans, hydrate, save, reset } = useEdits();
  const { locked, gate } = useGate();
  const WHY = { title: "Sign in to edit your plan", description: "Reorder stops, change them or add your own, and they stay with the trip on every device." };
  /** Wraps an edit action: signed-in people run it, everyone else gets the sign-in popup. */
  const g = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => gate(WHY, () => fn(...a));
  useEffect(hydrate, [hydrate]);
  const saved = plans[storeKey];
  // a saved plan only applies while its length still matches the trip
  const edited = !!saved && saved.length === base.length;
  const plan = useMemo(() => (edited ? saved : base), [edited, saved, base]);
  useEffect(() => { onChange?.(plan); }, [plan, onChange]);

  const [diet, setDiet] = useState<Diet>("all");
  const [editing, setEditing] = useState<{ d: number; i: number } | null>(null);
  const [draft, setDraft] = useState({ a: "", b: "" });
  const [adding, setAdding] = useState<number | null>(null);
  const [add, setAdd] = useState({ time: "Afternoon", text: "" });

  const commit = (fn: (p: DayPlan[]) => void) => {
    const next = clone(plan);
    fn(next);
    next.forEach((d) => { d.items = itemsOf(d.slots); });
    save(storeKey, next);
  };
  const move = (d: number, i: number, dir: -1 | 1) =>
    commit((p) => {
      const [s] = p[d].slots.splice(i, 1);
      const to = i + dir;
      if (to >= 0 && to <= p[d].slots.length) p[d].slots.splice(to, 0, s);
      else if (dir < 0 && d > 0) p[d - 1].slots.push(s);
      else if (dir > 0 && d < p.length - 1) p[d + 1].slots.unshift(s);
      else p[d].slots.splice(i, 0, s);
    });
  const startEdit = (d: number, i: number) => {
    const s = plan[d].slots[i];
    setEditing({ d, i });
    setDraft(s.meal ? { a: s.meal.veg, b: s.meal.nonveg } : { a: s.text, b: "" });
  };
  const applyEdit = () => {
    if (!editing) return;
    const { d, i } = editing;
    commit((p) => {
      const s = p[d].slots[i];
      if (s.meal) s.meal = { veg: draft.a.trim() || s.meal.veg, nonveg: draft.b.trim() || s.meal.nonveg };
      else s.text = draft.a.trim() || s.text;
    });
    setEditing(null);
  };
  const applyAdd = (d: number) => {
    if (!add.text.trim()) return;
    commit((p) => p[d].slots.push({ time: add.time, kind: "sight", text: add.text.trim() }));
    setAdd({ time: "Afternoon", text: "" });
    setAdding(null);
  };

  const icon = "h-7 w-7 grid place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-primary focus-visible:text-primary";
  const input = "w-full rounded-lg border border-line bg-background px-2.5 py-1.5 text-[13px] outline-none focus:border-primary";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-muted-foreground">Food:</span>
        {(["all", "veg", "nonveg"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={diet === k} onClick={() => setDiet(k)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", diet === k ? "border-primary bg-primary text-primary-foreground" : "border-line hover:border-primary/60")}>
            {k === "all" ? "Show both" : k === "veg" ? "🟢 Veg" : "🔴 Non-veg"}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-2">
          {edited && <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">Edited by you</span>}
          {edited && (
            <button type="button" onClick={() => reset(storeKey)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
              <RotateCcw className="size-3.5" /> Reset
            </button>
          )}
        </span>
      </div>
      {locked ? (
        <button type="button" onClick={() => gate(WHY, () => {})} className="group/lk mb-3 flex w-full items-center gap-2.5 rounded-xl border border-dashed border-primary/50 bg-primary/5 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-primary/10">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><Lock className="size-4" /></span>
          <span className="min-w-0 flex-1 text-xs text-muted-foreground"><b className="block text-[13px] text-foreground">Sign in to make it yours</b>Edit, reorder or delete any stop and add your own. Free, takes five seconds.</span>
        </button>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">Make it yours: edit, reorder or delete any stop and add your own. Changes are saved on this device and used when you share or export.</p>
      )}

      <div className="space-y-4">
        {plan.map((x, d) => (
          <div key={x.day} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold"><span className="text-primary">Day {x.day}</span> · {x.title}</h4>
              <span className="text-[11px] text-muted-foreground">~{fmt(x.spend)}/person food + activities</span>
            </div>
            <ol className="mt-3 space-y-1 border-l-2 border-line pl-4 text-[13px]">
              {x.slots.map((s, i) => {
                const isEditing = editing?.d === d && editing.i === i;
                return (
                  <li key={`${s.time}-${i}`} className="group relative rounded-lg py-1.5 pr-1 hover:bg-surface-2/50">
                    <i className={cn("absolute -left-[22px] top-3 size-2.5 rounded-full border-2 border-surface", dot(s.kind))} />
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.time}{s.kind === "meal" ? " 🍽" : ""}</div>
                        {isEditing ? (
                          <div className="mt-1 space-y-1.5">
                            <input autoFocus aria-label={s.meal ? "Veg option" : "Stop"} className={input} value={draft.a} onChange={(e) => setDraft({ ...draft, a: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") applyEdit(); if (e.key === "Escape") setEditing(null); }} />
                            {s.meal && <input aria-label="Non-veg option" className={input} value={draft.b} onChange={(e) => setDraft({ ...draft, b: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") applyEdit(); if (e.key === "Escape") setEditing(null); }} />}
                            <div className="flex gap-1.5">
                              <button type="button" onClick={applyEdit} className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"><Check className="size-3.5" /> Save</button>
                              <button type="button" onClick={() => setEditing(null)} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium"><X className="size-3.5" /> Cancel</button>
                            </div>
                          </div>
                        ) : s.meal ? (
                          <div className="mt-0.5 space-y-0.5">
                            {diet !== "nonveg" && <div>🟢 {s.meal.veg}</div>}
                            {diet !== "veg" && <div>🔴 {s.meal.nonveg}</div>}
                          </div>
                        ) : (
                          <div className="mt-0.5">{s.text}</div>
                        )}
                      </div>
                      {!isEditing && !locked && (
                        <div className="flex shrink-0 items-center opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                          <button type="button" className={icon} aria-label="Move up" onClick={g(() => move(d, i, -1))} disabled={d === 0 && i === 0}><ArrowUp className="size-3.5" /></button>
                          <button type="button" className={icon} aria-label="Move down" onClick={g(() => move(d, i, 1))} disabled={d === plan.length - 1 && i === x.slots.length - 1}><ArrowDown className="size-3.5" /></button>
                          <button type="button" className={icon} aria-label="Edit" onClick={g(() => startEdit(d, i))}><Pencil className="size-3.5" /></button>
                          <button type="button" className={cn(icon, "hover:text-bad")} aria-label="Delete" onClick={g(() => commit((p) => p[d].slots.splice(i, 1)))}><Trash2 className="size-3.5" /></button>
                        </div>
                      )}
                      {!isEditing && locked && (
                        <button type="button" className={cn(icon, "opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100")} aria-label="Sign in to edit this stop" title="Sign in to edit" onClick={() => gate(WHY, () => {})}><Lock className="size-3.5" /></button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {adding === d ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select aria-label="Time of day" value={add.time} onChange={(e) => setAdd({ ...add, time: e.target.value })} className={cn(input, "w-auto")}>
                  {TIMES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <input autoFocus aria-label="New stop" placeholder="Where to, or what to do?" className={cn(input, "min-w-[160px] flex-1")} value={add.text}
                  onChange={(e) => setAdd({ ...add, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") applyAdd(d); if (e.key === "Escape") setAdding(null); }} />
                <button type="button" onClick={() => applyAdd(d)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Add</button>
                <button type="button" onClick={() => setAdding(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={g(() => { setAdding(d); setEditing(null); })} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                {locked ? <Lock className="size-3.5" /> : <Plus className="size-3.5" />} Add a stop to Day {x.day}
              </button>
            )}
            {x.tip && <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted-foreground">💡 {x.tip}</p>}
          </div>
        ))}
      </div>
    </>
  );
}