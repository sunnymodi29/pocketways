"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Anchor navigation for long pages: highlights the section in view and scrolls smoothly on click.
 * `orientation="vertical"` renders a sticky side list (desktop); horizontal is a scrolling pill bar (mobile).
 */
export function SectionNav({ items, orientation = "horizontal", className }: { items: readonly (readonly [string, string])[]; orientation?: "horizontal" | "vertical"; className?: string }) {
  const [active, setActive] = useState(items[0]?.[0] ?? "");
  const lock = useRef(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      if (Date.now() < lock.current) return; // a click-scroll is in flight
      const doc = document.documentElement;
      // short last sections can never reach the top of the screen, so the page bottom selects the last item
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) return setActive(items[items.length - 1][0]);
      let cur = items[0][0];
      for (const [id] of items) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) cur = id;
      }
      setActive(cur);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);
  const vertical = orientation === "vertical";
  return (
    <nav aria-label="Sections" className={cn(vertical ? "flex flex-col gap-0.5" : "flex gap-1.5 overflow-x-auto", className)}>
      {items.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={active === id ? "true" : undefined}
          onClick={(e) => {
            e.preventDefault();
            setActive(id);
            lock.current = Date.now() + 900;
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            history.replaceState(null, "", `#${id}`);
          }}
          className={cn(
            "shrink-0 text-[13px] font-medium transition-colors",
            vertical
              ? cn("rounded-lg px-3 py-2", active === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")
              : cn("rounded-full border px-3 py-1.5", active === id ? "border-primary bg-primary text-primary-foreground" : "border-line bg-surface hover:border-primary hover:text-primary"),
          )}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
