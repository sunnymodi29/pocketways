"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { toast } from "sonner";
import {
  computeResults,
  defaultState,
  destOf,
  evaluate,
  fareKey,
  originOf,
  type FareEntry,
  type Mode,
  type TripState,
} from "./engine";

export interface SavedTrip {
  id: string;
  from: string;
  days: number;
  travelers?: number;
  stay?: TripState["stay"];
  savedAt?: number;
}

const SAVED_KEY = "tw-saved";
const DEFAULTS = defaultState();

// ---------- URL hash <-> state (keeps old share links working) ----------
export function parseHash(h: string): Partial<TripState> & { trip?: string } {
  const p = new URLSearchParams(h.replace(/^#/, ""));
  const out: Record<string, unknown> = {};
  for (const [k, v] of p) {
    if (!(k in DEFAULTS) && k !== "trip") continue;
    if (k === "trip") {
      out.trip = v;
      continue;
    }
    const def = (DEFAULTS as unknown as Record<string, unknown>)[k];
    if (Array.isArray(def)) out[k] = v ? v.split(",") : [];
    else if (typeof def === "number") out[k] = Number(v) || def;
    else if (typeof def === "boolean") out[k] = v === "1";
    else out[k] = v;
  }
  return out as Partial<TripState> & { trip?: string };
}
export function hashFor(S: TripState, trip: string | null) {
  const p = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS) as (keyof TripState)[]) {
    const v = S[k];
    const d = DEFAULTS[k];
    if (JSON.stringify(v) === JSON.stringify(d)) continue;
    p.set(
      k,
      Array.isArray(v)
        ? v.join(",")
        : typeof v === "boolean"
          ? v
            ? "1"
            : "0"
          : String(v),
    );
  }
  if (!p.has("from")) p.set("from", S.from); // keeps the hash non-empty so a refresh reopens results
  if (trip) p.set("trip", trip);
  return "#" + p.toString();
}
export const savedHash = (list: SavedTrip[]) =>
  "#saved=" + list.map((s) => [s.id, s.from, s.days].join(".")).join("~");
export function parseSavedHash(h: string): SavedTrip[] {
  return h
    .replace(/^#saved=/, "")
    .split("~")
    .map((part) => {
      const [id, from, days] = part.split(".");
      return {
        id,
        from,
        days: Math.min(15, Math.max(1, Number(days) || 4)),
        travelers: 2,
        stay: "budget" as const,
      };
    })
    .filter((s) => destOf(s.id) && originOf(s.from))
    .slice(0, 30);
}

interface Store {
  S: TripState;
  modeOverride: Record<string, Mode>;
  selectedId: string | null;
  started: boolean;
  fares: Record<string, FareEntry>;
  fareDisabled: boolean;
  saved: SavedTrip[];
  sharedList: SavedTrip[] | null;
  savedOpen: boolean;
  compare: SavedTrip[];
  /** trips waiting in the "Plan with friends" dialog (null = closed) */
  pollDraft: SavedTrip[] | null;
  tab: "filters" | "trips" | "map";

  set: (patch: Partial<TripState>) => void;
  reset: () => void;
  start: () => void;
  home: () => void;
  select: (id: string | null) => void;
  setMode: (id: string, m: Mode) => void;
  openFromHash: (hash: string) => void;
  setTab: (t: Store["tab"]) => void;

  loadSaved: () => void;
  replaceSaved: (list: SavedTrip[]) => void;
  toggleSave: (id: string) => void;
  clearSaved: () => void;
  saveAll: (items: SavedTrip[]) => void;
  openSaved: (shared?: SavedTrip[] | null) => void;
  closeSaved: () => void;
  openSavedTrip: (s: SavedTrip) => void;

  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  openPollDraft: (items: SavedTrip[]) => void;
  closePollDraft: () => void;
  fetchFare: (id: string) => void;
}

const persist = (saved: SavedTrip[]) => {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  } catch {
    /* storage blocked */
  }
};

