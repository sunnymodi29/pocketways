"use client";

import { ExternalLink, Utensils } from "lucide-react";
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

/** Dish cards with veg / non-veg badge and a Maps search link. */
export function DishCards({ d }: { d: Destination }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {d.eat.map((e) => {
        const meta = {
          veg: { dot: "bg-good", label: "Veg" },
          nonveg: { dot: "bg-bad", label: "Non-veg" },
          both: { dot: "bg-warn", label: "Veg & non-veg" },
          snack: { dot: "bg-primary", label: "Snack / sweet / drink" },
        }[dishType(e)];
        return (
          <a key={e} href={`https://www.google.com/maps/search/${encodeURIComponent(`${e} in ${d.name}`)}`} target="_blank" rel="noopener"
            className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-primary/60">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary"><Utensils className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{e}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><i className={cn("size-2 rounded-full", meta.dot)} />{meta.label}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary">Find where to eat <ExternalLink className="size-3" /></span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
