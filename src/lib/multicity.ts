import {
  costsFor, evaluate, guideState, hav, hrsLabel, itinerary, originOf, pickMode, travelOptions,
  type DayPlan, type TravelOption, type TripState,
} from "./engine";
import { DESTINATIONS } from "./data";
import type { Destination, Origin } from "./types";

export interface Stop { id: string; days: number }

/** One-way hop between two places. `opt.cost` is already one-way, per person. */
export interface Leg {
  fromName: string;
  toName: string;
  km: number;
  opt: TravelOption | null;
}

export interface MultiStop {
  d: Destination;
  days: number;
  leg: Leg;
  stay: number;
  food: number;
  local: number;
  act: number;
  /** stay + food + local + activities for this stop */
  onGround: number;
}

export interface MultiTrip {
  stops: MultiStop[];
  returnLeg: Leg;
  totalDays: number;
  travel: number;
  stay: number;
  food: number;
  local: number;
  act: number;
  misc: number;
  total: number;
  km: number;
  travelHrs: number;
  plan: DayPlan[];
  warnings: string[];
}

export const MAX_STOPS = 6;
export const MAX_STOP_DAYS = 10;

export const STARTERS: { label: string; stops: Stop[] }[] = [
  { label: "Himachal circuit", stops: [{ id: "shimla", days: 2 }, { id: "manali", days: 3 }, { id: "kasol", days: 2 }] },
  { label: "Kerala backwaters", stops: [{ id: "munnar", days: 2 }, { id: "alleppey", days: 2 }, { id: "varkala", days: 2 }] },
  { label: "Royal Rajasthan", stops: [{ id: "jaipur", days: 2 }, { id: "udaipur", days: 2 }, { id: "jaisalmer", days: 2 }] },
  { label: "Coast & ruins", stops: [{ id: "goa", days: 3 }, { id: "gokarna", days: 2 }, { id: "hampi", days: 2 }] },
];

const pseudo = (d: Destination): Origin => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng });

/** One-way leg from `a` to destination `b`. Short hops become a local transfer. */
function legTo(st: TripState, a: Origin, b: Destination, tripDays: number): Leg {
  const km = hav(a, b);
  const opts = travelOptions(st, a, b);
  const pick = pickMode({ ...st, days: tripDays }, opts);
  if (!pick) {
    return {
      fromName: a.name, toName: b.name, km,
      opt: { mode: "car", icon: "car", name: "Local transfer", cost: 400, hrs: Math.max(0.5, km / 40), note: "close by: cab or local bus" },
    };
  }
  // travelOptions prices a return trip; a leg is one way
  return { fromName: a.name, toName: b.name, km, opt: { ...pick, cost: pick.cost / 2 } };
}

const legText = (l: Leg) => (l.opt ? `${l.opt.name} (~${hrsLabel(l.opt.hrs)})` : "travel");

