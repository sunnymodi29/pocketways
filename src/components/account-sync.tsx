"use client";

import { useAccount } from "@/lib/use-account";
import { useEffect, useRef } from "react";
import { useEdits } from "@/lib/edits";
import type { DayPlan } from "@/lib/engine";
import { useTrip, type SavedTrip } from "@/lib/store";

/**
 * Signed-in users get their saved trips and itinerary edits synced to the database.
 * On sign-in the server copy and this device's copy are merged (nothing is lost), then changes are pushed.
 */
export function AccountSync() {
  const { isLoaded, isSignedIn, user } = useAccount();
  const ready = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || ready.current === user.id) return;
    let cancelled = false;
    (async () => {
      useTrip.getState().loadSaved();
      useEdits.getState().hydrate();
      const r = await fetch("/api/me/data").catch(() => null);
      if (!r?.ok || cancelled) return; // not configured or offline: stay local-only
      const server = (await r.json()) as { saved: SavedTrip[]; edits: Record<string, DayPlan[]> };

      const local = useTrip.getState().saved;
      const byId = new Map<string, SavedTrip>();
      for (const s of [...server.saved, ...local]) {
        const k = s.id + "|" + s.from + "|" + s.days;
        const prev = byId.get(k);
        if (!prev || (s.savedAt ?? 0) > (prev.savedAt ?? 0)) byId.set(k, s);
      }
      const merged = [...byId.values()].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
      useTrip.getState().replaceSaved(merged);
      // this device's edits win when both sides edited the same itinerary
      useEdits.getState().replaceAll({ ...server.edits, ...useEdits.getState().plans });
      if (cancelled) return;
      ready.current = user.id;
      // store the merged copy so other devices pick it up
      fetch("/api/me/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: useTrip.getState().saved, edits: useEdits.getState().plans }),
      }).catch(() => {});
    })();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, user]);

  // push changes (debounced) once the first merge has happened
  useEffect(() => {
    if (!isSignedIn) { ready.current = null; return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const push = () => {
      if (!ready.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetch("/api/me/data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saved: useTrip.getState().saved, edits: useEdits.getState().plans }),
        }).catch(() => {});
      }, 1500);
    };
    const a = useTrip.subscribe((s, p) => { if (s.saved !== p.saved) push(); });
    const b = useEdits.subscribe((s, p) => { if (s.plans !== p.plans) push(); });
    return () => { a(); b(); clearTimeout(timer); };
  }, [isSignedIn]);

  return null;
}