"use client";

import { create } from "zustand";
import type { DayPlan } from "./engine";

const KEY = "tw-itin-edits";

interface EditsState {
  /** user-edited itineraries, keyed by destination|origin|days */
  plans: Record<string, DayPlan[]>;
  hydrated: boolean;
  hydrate: () => void;
  save: (key: string, plan: DayPlan[]) => void;
  reset: (key: string) => void;
  replaceAll: (plans: Record<string, DayPlan[]>) => void;
}

const persist = (plans: Record<string, DayPlan[]>) => {
  try { localStorage.setItem(KEY, JSON.stringify(plans)); } catch { /* storage full or blocked */ }
};

export const useEdits = create<EditsState>((set, get) => ({
  plans: {},
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    let plans: Record<string, DayPlan[]> = {};
    try { plans = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { /* corrupt: start fresh */ }
    set({ plans, hydrated: true });
  },
  save: (key, plan) => set((s) => { const plans = { ...s.plans, [key]: plan }; persist(plans); return { plans }; }),
  replaceAll: (plans) => { persist(plans); set({ plans, hydrated: true }); },
  reset: (key) => set((s) => { const plans = { ...s.plans }; delete plans[key]; persist(plans); return { plans }; }),
}));

export const editKey = (destId: string, from: string, days: number) => `${destId}|${from}|${days}`;