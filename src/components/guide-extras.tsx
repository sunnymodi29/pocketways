"use client";

import { ChevronDown, ExternalLink, MapPin, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { fmt } from "@/lib/engine";
import type { GuideContent, GuideDayPlan } from "@/lib/guide-content";
import { cn } from "@/lib/utils";

const Box = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-xl border border-line bg-surface p-4", className)}>{children}</div>
);
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="mt-6 mb-2 text-sm font-semibold">{children}</h3>;

export function GuideStory({ c }: { c: GuideContent }) {
  return (
    <div>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
        {c.overview.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <H3>Know before you go</H3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {c.knowFirst.map((x) => <li key={x} className="rounded-xl border border-line bg-surface p-3 text-[13px] text-muted-foreground">{x}</li>)}
      </ul>
    </div>
  );
}

export function GuideAreas({ c, name }: { c: GuideContent; name: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {c.areas.map((a) => (
        <Box key={a.name}>
          <div className="flex items-start justify-between gap-2">
            <b className="text-sm">{a.name}</b>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">from {fmt(a.approxRoomINR)}/night</span>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">{a.vibe}</p>
          <p className="mt-2 text-[11px] font-medium text-muted-foreground">Best for: <span className="text-foreground">{a.bestFor}</span></p>
          <a className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary" target="_blank" rel="noopener"
            href={`https://www.google.com/maps/search/${encodeURIComponent(`hotels in ${a.name} ${name}`)}`}>
            See stays <ExternalLink className="size-3" />
          </a>
        </Box>
      ))}
    </div>
  );
}

export function GuideSights({ c, name }: { c: GuideContent; name: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {c.sights.map((s) => (
        <Box key={s.name}>
          <a className="flex items-start gap-2 text-sm font-semibold hover:text-primary" target="_blank" rel="noopener"
            href={`https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${name}`)}`}>
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />{s.name}
          </a>
          <p className="mt-1 text-[13px] text-muted-foreground">{s.why}</p>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div><dt className="text-muted-foreground">Time</dt><dd className="font-medium">{s.timeNeeded}</dd></div>
            <div><dt className="text-muted-foreground">Best time</dt><dd className="font-medium">{s.bestTime}</dd></div>
            <div><dt className="text-muted-foreground">Entry</dt><dd className="font-medium">{s.entry}</dd></div>
          </dl>
        </Box>
      ))}
    </div>
  );
}

type Diet = "all" | "veg" | "nonveg";

function Meal({ label, m, diet }: { label: string; m: { veg: string; nonveg: string }; diet: Diet }) {
  return (
    <li className="relative">
      <i className="absolute -left-[22px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-warn" />
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label} 🍽</div>
      <div className="mt-0.5 space-y-0.5">
        {diet !== "nonveg" && <div>🟢 {m.veg}</div>}
        {diet !== "veg" && <div>🔴 {m.nonveg}</div>}
      </div>
    </li>
  );
}
const Step = ({ label, text, dot }: { label: string; text: string; dot: string }) => (
  <li className="relative">
    <i className={cn("absolute -left-[22px] top-1.5 size-2.5 rounded-full border-2 border-surface", dot)} />
    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-0.5">{text}</div>
  </li>
);

export function CuratedPlan({ c, days }: { c: GuideContent; days: number }) {
  const key = days <= 2 ? "2" : days <= 4 ? "3" : "5";
  const plan: GuideDayPlan[] = c.plans[key];
  const [diet, setDiet] = useState<Diet>("all");
  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">Showing the {key}-day plan{Number(key) !== days ? ` (closest to your ${days} days)` : ""}.</p>
      <div className="mb-3 flex items-center gap-2 text-[13px]">
        <span className="text-muted-foreground">Food:</span>
        {(["all", "veg", "nonveg"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={diet === k} onClick={() => setDiet(k)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", diet === k ? "border-primary bg-primary text-primary-foreground" : "border-line hover:border-primary/60")}>
            {k === "all" ? "Show both" : k === "veg" ? "🟢 Veg" : "🔴 Non-veg"}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {plan.map((p, i) => (
          <Box key={i}>
            <h4 className="text-sm font-semibold"><span className="text-primary">Day {i + 1}</span> · {p.title}</h4>
            <ol className="mt-3 space-y-2.5 border-l-2 border-line pl-4 text-[13px]">
              <Meal label="Breakfast" m={p.breakfast} diet={diet} />
              <Step label="Morning" text={p.morning} dot="bg-primary" />
              <Meal label="Lunch" m={p.lunch} diet={diet} />
              <Step label="Afternoon" text={p.afternoon} dot="bg-primary" />
              <Step label="Evening" text={p.evening} dot="bg-primary" />
              <Meal label="Dinner" m={p.dinner} diet={diet} />
              {p.stayArea && <Step label="Stay" text={p.stayArea} dot="bg-good" />}
            </ol>
            <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted-foreground">🚗 {p.getAround}</p>
          </Box>
        ))}
      </div>
    </>
  );
}

export function GuideFood({ c, name }: { c: GuideContent; name: string }) {
  const dot = { veg: "bg-good", nonveg: "bg-bad", both: "bg-warn", snack: "bg-primary" } as const;
  const label = { veg: "Veg", nonveg: "Non-veg", both: "Veg & non-veg", snack: "Snack / sweet / drink" } as const;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {c.food.map((f) => (
        <Box key={f.name}>
          <div className="flex items-start justify-between gap-2">
            <b className="text-sm">{f.name}</b>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">~{fmt(f.approxINR)}</span>
          </div>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><i className={cn("size-2 rounded-full", dot[f.type])} />{label[f.type]}</span>
          <p className="mt-1.5 text-[13px] text-muted-foreground">{f.about}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Where: <span className="text-foreground">{f.where}</span></p>
          <a className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary" target="_blank" rel="noopener"
            href={`https://www.google.com/maps/search/${encodeURIComponent(`${f.name} in ${name}`)}`}>
            Find on Maps <ExternalLink className="size-3" />
          </a>
        </Box>
      ))}
    </div>
  );
}

export function GuideMore({ c }: { c: GuideContent }) {
  const List = ({ items }: { items: string[] }) => (
    <ul className="space-y-2 text-[13px] text-muted-foreground">{items.map((x) => <li key={x} className="flex gap-2"><span className="text-primary">•</span>{x}</li>)}</ul>
  );
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Box><h3 className="mb-2 text-sm font-semibold">Getting around</h3><List items={c.gettingAround} /></Box>
        <Box><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="size-4 text-warn" /> Safety &amp; permits</h3><List items={c.safetyAndPermits} /></Box>
        <Box className="md:col-span-2"><h3 className="mb-2 text-sm font-semibold">Local tips</h3><List items={c.localTips} /></Box>
      </div>
      <H3>Frequently asked questions</H3>
      <div className="space-y-2">
        {c.faqs.map((f) => <Faq key={f.q} q={f.q} a={f.a} />)}
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium">
        {q}<ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="px-4 pb-3 text-[13px] text-muted-foreground">{a}</p>}
    </div>
  );
}