export function planMulti(st: TripState, stops: Stop[]): MultiTrip | null {
  const o = originOf(st.from);
  const list = stops.map((s) => ({ s, d: DESTINATIONS.find((x) => x.id === s.id) })).filter((x): x is { s: Stop; d: Destination } => !!x.d);
  if (!o || !list.length) return null;
  const totalDays = list.reduce((a, x) => a + x.s.days, 0);

  const legs: Leg[] = [];
  let prev: Origin = o;
  for (const { d } of list) {
    legs.push(legTo(st, prev, d, totalDays));
    prev = pseudo(d);
  }
  // heading home: same distance and options as going out to the last stop
  const last = list[list.length - 1].d;
  const out = legTo(st, o, last, totalDays);
  const returnLeg: Leg = { ...out, fromName: last.name, toName: o.name };

  let plan: DayPlan[] = [];
  let dayNo = 0;
  const stopsOut: MultiStop[] = list.map(({ s, d }, i) => {
    const season = d.best.includes(st.month) ? "peak" : d.avoid.includes(st.month) ? "off" : "ok";
    const c = costsFor({ ...st, days: s.days }, d, null, season);
    const leg = legs[i];
    const nextLeg = i < list.length - 1 ? legs[i + 1] : returnLeg;
    // itinerary() needs a Result: reuse a normal evaluation, then plug in this stop's own arrival leg
    const base = evaluate(guideState({ ...st, days: s.days }), d);
    const r = { ...base, mode: leg.opt };
    const days = itinerary({ ...st, days: s.days }, r, {
      go: `${leg.fromName} → ${d.name} by ${legText(leg)}`,
      back: i < list.length - 1 ? `Travel on to ${nextLeg.toName} by ${legText(nextLeg)}` : `Return to ${o.name} by ${legText(returnLeg)}`,
    });
    plan = plan.concat(days.map((x) => ({ ...x, day: ++dayNo, title: `${d.name}: ${x.title}` })));
    return { d, days: s.days, leg, stay: c.stay, food: c.food, local: c.local, act: c.act, onGround: c.stay + c.food + c.local + c.act };
  });

  const sum = (f: (x: MultiStop) => number) => stopsOut.reduce((a, x) => a + f(x), 0);
  const travel = legs.reduce((a, l) => a + (l.opt?.cost ?? 0), 0) + (returnLeg.opt?.cost ?? 0);
  const stay = sum((x) => x.stay);
  const food = sum((x) => x.food);
  const local = sum((x) => x.local);
  const act = sum((x) => x.act);
  const visa = stopsOut.some((x) => x.d.intl && !x.d.visaEasy) ? 3000 : 0;
  const misc = (travel + stay + food + local + act) * 0.05 + visa;
  const km = legs.reduce((a, l) => a + l.km, 0) + returnLeg.km;
  const travelHrs = legs.reduce((a, l) => a + (l.opt?.hrs ?? 0), 0) + (returnLeg.opt?.hrs ?? 0);

  const warnings: string[] = [];
  if (travelHrs > totalDays * 6) warnings.push(`About ${Math.round(travelHrs)} hours of travel across ${totalDays} days: consider fewer stops or more days.`);
  stopsOut.forEach((x) => {
    if (x.d.avoid.includes(st.month)) warnings.push(`${x.d.name} is a month to avoid. Check weather and closures.`);
    if (x.days < 2 && x.leg.km > 300) warnings.push(`${x.d.name}: only ${x.days} day after a long trip. Give it at least 2.`);
  });
  if (new Set(stopsOut.map((x) => x.d.country ?? "India")).size > 1) warnings.push("This route crosses countries: check visa rules for each.");

  return { stops: stopsOut, returnLeg, totalDays, travel, stay, food, local, act, misc, total: travel + stay + food + local + act + misc, km, travelHrs, plan, warnings };
}

/** Nearest-neighbour ordering from the starting city: a cheap way to cut back-tracking. */
export function optimiseOrder(fromId: string, stops: Stop[]): Stop[] {
  const o = originOf(fromId);
  if (!o) return stops;
  const left = stops.slice();
  const out: Stop[] = [];
  let cur: { lat: number; lng: number } = o;
  while (left.length) {
    let bi = 0, bd = Infinity;
    left.forEach((s, i) => {
      const d = DESTINATIONS.find((x) => x.id === s.id);
      const k = d ? hav(cur, d) : Infinity;
      if (k < bd) { bd = k; bi = i; }
    });
    const [n] = left.splice(bi, 1);
    out.push(n);
    cur = DESTINATIONS.find((x) => x.id === n.id) ?? cur;
  }
  return out;
}

export const encodeRoute = (from: string, month: number, stay: string, travelers: number, stops: Stop[]) =>
  `${from}.${month}.${stay}.${travelers}~${stops.map((s) => `${s.id}.${s.days}`).join("~")}`;

export function decodeRoute(raw: string): { from: string; month: number; stay: string; travelers: number; stops: Stop[] } | null {
  const [head, ...rest] = raw.split("~");
  const [from, month, stay, travelers] = head.split(".");
  if (!originOf(from)) return null;
  const stops = rest
    .map((x) => x.split("."))
    .map(([id, days]) => ({ id, days: Math.min(MAX_STOP_DAYS, Math.max(1, Number(days) || 2)) }))
    .filter((s) => DESTINATIONS.some((d) => d.id === s.id))
    .slice(0, MAX_STOPS);
  return { from, month: Math.min(12, Math.max(1, Number(month) || 1)), stay: stay || "budget", travelers: Math.min(20, Math.max(1, Number(travelers) || 2)), stops };
}
