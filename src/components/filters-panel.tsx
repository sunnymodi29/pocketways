"use client";

import { Bus, Car, Flag, Globe, Heart, Plane, TrainFront, User, Users, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { VIBES, ORIGINS } from "@/lib/data";
import { MONTHS, defaultState, fmt, fmtK, type TripState } from "@/lib/engine";
import { useTrip } from "@/lib/store";
import { Chip, Dropdown, Field, Num, Seg, Stepper, Toggle, VibeIcon } from "./kit";

export const BUDGET_MIN = 2000;
export const BUDGET_MAX = 1000000;
export const toSlider = (v: number) =>
  Math.round((Math.log(Math.max(v, BUDGET_MIN) / BUDGET_MIN) / Math.log(BUDGET_MAX / BUDGET_MIN)) * 100);
export const fromSlider = (t: number) => {
  const v = BUDGET_MIN * Math.pow(BUDGET_MAX / BUDGET_MIN, t / 100);
  const step = v < 20000 ? 500 : v < 100000 ? 1000 : v < 300000 ? 5000 : 10000;
  return Math.round(v / step) * step;
};
const PRESETS = [5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];

export function monthOptions(now = new Date()) {
  return Array.from({ length: 12 }, (_, i) => {
    const m = ((now.getMonth() + i) % 12) + 1;
    const y = now.getFullYear() + (now.getMonth() + i >= 12 ? 1 : 0);
    return { v: String(m), label: `${MONTHS[m - 1]} ${y}${i === 0 ? " (this month)" : i === 1 ? " (next month)" : ""}` };
  });
}
export const originOptions = ORIGINS.map((o) => ({ v: o.id, label: o.name }));

/** Slider position glides to the target (same easing as the counting number). */
function useGlide(target: number, ms = 650) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    const from = cur.current;
    if (from === target) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      cur.current = from + (target - from) * e;
      setV(cur.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function BudgetControl() {
  const S = useTrip((s) => s.S);
  const set = useTrip((s) => s.set);
  const glide = useGlide(toSlider(S.budget));
  const dragging = useRef(false);
  return (
    <Field
      label="Budget"
      aside={
        <Seg
          size="sm"
          className="w-auto"
          value={S.budgetMode}
          onChange={(v) => set({ budgetMode: v })}
          options={[{ v: "pp", label: "Per person" }, { v: "total", label: "Total group" }]}
        />
      }
    >
      <div className="mb-2 text-2xl font-semibold tracking-tight text-primary">
        <Num value={S.budget} format={(n) => fmt(Math.round(n / 500) * 500)} /> <small className="text-xs font-normal text-muted-foreground">{S.budgetMode === "pp" ? "per person" : "total"}</small>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[dragging.current ? toSlider(S.budget) : glide]}
        aria-label="Budget"
        onPointerDown={() => (dragging.current = true)}
        onValueChange={([t]) => set({ budget: fromSlider(t) })}
        onValueCommit={() => (dragging.current = false)}
        className="py-2"
      />
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {PRESETS.map((v) => (
          <Chip box key={v} on={S.budget === v} onClick={() => { dragging.current = false; set({ budget: v }); }}>
            {fmtK(v)}
          </Chip>
        ))}
      </div>
    </Field>
  );
}

const Group = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-6 mb-3 border-t border-line pt-4 text-[13px] font-semibold">{children}</h3>
);

export function FiltersBody() {
  const S = useTrip((s) => s.S);
  const set = useTrip((s) => s.set);
  const flag = (k: keyof TripState, label: string) => (
    <Toggle checked={S[k] as boolean} onChange={(v) => set({ [k]: v } as Partial<TripState>)}>{label}</Toggle>
  );
  return (
    <div>
      <Field label="Starting from">
        <Dropdown label="Starting from" value={S.from} onChange={(v) => set({ from: v })} options={originOptions} />
      </Field>
      <BudgetControl />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Days"><Stepper label="days" value={S.days} min={1} max={15} onChange={(v) => set({ days: v })} /></Field>
        <Field label="Travellers"><Stepper label="travellers" value={S.travelers} min={1} max={20} onChange={(v) => set({ travelers: v })} /></Field>
      </div>
      <Field label="When are you going?">
        <Dropdown label="Month" value={String(S.month)} onChange={(v) => set({ month: Number(v) })} options={monthOptions()} />
      </Field>

      <Group>Travel party &amp; style</Group>
      <Field label="Who's going?">
        <Seg
          stack
          value={S.group}
          onChange={(v) => set({ group: v })}
          options={[
            { v: "solo", label: <><User /> Solo</> },
            { v: "couple", label: <><Heart /> Couple</> },
            { v: "friends", label: <><Users /> Friends</> },
            { v: "family", label: <><UsersRound /> Family</> },
          ]}
        />
      </Field>
      <Field label={<>Vibe <span className="font-normal normal-case">(pick any)</span></>}>
        <div className="grid grid-cols-3 gap-1.5">
          {VIBES.map((v) => (
            <Chip box key={v.id} on={S.vibes.includes(v.id)} onClick={() => set({ vibes: S.vibes.includes(v.id) ? S.vibes.filter((x) => x !== v.id) : [...S.vibes, v.id] })}>
              <VibeIcon id={v.id} /> {v.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Where">
        <Seg
          value={S.scope}
          onChange={(v) => set({ scope: v })}
          options={[
            { v: "india", label: <><Flag /> India</> },
            { v: "intl", label: <><Globe /> Abroad</> },
            { v: "all", label: "Both" },
          ]}
        />
      </Field>
      <Field label="Stay style">
        <Seg
          value={S.stay}
          onChange={(v) => set({ stay: v })}
          options={[{ v: "hostel", label: "Hostel" }, { v: "budget", label: "Budget" }, { v: "mid", label: "3★–4★" }, { v: "luxury", label: "Luxury" }]}
        />
      </Field>

      <Group>Getting there</Group>
      <Field label="Travel by">
        <Seg
          value={S.transport}
          onChange={(v) => set({ transport: v })}
          options={[
            { v: "any", label: "Best" },
            { v: "train", label: <><TrainFront /> Train</> },
            { v: "flight", label: <><Plane /> Flight</> },
            { v: "bus", label: <><Bus /> Bus</> },
            { v: "car", label: <><Car /> Car</> },
          ]}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Journey time">
          <Dropdown
            label="Journey time"
            value={String(S.maxTravel)}
            onChange={(v) => set({ maxTravel: Number(v) })}
            options={[{ v: "4", label: "Up to 4 hrs" }, { v: "8", label: "Up to 8 hrs" }, { v: "12", label: "Up to 12 hrs" }, { v: "24", label: "Up to 24 hrs" }, { v: "99", label: "Any" }]}
          />
        </Field>
        <Field label="Weather">
          <Dropdown
            label="Weather"
            value={S.weather}
            onChange={(v) => set({ weather: v as TripState["weather"] })}
            options={[{ v: "any", label: "Any" }, { v: "cold", label: "Cold / snow" }, { v: "pleasant", label: "Pleasant" }, { v: "warm", label: "Warm / sunny" }]}
          />
        </Field>
      </div>

      <Group>More filters</Group>
      <div>
        {flag("hideOff", "Hide off-season places")}
        {flag("stretch", "Show slightly over budget (+20%)")}
        {flag("offbeat", "Offbeat / less crowded")}
        {flag("kids", "Good with kids")}
        {flag("seniors", "Easy for elders (less walking)")}
        {flag("nopass", "Easy visa / no passport needed")}
      </div>
    </div>
  );
}

export { defaultState };
