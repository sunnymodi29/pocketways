"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Thin progress bar along the top edge during page-to-page navigation.
 * Starts on a click on an internal link and finishes when the new page is in.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const first = useRef(true);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return; // external, or same page (hash/search only)
      setState("loading");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // a new pathname means the navigation finished
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState("done");
    const t = setTimeout(() => setState("idle"), 400);
    return () => clearTimeout(t);
  }, [pathname]);

  if (state === "idle") return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5">
      <div className={state === "loading" ? "tw-progress-load h-full bg-primary" : "tw-progress-done h-full w-full bg-primary"} />
    </div>
  );
}