export const useTrip = create<Store>((set, get) => ({
  S: defaultState(),
  modeOverride: {},
  selectedId: null,
  started: false,
  fares: {},
  fareDisabled: false,
  saved: [],
  sharedList: null,
  savedOpen: false,
  compare: [],
  pollDraft: null,
  tab: "trips",

  set: (patch) =>
    set((s) => {
      const S = { ...s.S, ...patch };
      // keep group and traveller count consistent
      if (patch.travelers != null) {
        if (S.travelers === 1) S.group = "solo";
        else if (S.group === "solo")
          S.group = S.travelers === 2 ? "couple" : "friends";
      }
      return { S };
    }),
  reset: () => set({ S: defaultState(), modeOverride: {}, selectedId: null }),
  start: () => set({ started: true, tab: "trips" }),
  home: () => set({ started: false, selectedId: null }),
  select: (id) => set({ selectedId: id, tab: "trips" }),
  setMode: (id, m) =>
    set((s) => ({ modeOverride: { ...s.modeOverride, [id]: m } })),
  setTab: (tab) => set({ tab }),
  openFromHash: (hash) => {
    const { trip, ...rest } = parseHash(hash);
    set({
      S: { ...defaultState(), ...rest },
      modeOverride: {},
      selectedId: trip && destOf(trip) ? trip : null,
      started: true,
      tab: "trips",
    });
  },

  loadSaved: () => {
    try {
      const v = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
      set({
        saved: Array.isArray(v)
          ? v.filter((s: SavedTrip) => s && destOf(s.id) && originOf(s.from))
          : [],
      });
    } catch {
      set({ saved: [] });
    }
  },
  replaceSaved: (list) => {
    const next = list.filter((s) => s && destOf(s.id) && originOf(s.from));
    persist(next);
    set({ saved: next });
  },
  toggleSave: (id) => {
    const { saved, S } = get();
    let next: SavedTrip[];
    if (saved.some((s) => s.id === id)) {
      next = saved.filter((s) => s.id !== id);
      toast("Removed from My trips");
    } else {
      next = [
        {
          id,
          from: S.from,
          days: S.days,
          travelers: S.travelers,
          stay: S.stay,
          savedAt: Date.now(),
        },
        ...saved,
      ];
      toast("Saved to My trips");
    }
    persist(next);
    set({ saved: next });
  },
  clearSaved: () => {
    persist([]);
    set({ saved: [] });
    toast("My trips cleared");
  },
  saveAll: (items) => {
    const have = new Set(get().saved.map((s) => s.id));
    const next = [
      ...get().saved,
      ...items
        .filter((s) => !have.has(s.id))
        .map((s) => ({ ...s, savedAt: Date.now() })),
    ];
    persist(next);
    set({ saved: next, sharedList: null, savedOpen: true });
    toast(
      `${items.length} trip${items.length > 1 ? "s" : ""} saved to My trips`,
    );
  },
  openSaved: (shared = null) => set({ savedOpen: true, sharedList: shared }),
  closeSaved: () => {
    if (get().sharedList && location.hash.startsWith("#saved="))
      history.replaceState(null, "", location.pathname + location.search);
    set({ savedOpen: false, sharedList: null });
  },
  openSavedTrip: (s) =>
    set((st) => ({
      savedOpen: false,
      sharedList: null,
      started: true,
      tab: "trips",
      modeOverride: {},
      S: {
        ...st.S,
        from: s.from,
        days: s.days,
        travelers: s.travelers || 2,
        stay: s.stay || "budget",
      },
      selectedId: s.id,
    })),

  toggleCompare: (id) =>
    set((s) => {
      if (s.compare.some((c) => c.id === id))
        return { compare: s.compare.filter((x) => x.id !== id) };
      if (s.compare.length >= 4) {
        toast("You can compare up to 4 trips");
        return {};
      }
      return {
        compare: [
          ...s.compare,
          {
            id,
            from: s.S.from,
            days: s.S.days,
            travelers: s.S.travelers,
            stay: s.S.stay,
          },
        ],
      };
    }),
  clearCompare: () => set({ compare: [] }),
  openPollDraft: (items) => {
    if (items.length < 2) return void toast("Pick at least 2 trips first");
    set({ pollDraft: items.slice(0, 8), savedOpen: false });
  },
  closePollDraft: () => set({ pollDraft: null }),

  fetchFare: (id) => {
    const { S, fares, fareDisabled } = get();
    const d = destOf(id);
    const k = d && fareKey(S, d);
    if (!d || !k || fareDisabled || fares[k]) return;
    const [from, to, month] = [k.slice(0, 3), k.slice(4, 7), k.slice(8)];
    set((s) => ({ fares: { ...s.fares, [k]: { status: "loading" } } }));
    fetch(`/api/fare?from=${from}&to=${to}&month=${month}`)
      .then((r) => {
        if (r.status === 404 || r.status === 503) set({ fareDisabled: true });
        return r.ok ? r.json() : Promise.reject(r.status);
      })
      .then((v) =>
        set((s) => ({
          fares: {
            ...s.fares,
            [k]: v.found ? { status: "ok", data: v } : { status: "none" },
          },
        })),
      )
      .catch(() =>
        set((s) => {
          const f = { ...s.fares };
          if (get().fareDisabled) delete f[k];
          else f[k] = { status: "error" };
          return { fares: f };
        }),
      );
  },
}));

// ---------- derived data ----------
export function useResults() {
  const S = useTrip((s) => s.S);
  const modeOverride = useTrip((s) => s.modeOverride);
  const fares = useTrip((s) => s.fares);
  return useMemo(
    () =>
      computeResults(S, modeOverride, (st, d) => {
        const k = fareKey(st, d);
        return k ? fares[k] : undefined;
      }),
    [S, modeOverride, fares],
  );
}

export function useTripFor(id: string | null) {
  const S = useTrip((s) => s.S);
  const modeOverride = useTrip((s) => s.modeOverride);
  const fares = useTrip((s) => s.fares);
  return useMemo(() => {
    const d = id ? destOf(id) : undefined;
    if (!d) return null;
    return evaluate(S, d, modeOverride[d.id], (st, dd) => {
      const k = fareKey(st, dd);
      return k ? fares[k] : undefined;
    });
  }, [id, S, modeOverride, fares]);
}
