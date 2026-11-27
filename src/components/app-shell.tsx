"use client";

import { Globe, Luggage, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { destOf, evaluate, originOf, type Result } from "@/lib/engine";
import { hashFor, parseSavedHash, useResults, useTrip, type SavedTrip } from "@/lib/store";
import type { CardInput } from "@/lib/share-card";
import { cn } from "@/lib/utils";
import { CompareDialog, CompareTray, ShareCardDialog } from "./dialogs";
import { FiltersBody } from "./filters-panel";
import { Header } from "./header";
import { Hero, Spotlight, useSpotlight } from "./home";
import dynamic from "next/dynamic";
import type { MapCommand } from "./map-view";
import { PollCreateDialog } from "./poll-create-dialog";
import { ResultsList, TripDetail } from "./results-panel";
import { SavedPanel } from "./saved-panel";

const DESKTOP = "(min-width: 1101px)";
const isDesktop = () => typeof window !== "undefined" && window.matchMedia(DESKTOP).matches;
const panel =
  "fixed z-30 flex min-h-0 flex-col overflow-hidden border border-line bg-surface min-[1101px]:rounded-2xl max-[1100px]:inset-x-0 max-[1100px]:bottom-[60px] max-[1100px]:h-[62dvh] max-[1100px]:rounded-t-2xl max-[1100px]:border-b-0";

// The map library is large. Loading it separately lets the page appear first and keeps other pages light.
const MapView = dynamic(() => import("./map-view").then((m) => m.MapView), { ssr: false });

export function AppShell() {
  const router = useRouter();
  const S = useTrip((s) => s.S);
  const started = useTrip((s) => s.started);
  const selectedId = useTrip((s) => s.selectedId);
  const tab = useTrip((s) => s.tab);
  const storeActions = useTrip.getState;
  const { results, stats } = useResults();

  const [landed, setLanded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [cmd, setCmd] = useState<MapCommand | null>(null);
  const [animateKey, setAnimateKey] = useState(0);
  const [cardInput, setCardInput] = useState<CardInput | null>(null);
  const [cmpItems, setCmpItems] = useState<SavedTrip[] | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const nonce = useRef(0);
  const send = useCallback((c: Omit<MapCommand, "nonce">) => setCmd({ ...c, nonce: ++nonce.current }), []);

  const phase = started ? "planner" : "intro";

  // ---------- actions ----------
  const find = useCallback(() => {
    const st = storeActions();
    setLeaving(true);
    st.start();
    setAnimateKey((k) => k + 1);
    setTimeout(() => setLeaving(false), 520);
  }, [send, storeActions]);

  const openFromHome = useCallback((id: string) => {
    const st = storeActions();
    setLeaving(true);
    st.start();
    st.select(id);
    setAnimateKey((k) => k + 1);
    setTimeout(() => setLeaving(false), 520);
  }, [send, storeActions]);

  const select = useCallback((id: string | null) => {
    storeActions().select(id);
  }, [storeActions]);

  const surprise = useCallback(() => {
    if (!results.length) return toast("Nothing fits yet. Try a bigger budget");
    const pool = results.slice(0, Math.min(8, results.length));
    select(pool[Math.floor(Math.random() * pool.length)].d.id);
  }, [results, select]);

  const goHome = useCallback(() => {
    storeActions().home();
    setLanded(true);
    history.replaceState(null, "", location.pathname);
  }, [storeActions]);

  // ---------- URL hash: share links in, state out ----------
  const route = useCallback(() => {
    const h = location.hash;
    const st = storeActions();
    const poll = h.match(/^#poll=([a-f0-9]{8})$/);
    if (poll) return router.replace(`/poll/${poll[1]}`);
    if (h.startsWith("#saved=")) {
      const list = parseSavedHash(h);
      return list.length ? st.openSaved(list) : toast("That shared list is empty");
    }
    if (h.length > 1 && /(^#|&)(from|budget|days|month|trip)=/.test(h)) {
      setLeaving(false);
      st.openFromHash(h);
      setAnimateKey((k) => k + 1);
    }
  }, [router, storeActions]);
  useEffect(() => {
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, [route]);
  useEffect(() => {
    if (started) history.replaceState(null, "", hashFor(S, selectedId));
  }, [started, S, selectedId]);

  // ---------- camera follows the selection: fly to the open trip, or fit all trips ----------
  useEffect(() => {
    if (!started) return;
    send(selectedId ? { type: "fly", id: selectedId } : { type: "fit" });
  }, [started, selectedId, send]);

  // ---------- results changed in the planner: refit the map once things settle ----------
  const idsKey = results.map((r) => r.d.id).join();
  useEffect(() => {
    if (!started || selectedId) return;
    const t = setTimeout(() => send({ type: "fit" }), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, started]);

  // ---------- spotlight tour on the home screen ----------
  const spotList = useMemo(() => results.slice(0, 5), [results]);
  const sp = useSpotlight(spotList, phase === "intro" && landed);
  const spotId = phase === "intro" && landed ? spotList[sp.index]?.d.id ?? null : null;

  // ---------- what the map shows ----------
  const pins = useMemo<Result[]>(() => {
    if (phase === "intro") return results.slice(0, 6);
    let top = results.slice(0, 24);
    if (selectedId && !top.some((r) => r.d.id === selectedId)) {
      const d = destOf(selectedId);
      const st = storeActions();
      const sel = d && evaluate(st.S, d, st.modeOverride[selectedId]);
      if (sel) top = [...top, sel];
    }
    return top;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, phase, selectedId]);

  const introInsets = useCallback(() => {
    const wide = isDesktop();
    const hero = heroRef.current;
    const top = wide ? 86 : 76;
    if (!hero) return { top, bottom: 24, left: 0, wide };
    return {
      top,
      bottom: wide ? 24 : hero.offsetHeight + 24,
      left: wide ? hero.offsetLeft + hero.offsetWidth + 16 : 0,
      wide,
    };
  }, []);
  const plannerInsets = useCallback(
    () => (isDesktop() ? { top: 100, bottom: 60, left: 430, right: 470 } : { top: 80, bottom: window.innerHeight * 0.64, left: 30, right: 30 }),
    [],
  );

  const openSavedTrip = (t: SavedTrip) => {
    setCmpItems(null);
    const st = storeActions();
    st.openSavedTrip(t);
    setAnimateKey((k) => k + 1);
  };

  const o = originOf(S.from)!;
  const setTab = useTrip((s) => s.setTab);
  const tabBtn = (id: "filters" | "trips" | "map", icon: React.ReactNode, label: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-current={tab === id}
      className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors", tab === id ? "text-primary" : "text-muted-foreground")}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div id="main" className="relative h-dvh overflow-hidden">
      <MapView
        origin={o}
        pins={pins}
        highlightId={selectedId ?? spotId}
        phase={phase}
        showPins={phase === "planner" || landed}
        animateKey={animateKey}
        command={cmd}
        introInsets={introInsets}
        plannerInsets={plannerInsets}
        onSelect={(id) => (started ? select(id) : openFromHome(id))}
        onLanded={() => { setLanded(true); setAnimateKey((k) => k + 1); }}
      />
      <Header onHome={goHome} transparent={phase === "intro"} />

      {phase === "intro" && (
        <>
          <Hero ref={heroRef} results={results} stats={stats} onFind={find} onOpen={openFromHome} leaving={leaving} />
          {landed && !leaving && <Spotlight list={spotList} index={sp.index} setIndex={sp.setIndex} onOpen={openFromHome} onPause={sp.setPaused} />}
        </>
      )}

      {phase === "planner" && (
        <>
          <aside
            aria-label="Your trip filters"
            className={cn(panel, "tw-fade min-[1101px]:top-[76px] min-[1101px]:bottom-3 min-[1101px]:left-3 min-[1101px]:w-[380px]", tab === "filters" ? "flex" : "max-[1100px]:hidden")}
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-5">
              <h2 className="text-base font-semibold">Your trip</h2>
              <button type="button" onClick={() => { storeActions().reset(); setAnimateKey((k) => k + 1); }} className="-mr-2 h-8 rounded-lg px-2 text-[13px] font-medium text-primary transition-colors hover:bg-primary/10">
                Reset
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4"><FiltersBody /></div>
          </aside>

          <aside
            aria-label="Trips"
            className={cn(panel, "tw-fade min-[1101px]:top-[76px] min-[1101px]:right-3 min-[1101px]:bottom-3 min-[1101px]:w-[420px]", tab === "trips" ? "flex" : "max-[1100px]:hidden")}
          >
            {selectedId ? <TripDetail onShareCard={(id) => setCardInput({ kind: "trip", trip: { id, from: S.from, days: S.days, travelers: S.travelers, stay: S.stay }, month: S.month })} /> : <ResultsList onSurprise={surprise} />}
          </aside>

          <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[60px] border-t border-line bg-surface min-[1101px]:hidden" aria-label="Sections">
            {tabBtn("filters", <SlidersHorizontal className="size-5" />, "Filters")}
            {tabBtn("trips", <Luggage className="size-5" />, <>Trips{results.length ? ` (${results.length})` : ""}</>)}
            {tabBtn("map", <Globe className="size-5" />, "Map")}
          </nav>
        </>
      )}

      <CompareTray onOpen={() => setCmpItems(storeActions().compare)} />
      <SavedPanel
        onFind={() => { if (!started) find(); }}
        onCard={(items) => setCardInput({ kind: "list", items, month: S.month })}
        onCompare={(items) => setCmpItems(items)}
      />
      <CompareDialog items={cmpItems} month={S.month} onClose={() => setCmpItems(null)} onOpenTrip={openSavedTrip} />
      <PollCreateDialog />
      <ShareCardDialog input={cardInput} onClose={() => setCardInput(null)} />
    </div>
  );
}
