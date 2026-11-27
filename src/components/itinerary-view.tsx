"use client";

import { ArrowUpRight, Cookie, Drumstick, Leaf, MapPin, Utensils } from "lucide-react";
import { useState } from "react";
import { dishType, fmt, type DayPlan } from "@/lib/engine";
import { cn } from "@/lib/utils";
import type { Destination } from "@/lib/types";

type Diet = "all" | "veg" | "nonveg";

/** Day-by-day timeline with a veg / non-veg filter. Shared by the planner and the guides. */
export function ItineraryView({ days }: { days: DayPlan[] }) {
  const [diet, setDiet] = useState<Diet>("all");
  return (
    <>
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
        {days.map((x) => (
          <div key={x.day} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold"><span className="text-primary">Day {x.day}</span> · {x.title}</h4>
              <span className="text-[11px] text-muted-foreground">~{fmt(x.spend)}/person food + activities</span>
            </div>
            <ol className="mt-3 space-y-2.5 border-l-2 border-line pl-4 text-[13px]">
              {x.slots.map((s, n) => (
                <li key={n} className="relative">
                  <i className={cn("absolute -left-[22px] top-1.5 size-2.5 rounded-full border-2 border-surface", s.kind === "meal" ? "bg-warn" : s.kind === "travel" ? "bg-blue" : s.kind === "stay" ? "bg-good" : "bg-primary")} />
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.time}{s.kind === "meal" ? " 🍽" : ""}</div>
                  {s.meal ? (
                    <div className="mt-0.5 space-y-0.5">
                      {diet !== "nonveg" && <div>🟢 {s.meal.veg}</div>}
                      {diet !== "veg" && <div>🔴 {s.meal.nonveg}</div>}
                    </div>
                  ) : (
                    <div className="mt-0.5">{s.text}</div>
                  )}
                </li>
              ))}
            </ol>
            {x.tip && <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted-foreground">💡 {x.tip}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

/** How each kind of dish looks: its own icon, colour and short label. */
const DISH = {
  veg: { Icon: Leaf, label: "Veg", tile: "bg-good/15 text-good", pill: "border-good/30 bg-good/10 text-good" },
  nonveg: { Icon: Drumstick, label: "Non-veg", tile: "bg-bad/15 text-bad", pill: "border-bad/30 bg-bad/10 text-bad" },
  both: { Icon: Utensils, label: "Veg & non-veg", tile: "bg-warn/15 text-warn", pill: "border-warn/30 bg-warn/10 text-warn" },
  snack: { Icon: Cookie, label: "Snack or sweet", tile: "bg-primary/15 text-primary", pill: "border-primary/30 bg-primary/10 text-primary" },
} as const;

/** Dish cards: what to eat, whether it is veg, and a Maps search for where to find it.
 *  One column until the space around them is wide enough for two (container query, so the narrow trip panel stays tidy). */
export function DishCards({ d }: { d: Destination }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-2 @xl:grid-cols-2">
        {d.eat.map((e, i) => {
          const m = DISH[dishType(e)];
          return (
            <a
              key={e}
              href={`https://www.google.com/maps/search/${encodeURIComponent(`${e} in ${d.name}`)}`}
              target="_blank"
              rel="noopener"
              style={{ animationDelay: `${i * 0.05}s` }}
              className="tw-rise group/dish relative flex items-center gap-3 rounded-xl border border-line bg-surface p-3 pr-10 transition-colors duration-200 hover:border-primary/60 hover:bg-surface-2/40"
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", m.tile)}><m.Icon className="size-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-snug font-semibold">{e}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-px text-[11px] font-medium whitespace-nowrap", m.pill)}>{m.label}</span>
                  <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground transition-colors duration-200 group-hover/dish:text-primary">
                    <MapPin className="size-3.5 shrink-0 text-primary" /> Find where to eat
                  </span>
                </span>
              </span>
              <ArrowUpRight className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-hover/dish:text-primary" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
