"use client";

import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MLMap, Marker } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString } from "geojson";

// Serve the worker from /public (see scripts/copy-map-worker.mjs); bundler-generated worker URLs 404.
// the version in the address means the file can be kept for a year: a new MapLibre gets a new address
maplibregl.setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${maplibregl.getVersion()}`);
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { bearing, fmtK, greatCircle, type Result } from "@/lib/engine";
import { dest } from "@/lib/icons";
import type { Origin } from "@/lib/types";

export interface MapInsets { top: number; bottom: number; left: number; right: number }
export interface MapCommand { type: "fit" | "fly" | "world"; id?: string; nonce: number; instant?: boolean }

interface Props {
  origin: Origin;
  pins: Result[];
  highlightId: string | null;
  phase: "intro" | "planner";
  showPins: boolean;
  animateKey: number;
  command: MapCommand | null;
  /** home layout: free area of the screen next to the hero card */
  introInsets: () => { top: number; bottom: number; left: number; wide: boolean };
  /** planner layout: space taken by the side panels */
  plannerInsets: () => MapInsets;
  onSelect: (id: string) => void;
  onLanded: () => void;
}

const R = Math.PI / 180;
const ZERO = { top: 0, bottom: 0, left: 0, right: 0 };
const fc = (features: Feature[]): FeatureCollection => ({ type: "FeatureCollection", features });
const styleUrl = (dark: boolean) => `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`;
const ACCENT = "#f3652f";

export function MapView(props: Props) {
  const box = useRef<HTMLDivElement>(null);
  const P = useRef(props);
  P.current = props;
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";

  const m = useRef({
    map: null as MLMap | null,
    ready: false,
    landed: false,
    flown: false,
    flyUntil: 0,
    spinning: true,
    interacting: false,
    userMoved: false,
    spinRaf: 0,
    drawRaf: 0,
    planeRaf: 0,
    markers: [] as Marker[],
    origin: null as Marker | null,
    plane: null as Marker | null,
    features: [] as Feature[],
    pinned: [] as Result[],
  }).current;

  // ---------- camera helpers ----------
  const introCamera = () => {
    const map = m.map!;
    const { top, bottom, left, wide } = P.current.introInsets();
    const el = map.getContainer();
    const avail = Math.max(200, Math.min(el.clientHeight - top - bottom, el.clientWidth - left - 24));
    const zoom = Math.log2((avail * 0.74 * 360) / (512 * 31));
    return { padding: { top, bottom, left, right: 0 }, center: [80.5, 22.5] as [number, number], zoom, pitch: wide ? 28 : 0 };
  };

  const spinOk = () => m.spinning && !m.interacting && m.ready && !m.userMoved && P.current.phase === "intro";
  const spinLoop = () => {
    if (!spinOk()) { m.spinRaf = 0; return; }
    const c = m.map!.getCenter();
    c.lng -= 0.13;
    m.map!.setCenter(c);
    m.spinRaf = requestAnimationFrame(spinLoop);
  };
  const spin = () => { if (!m.spinRaf && spinOk()) m.spinRaf = requestAnimationFrame(spinLoop); };

  const frameIntro = () => {
    const map = m.map;
    if (!map || P.current.phase !== "intro" || m.userMoved) return;
    if (m.flown) {
      if (performance.now() < m.flyUntil) return;
      const c = introCamera();
      map.setPadding(c.padding);
      map.jumpTo({ center: c.center, zoom: c.zoom, pitch: c.pitch, bearing: 0 });
      return;
    }
    const { top, bottom, left, wide } = P.current.introInsets();
    const el = map.getContainer();
    const avail = Math.max(140, Math.min(el.clientHeight - top - bottom, el.clientWidth - left - 40));
    map.setPadding({ top, bottom, left, right: 0 });
    map.setZoom(Math.log2((avail * (wide ? 0.98 : 1) * Math.PI * Math.cos(map.getCenter().lat * R)) / 512));
  };

  const flyIntoIndia = () => {
    const map = m.map;
    if (!map || m.flown || !m.ready || m.userMoved || P.current.phase !== "intro") return;
    m.flown = true;
    m.spinning = false;
    const c = introCamera();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 0 : 3000;
    m.flyUntil = performance.now() + ms + 200;
    map.flyTo({ center: c.center, zoom: c.zoom, pitch: c.pitch, bearing: 0, padding: c.padding, duration: ms, curve: 1.5, essential: true });
    setTimeout(() => {
      if (P.current.phase !== "intro") return;
      m.landed = true;
      P.current.onLanded();
    }, ms ? ms - 400 : 0);
  };

  const stopPlane = () => {
    cancelAnimationFrame(m.planeRaf);
    m.planeRaf = 0;
    m.plane?.remove();
  };

  const fitResults = (instant?: boolean) => {
    const map = m.map;
    if (!map || !m.ready) return;
    stopPlane();
    map.setPadding(ZERO); // flyTo padding sticks to the camera and would make fitBounds refuse
    if (instant) map.resize();
    const o = P.current.origin;
    const pts: [number, number][] = [[o.lng, o.lat], ...m.pinned.slice(0, 12).map((r): [number, number] => [r.d.lng, r.d.lat])];
    m.spinning = false;
    if (pts.length === 1) {
      map.flyTo({ center: pts[0], zoom: 4, pitch: 0, bearing: 0, duration: instant ? 0 : 2000 });
      return;
    }
    const b = pts.reduce((bb, p) => bb.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
    map.fitBounds(b, { padding: P.current.plannerInsets(), maxZoom: 5.5, pitch: 0, bearing: 0, duration: instant ? 0 : 2200, essential: true });
  };

  const flyPlane = (coords: [number, number][], done: () => void) => {
    const map = m.map!;
    cancelAnimationFrame(m.planeRaf);
    if (!m.plane) {
      const el = document.createElement("div");
      el.innerHTML =
        '<svg viewBox="0 0 24 24" width="26" height="26"><path fill="#f3652f" stroke="#fff" stroke-width=".8" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>';
      m.plane = new maplibregl.Marker({ element: el, rotationAlignment: "map", pitchAlignment: "map" });
    }
    m.plane.setLngLat(coords[0]).addTo(map);
    const start = performance.now() + 600;
    const dur = 2000;
    const step = (t: number) => {
      const f = Math.max(0, Math.min(1, (t - start) / dur));
      const e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      const i = Math.min(coords.length - 2, Math.floor(e * (coords.length - 1)));
      m.plane?.setLngLat(coords[i + 1]).setRotation(bearing(coords[i], coords[i + 1]));
      if (f < 1) m.planeRaf = requestAnimationFrame(step);
      else {
        setTimeout(() => m.plane?.remove(), 300);
        done();
      }
    };
    m.planeRaf = requestAnimationFrame(step);
  };

  const flyToDest = (id: string) => {
    const map = m.map;
    const r = m.pinned.find((x) => x.d.id === id);
    if (!map || !m.ready || !r) return;
    m.spinning = false;
    map.setPadding(ZERO);
    const o = P.current.origin;
    const coords = greatCircle([o.lng, o.lat], [r.d.lng, r.d.lat], 140);
    const b = coords.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(b, { padding: P.current.plannerInsets(), maxZoom: 6, pitch: 30, duration: 1500, essential: true });
    const ins = P.current.plannerInsets();
    const mobile = window.matchMedia("(max-width: 1100px)").matches;
    flyPlane(coords, () =>
      map.flyTo({
        center: [r.d.lng, r.d.lat],
        zoom: r.d.intl ? 7 : 9.2,
        pitch: 55,
        bearing: -20,
        duration: 2800,
        essential: true,
        padding: mobile ? { top: 0, bottom: window.innerHeight * 0.5, left: 0, right: 0 } : { top: 0, bottom: 0, left: ins.left - 26, right: ins.right - 26 },
      }),
    );
  };

  // ---------- pins + routes ----------
  const animateRoutes = () => {
    cancelAnimationFrame(m.drawRaf);
    const start = performance.now();
    const dur = 1400;
    const step = (t: number) => {
      const src = m.map?.getSource("routes") as GeoJSONSource | undefined;
      if (!src) return;
      const f = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - f, 3);
      src.setData(
        fc(
          m.features.map((ft) => {
            const c = (ft.geometry as LineString).coordinates;
            return { ...ft, geometry: { type: "LineString", coordinates: c.slice(0, Math.max(2, Math.ceil(c.length * e))) } } as Feature;
          }),
        ),
      );
      if (f < 1) m.drawRaf = requestAnimationFrame(step);
    };
    m.drawRaf = requestAnimationFrame(step);
  };

  const refreshPins = (animate: boolean) => {
    const map = m.map;
    if (!map || !m.ready) return;
    const { origin: o, pins, highlightId: hl, showPins } = P.current;
    if (!m.origin) {
      const el = document.createElement("div");
      el.className = "tw-origin";
      el.innerHTML = '<span class="tw-origin-label"></span>';
      m.origin = new maplibregl.Marker({ element: el }).setLngLat([o.lng, o.lat]).addTo(map);
    }
    m.origin.setLngLat([o.lng, o.lat]);
    (m.origin.getElement().querySelector(".tw-origin-label") as HTMLElement).textContent = o.name;
    m.origin.getElement().style.display = showPins || P.current.phase === "planner" ? "" : "none";

    m.markers.forEach((x) => x.remove());
    m.markers = [];
    const list = showPins ? pins : [];
    m.pinned = list;
    list.forEach((r, i) => {
      const Icon = dest(r.d);
      const el = document.createElement("div");
      const pin = document.createElement("div");
      pin.className = `tw-pin ${r.within ? "within" : "over"}${r.d.id === hl ? " active" : ""}`;
      pin.dataset.id = r.d.id;
      pin.style.animationDelay = (animate ? 0.5 + i * 0.05 : 0) + "s";
      pin.innerHTML = `${renderToStaticMarkup(<Icon />)}<span>${r.d.name.split(" ")[0]}</span><span class="pp"> · ${fmtK(r.cost.total)}</span>`;
      el.appendChild(pin);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        P.current.onSelect(r.d.id);
      });
      m.markers.push(new maplibregl.Marker({ element: el, anchor: "bottom", offset: [0, -4] }).setLngLat([r.d.lng, r.d.lat]).addTo(map));
    });
    m.features = list.map((r) => ({
      type: "Feature",
      properties: { id: r.d.id, within: r.within, sel: r.d.id === hl, dim: !!hl && r.d.id !== hl },
      geometry: { type: "LineString", coordinates: greatCircle([o.lng, o.lat], [r.d.lng, r.d.lat]) },
    }));
    const src = map.getSource("routes") as GeoJSONSource | undefined;
    if (animate) animateRoutes();
    else src?.setData(fc(m.features));
  };

  const setupStyle = (isDark: boolean) => {
    const map = m.map!;
    try { map.setProjection({ type: "globe" }); } catch { /* older style */ }
    try {
      map.setSky({
        "sky-color": isDark ? "#111111" : "#f3e3d8",
        "horizon-color": isDark ? "#222222" : "#fff3ec",
        "fog-color": isDark ? "#111111" : "#fff3ec",
        "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
      });
    } catch { /* sky unsupported */ }
    // India's boundary as officially depicted; the basemap's own boundary lines are hidden.
    map.getStyle().layers.forEach((l) => {
      if ((l as { "source-layer"?: string })["source-layer"] === "boundary" || /^boundary_/.test(l.id)) map.setLayoutProperty(l.id, "visibility", "none");
    });
    const firstLabel = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
    if (!map.getSource("borders")) map.addSource("borders", { type: "geojson", data: "/borders.geojson" });
    map.addLayer({ id: "india-fill", type: "fill", source: "borders", filter: ["==", ["get", "iso"], "IND"], paint: { "fill-color": ACCENT, "fill-opacity": 0.08 } }, firstLabel);
    map.addLayer({
      id: "borders-line", type: "line", source: "borders", filter: ["!=", ["get", "iso"], "IND"],
      paint: { "line-color": isDark ? "#4a4540" : "#bfb5a5", "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 6, 1.1], "line-opacity": 0.8 },
    }, firstLabel);
    map.addLayer({
      id: "india-line", type: "line", source: "borders", filter: ["==", ["get", "iso"], "IND"],
      paint: { "line-color": ACCENT, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.8, 6, 1.8] },
    }, firstLabel);
    map.addSource("routes", { type: "geojson", data: fc(m.features) });
    map.addLayer({
      id: "routes-line", type: "line", source: "routes", layout: { "line-cap": "round" },
      paint: {
        "line-color": ["case", ["get", "sel"], ACCENT, ["get", "within"], "#1f9d62", "#d98a00"],
        "line-width": ["case", ["get", "sel"], 3, 1.4],
        "line-opacity": ["case", ["get", "dim"], 0.15, 0.85],
      },
    });
    m.ready = true;
    frameIntro();
    spin();
    if (!m.flown && P.current.phase === "intro") setTimeout(flyIntoIndia, 1100);
    refreshPins(false);
  };

  // ---------- create the map once ----------
  useEffect(() => {
    if (!box.current) return;
    const map = new maplibregl.Map({
      container: box.current,
      style: styleUrl(dark),
      center: [78, 15],
      zoom: 1.5,
      minZoom: 0.8,
      maxPitch: 70,
      attributionControl: { compact: true },
    });
    m.map = map;
    // Attribution is required by OpenFreeMap / OpenStreetMap, so it stays as the small "i" icon (collapsed).
    const collapseAttribution = () => {
      const el = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
      el?.removeAttribute("open");
      el?.classList.remove("maplibregl-compact-show");
    };
    map.once("load", () => { collapseAttribution(); setTimeout(collapseAttribution, 600); });
    map.on("style.load", () => {
      try { setupStyle(document.documentElement.classList.contains("dark")); } catch (e) { console.warn("map style setup failed", e); }
    });
    map.on("error", (e) => console.warn("map error", e?.error?.message));
    const stop = () => { m.userMoved = true; m.spinning = false; };
    map.on("mousedown", () => { m.interacting = true; stop(); });
    map.on("touchstart", () => { m.interacting = true; stop(); });
    map.on("wheel", stop);
    map.on("mouseup", () => { m.interacting = false; spin(); });
    map.on("touchend", () => { m.interacting = false; spin(); });
    const touchOnly = window.matchMedia("(hover: none)").matches;
    map.on("click", (e) => {
      if (!touchOnly) return;
      let best: Result | null = null;
      let bestD = 34;
      for (const r of m.pinned) {
        const p = map.project([r.d.lng, r.d.lat]);
        const dd = Math.hypot(p.x - e.point.x, p.y - 14 - e.point.y);
        if (dd < bestD) { bestD = dd; best = r; }
      }
      if (best) P.current.onSelect(best.d.id);
    });
    const ro = new ResizeObserver(() => { map.resize(); frameIntro(); });
    ro.observe(box.current);
    // slow or blocked tile server: retry instead of leaving a blank map
    let tries = 0;
    const retry = setInterval(() => {
      if (m.ready || tries >= 4) return;
      tries++;
      map.setStyle(styleUrl(document.documentElement.classList.contains("dark")), { diff: false });
    }, 7000);
    return () => {
      clearInterval(retry);
      ro.disconnect();
      [m.spinRaf, m.drawRaf, m.planeRaf].forEach(cancelAnimationFrame);
      m.markers.forEach((x) => x.remove());
      m.markers = [];
      m.origin = null;
      m.plane = null;
      m.ready = false;
      m.flown = false;
      m.landed = false;
      m.spinRaf = 0;
      map.remove();
      m.map = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // theme switch -> reload basemap, then re-add our layers
  const firstTheme = useRef(true);
  useEffect(() => {
    if (firstTheme.current) { firstTheme.current = false; return; }
    const map = m.map;
    if (!map) return;
    m.ready = false;
    map.setStyle(styleUrl(dark), { diff: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  // pins / highlight / pin visibility
  useEffect(() => {
    refreshPins(props.animateKey > 0 && props.showPins);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pins, props.highlightId, props.showPins, props.origin, props.animateKey]);

  // phase change: leaving the home screen stops the spin and clears the intro camera
  useEffect(() => {
    const map = m.map;
    if (!map) return;
    if (props.phase === "planner") {
      m.spinning = false;
      map.setPadding(ZERO);
      setTimeout(() => map.resize(), 50);
    } else {
      m.spinning = !m.flown;
      m.userMoved = false;
      if (m.ready) {
        stopPlane();
        map.setPadding(ZERO);
        m.flown = false;
        m.flyUntil = 0;
        frameIntro();
        setTimeout(flyIntoIndia, 300);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.phase]);

  // camera commands from the planner
  useEffect(() => {
    const c = props.command;
    if (!c) return;
    const run = () => {
      if (c.type === "fit") fitResults(c.instant);
      else if (c.type === "fly" && c.id) flyToDest(c.id);
    };
    if (m.ready) requestAnimationFrame(() => requestAnimationFrame(run));
    else m.map?.once("style.load", () => setTimeout(run, 80));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.command?.nonce]);

  return (
    <div className="absolute inset-0 z-0">
      <div ref={box} className="h-full w-full" aria-label="Map of trips" />
    </div>
  );
}
