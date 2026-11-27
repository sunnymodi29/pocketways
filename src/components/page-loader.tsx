"use client";

import { MapPin, PlaneTakeoff } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = ["Finding trips in your budget…", "Checking costs and travel times…", "Looking up the weather…", "Packing your itinerary…"];

/**
 * Full-page loader for screens that take a moment: a plane flies the route while the message changes,
 * so people can see something is happening. It fades in after a short delay, so quick loads never flash it.
 */
export function PageLoader({ label, hint = "This can take a few seconds the first time." }: { label?: string; hint?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (label) return;
    const t = setInterval(() => setI((x) => (x + 1) % STEPS.length), 2200);
    return () => clearInterval(t);
  }, [label]);

  return (
    <div role="status" aria-live="polite" className="tw-loader fixed inset-0 z-[35] grid place-items-center bg-background/85 backdrop-blur-sm">
      <div className="w-[min(320px,86vw)] text-center">
        <div className="relative mx-auto h-11 w-full" aria-hidden="true">
          <span className="absolute inset-x-3 top-1/2 border-t-2 border-dashed border-line" />
          <span className="absolute top-1/2 left-0 size-2.5 -translate-y-1/2 rounded-full bg-foreground" />
          <MapPin className="absolute top-1/2 right-0 size-5 -translate-y-1/2 text-primary" />
          <span className="tw-plane absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg bg-primary text-primary-foreground">
            <PlaneTakeoff className="size-[18px]" />
          </span>
        </div>
        <p key={label ?? i} className="tw-fade mt-5 text-sm font-medium">{label ?? STEPS[i]}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}