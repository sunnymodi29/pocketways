import { MONTHS, evaluate, fmt, guideState, hrsLabel, itinerary, originOf, destOf } from "./engine";
import type { SavedTrip } from "./store";
import type { Destination, Origin } from "./types";

// 1080x1350 share image drawn on a canvas (download, share or copy)
const C = { bg: "#111111", panel: "#1a1a1a", surface: "#262626", line: "#333333", orange: "#F3652F", white: "#ffffff", muted: "#a0a0a0" };
const FONT = '"Anuphan", "Noto Sans", system-ui, sans-serif';
// Lucide "plane-takeoff" paths
const GLYPH_PATHS = [
  "M2 22h20",
  "M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z",
];

type Ring = number[][];
let indiaRings: Ring[] | null = null;
async function loadIndia(): Promise<Ring[]> {
  if (indiaRings) return indiaRings;
  const gj = await fetch("/borders.geojson").then((r) => r.json());
  const f = gj.features.find((x: { properties?: { iso?: string } }) => x.properties?.iso === "IND");
  const polys: number[][][][] = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
  indiaRings = polys.map((p) => p[0]);
  return indiaRings;
}

type Ctx = CanvasRenderingContext2D;
function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fit(ctx: Ctx, text: string, font: string, maxW: number, size: number, min = 40) {
  for (let s = size; s >= min; s -= 4) {
    ctx.font = `${font} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxW) return s;
  }
  ctx.font = `${font} ${min}px ${FONT}`;
  return min;
}
function clip(ctx: Ctx, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  while (text.length > 1 && ctx.measureText(text + "…").width > maxW) text = text.slice(0, -1);
  return text.trimEnd() + "…";
}
function logo(ctx: Ctx, x: number, y: number, s: number) {
  rrect(ctx, x, y, s, s, s * 0.24);
  ctx.fillStyle = C.orange;
  ctx.fill();
  ctx.save();
  ctx.translate(x + s * 0.17, y + s * 0.17);
  ctx.scale((s * 0.66) / 24, (s * 0.66) / 24);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  GLYPH_PATHS.forEach((d) => ctx.stroke(new Path2D(d)));
  ctx.restore();
}

function drawMap(ctx: Ctx, box: { x: number; y: number; w: number; h: number }, rings: Ring[], origin: Origin | null, dests: Destination[]) {
  ctx.save();
  rrect(ctx, box.x, box.y, box.w, box.h, 28);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.clip();
  // Frame the route itself (not always the whole country): short trips zoom in so markers and labels have room.
  const pts = [...(origin ? [[origin.lng, origin.lat]] : []), ...dests.map((d) => [d.lng, d.lat])];
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const spanY = Math.max(Math.max(...ys) - Math.min(...ys), 11) * 1.5;
  const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 14) * 1.4;
  const k = Math.cos((cy * Math.PI) / 180);
  const s = Math.min(box.w / (spanX * k), box.h / spanY);
  const P = (lng: number, lat: number): [number, number] => [box.x + box.w / 2 + (lng - cx) * k * s, box.y + box.h / 2 + (cy - lat) * s];
  ctx.beginPath();
  rings.forEach((ring) => {
    ring.forEach(([lng, lat], i) => {
      const [x, y] = P(lng, lat);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
  });
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.stroke();
  const a = origin ? P(origin.lng, origin.lat) : null;
  const bs = dests.map((d) => P(d.lng, d.lat));
  if (a) {
    bs.forEach((b) => {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(120, len * 0.22);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(mx + (-dy / len) * bend, my + (dx / len) * bend - bend * 0.2, b[0], b[1]);
      ctx.setLineDash([16, 12]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.orange;
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }
  bs.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b[0], b[1], 16, 0, Math.PI * 2);
    ctx.fillStyle = C.orange;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.white;
    ctx.stroke();
  });
  if (a) {
    ctx.beginPath();
    ctx.arc(a[0], a[1], 13, 0, Math.PI * 2);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.bg;
    ctx.stroke();
  }
  // Labels: try several spots around each marker and keep the first that touches no other label or marker.
  const marks = [...(a ? [a] : []), ...bs];
  type Box = { x: number; y: number; w: number; h: number };
  const placed: Box[] = [];
  const pad = 10;
  const H = 54;
  const hit = (r: Box, q: Box) => r.x < q.x + q.w + pad && r.x + r.w + pad > q.x && r.y < q.y + q.h + pad && r.y + r.h + pad > q.y;
  const hitsMarker = (r: Box, own: [number, number]) =>
    marks.some((m) => m !== own && m[0] > r.x - 24 && m[0] < r.x + r.w + 24 && m[1] > r.y - 24 && m[1] < r.y + r.h + 24);
  const label = (text: string, at: [number, number], preferLeft: boolean, plain: boolean) => {
    ctx.font = `600 30px ${FONT}`;
    const w = ctx.measureText(text).width + 40;
    const R: [number, number] = [at[0] + 26, at[1] - H / 2];
    const L: [number, number] = [at[0] - w - 26, at[1] - H / 2];
    const cands: [number, number][] = [
      preferLeft ? L : R, preferLeft ? R : L,
      [at[0] - w / 2, at[1] - H - 26], [at[0] - w / 2, at[1] + 26],
      [R[0], at[1] - H - 8], [L[0], at[1] - H - 8], [R[0], at[1] + 8], [L[0], at[1] + 8],
    ];
    const inside = (r: Box) => r.x >= box.x + 12 && r.y >= box.y + 12 && r.x + r.w <= box.x + box.w - 12 && r.y + r.h <= box.y + box.h - 12;
    let r: Box | undefined = cands
      .map(([x, y]) => ({ x, y, w, h: H }))
      .find((c) => inside(c) && !placed.some((q) => hit(c, q)) && !hitsMarker(c, at));
    if (!r) r = { x: Math.max(box.x + 12, Math.min(cands[0][0], box.x + box.w - 12 - w)), y: Math.max(box.y + 12, Math.min(cands[0][1], box.y + box.h - 12 - H)), w, h: H };
    placed.push(r);
    rrect(ctx, r.x, r.y, r.w, r.h, H / 2);
    ctx.fillStyle = plain ? C.bg : C.white;
    ctx.fill();
    if (plain) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.line;
      ctx.stroke();
    }
    ctx.fillStyle = plain ? C.white : C.bg;
    ctx.textBaseline = "middle";
    ctx.fillText(text, r.x + 20, r.y + H / 2 + 1);
  };
  // destinations first, on the side facing away from the origin; the origin label goes on the other side
  bs.forEach((b, i) => label(dests[i].name.split(" & ")[0], b, a ? !(b[0] > a[0]) : false, false));
  if (a && origin) label(origin.name, a, bs.length ? bs[0][0] > a[0] : false, true);
  ctx.restore();
}

export type CardInput = { kind: "trip"; trip: SavedTrip; month: number } | { kind: "list"; items: SavedTrip[]; month: number };

const stateFor = (it: SavedTrip, month: number) =>
  guideState({ from: it.from, days: it.days, travelers: it.travelers || 2, stay: it.stay || "budget", month });

export async function makeCard(input: CardInput, host: string): Promise<HTMLCanvasElement> {
  await Promise.all(["400", "600", "700"].map((w) => document.fonts.load(`${w} 40px Anuphan`).catch(() => {})));
  const rings = await loadIndia();
  const cv = document.createElement("canvas");
  cv.width = 1080;
  cv.height = 1350;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, 1080, 1350);
  logo(ctx, 70, 64, 72);
  ctx.fillStyle = C.white;
  ctx.font = `700 46px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText("Pocketways", 162, 101);
  ctx.fillStyle = C.muted;
  ctx.font = `400 28px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(input.kind === "list" ? "Shortlist" : "Trip plan", 1010, 101);
  ctx.textAlign = "left";
  ctx.fillStyle = C.orange;
  ctx.fillRect(70, 196, 9, 214);
  ctx.textBaseline = "alphabetic";

  if (input.kind === "trip") {
    const it = input.trip;
    const d = destOf(it.id)!;
    const o = originOf(it.from)!;
    const st = stateFor(it, input.month);
    const r = evaluate(st, d);
    const title = d.name.split(" & ")[0].toUpperCase();
    ctx.fillStyle = C.white;
    const sz = fit(ctx, title, "600", 880, 160);
    ctx.fillText(title, 108, 196 + sz * 0.86);
    ctx.fillStyle = C.muted;
    ctx.font = `400 34px ${FONT}`;
    ctx.fillText(clip(ctx, `${d.state} · from ${o.name} · ${it.days} days · ${MONTHS[input.month - 1]}`, 880), 108, 196 + sz * 0.86 + 66);
    drawMap(ctx, { x: 70, y: 440, w: 940, h: 420 }, rings, o, [d]);
    const n = it.travelers || 2;
    const box = (x: number, w: number, label: string, value: string, sub: string, hot: boolean) => {
      rrect(ctx, x, 886, w, 150, 24);
      ctx.fillStyle = hot ? C.orange : C.panel;
      ctx.fill();
      ctx.fillStyle = hot ? "rgba(255,255,255,.9)" : C.muted;
      ctx.font = `400 26px ${FONT}`;
      ctx.fillText(label, x + 28, 930);
      ctx.fillStyle = C.white;
      fit(ctx, value, "700", w - 56, 62, 30);
      ctx.fillText(value, x + 28, 992);
      ctx.fillStyle = hot ? "rgba(255,255,255,.9)" : C.muted;
      ctx.font = `400 24px ${FONT}`;
      ctx.fillText(clip(ctx, sub, w - 56), x + 28, 1024);
    };
    box(70, 320, "Per person", fmt(r.cost.total), "all-in estimate", true);
    box(416, 280, `Group of ${n}`, fmt(r.cost.total * n), `${st.days} days`, false);
    box(722, 288, "Getting there", r.mode ? hrsLabel(r.mode.hrs) : "Nearby", r.mode ? r.mode.name : "", false);
    const picks: [string, string][] = [];
    itinerary(st, r).forEach((x) => {
      const h = x.items.find((i) => !i.startsWith("@") && !/^Check in/.test(i));
      if (h) picks.push([`Day ${x.day}`, h]);
    });
    picks.slice(0, 3).forEach(([dayLabel, text], i) => {
      const y = 1100 + i * 52;
      ctx.fillStyle = C.orange;
      ctx.font = `700 30px ${FONT}`;
      ctx.fillText(dayLabel, 70, y);
      ctx.fillStyle = C.white;
      ctx.font = `400 32px ${FONT}`;
      ctx.fillText(clip(ctx, text, 800), 190, y);
    });
  } else {
    const items = input.items.slice(0, 5);
    const o = new Set(items.map((x) => x.from)).size === 1 ? originOf(items[0].from)! : null;
    ctx.fillStyle = C.white;
    ctx.font = `600 120px ${FONT}`;
    ctx.fillText("MY TRIPS", 108, 196 + 104);
    ctx.fillStyle = C.muted;
    ctx.font = `400 34px ${FONT}`;
    ctx.fillText(`${items.length} trip${items.length > 1 ? "s" : ""} worth taking`, 108, 196 + 104 + 66);
    drawMap(ctx, { x: 70, y: 440, w: 940, h: 360 }, rings, o, items.map((s) => destOf(s.id)!));
    items.forEach((s, i) => {
      const d = destOf(s.id)!;
      const r = evaluate(stateFor(s, input.month), d);
      const y = 828 + i * 80;
      rrect(ctx, 70, y, 940, 68, 18);
      ctx.fillStyle = C.panel;
      ctx.fill();
      ctx.fillStyle = C.orange;
      ctx.font = `700 32px ${FONT}`;
      ctx.fillText(String(i + 1), 100, y + 45);
      ctx.fillStyle = C.white;
      ctx.font = `600 33px ${FONT}`;
      ctx.fillText(clip(ctx, d.name.split(" & ")[0], 330), 150, y + 45);
      ctx.fillStyle = C.muted;
      ctx.font = `400 27px ${FONT}`;
      ctx.fillText(clip(ctx, `from ${originOf(s.from)!.name} · ${s.days} days`, 300), 490, y + 44);
      ctx.fillStyle = C.orange;
      ctx.font = `700 34px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText(fmt(r.cost.total), 980, y + 45);
      ctx.textAlign = "left";
    });
  }
  ctx.fillStyle = C.line;
  ctx.fillRect(70, 1268, 940, 2);
  ctx.fillStyle = C.white;
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText("Plan yours: " + host, 70, 1316);
  ctx.fillStyle = C.muted;
  ctx.font = `400 22px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("Estimates. Confirm prices before you book.", 1010, 1316);
  ctx.textAlign = "left";
  return cv;
}
