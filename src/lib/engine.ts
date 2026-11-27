import { DESTINATIONS, ORIGINS } from "./data";
import type { Destination, Group, Mode, Origin, Tier } from "./types";
export type { Mode };

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export type Scope = "india" | "intl" | "all";
export type SortKey = "match" | "cheap" | "near" | "rating";
export type WeatherPref = "any" | "cold" | "pleasant" | "warm";

export interface TripState {
  from: string;
  budget: number;
  budgetMode: "pp" | "total";
  days: number;
  travelers: number;
  month: number;
  group: Group;
  vibes: string[];
  scope: Scope;
  stay: Tier;
  transport: "any" | Mode;
  maxTravel: number;
  weather: WeatherPref;
  sort: SortKey;
  hideOff: boolean;
  stretch: boolean;
  offbeat: boolean;
  kids: boolean;
  seniors: boolean;
  nopass: boolean;
}

export const defaultState = (now = new Date()): TripState => ({
  from: "mumbai",
  budget: 15000,
  budgetMode: "pp",
  days: 4,
  travelers: 2,
  month: ((now.getMonth() + 1) % 12) + 1,
  group: "friends",
  vibes: [],
  scope: "india",
  stay: "budget",
  transport: "any",
  maxTravel: 24,
  weather: "any",
  sort: "match",
  hideOff: true,
  stretch: true,
  offbeat: false,
  kids: false,
  seniors: false,
  nopass: false,
});

// ---------- formatting ----------
export const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const fmtK = (n: number) => {
  n = Math.round(n / 100) * 100;
  if (n >= 100000) return "₹" + (n / 100000).toFixed(n % 100000 ? 1 : 0) + "L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(n % 1000 ? 1 : 0) + "k";
  return "₹" + n;
};
export const hrsLabel = (h: number) =>
  h < 1
    ? Math.round(h * 60) + " min"
    : h < 24
      ? (Math.round(h * 2) / 2).toString().replace(".5", "½") + " hrs"
      : Math.floor(h / 24) + "d " + Math.round(h % 24) + "h";

export const originOf = (id: string): Origin | undefined => ORIGINS.find((x) => x.id === id);
export const destOf = (id: string): Destination | undefined => DESTINATIONS.find((x) => x.id === id);

// ---------- geo ----------
const R = Math.PI / 180;
type LL = { lat: number; lng: number };
export function hav(a: LL, b: LL) {
  const dLat = (b.lat - a.lat) * R;
  const dLng = (b.lng - a.lng) * R;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
export function greatCircle(a: [number, number], b: [number, number], n = 96): [number, number][] {
  const l1 = a[0] * R, p1 = a[1] * R, l2 = b[0] * R, p2 = b[1] * R;
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  if (!d) return [a, b];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    pts.push([Math.atan2(y, x) / R, Math.atan2(z, Math.sqrt(x * x + y * y)) / R]);
  }
  return pts;
}
export function bearing(a: [number, number], b: [number, number]) {
  const y = Math.sin((b[0] - a[0]) * R) * Math.cos(b[1] * R);
  const x = Math.cos(a[1] * R) * Math.sin(b[1] * R) - Math.sin(a[1] * R) * Math.cos(b[1] * R) * Math.cos((b[0] - a[0]) * R);
  return (Math.atan2(y, x) / R + 360) % 360;
}

// ---------- fares ----------
export const IATA: Record<string, string> = {
  delhi: "DEL", mumbai: "BOM", bengaluru: "BLR", chennai: "MAA", kolkata: "CCU", hyderabad: "HYD",
  pune: "PNQ", ahmedabad: "AMD", jaipur: "JAI", chandigarh: "IXC", lucknow: "LKO", kochi: "COK",
  indore: "IDR", bhopal: "BHO", patna: "PAT", guwahati: "GAU", nagpur: "NAG", bhubaneswar: "BBI",
  surat: "STV", coimbatore: "CJB", dehradun: "DED", vizag: "VTZ",
  goa: "GOI", manali: "KUU", rishikesh: "DED", udaipur: "UDR", jaisalmer: "JSA", kasol: "KUU",
  shimla: "SLV", mussoorie: "DED", ladakh: "IXL", varanasi: "VNS", amritsar: "ATQ", agra: "AGR",
  darjeeling: "IXB", gangtok: "IXB", meghalaya: "GAU", andaman: "IXZ", munnar: "COK", alleppey: "COK",
  varkala: "TRV", pondicherry: "MAA", ooty: "CJB", coorg: "IXE", gokarna: "GOI", hampi: "HBX",
  lonavala: "PNQ", kutch: "BHJ", ranthambore: "JAI", corbett: "PGH", mcleodganj: "DHM", auli: "DED",
  kashmir: "SXR", thailand: "BKK", dubai: "DXB", vietnam: "HAN", bali: "DPS", nepal: "KTM",
  srilanka: "CMB", maldives: "MLE", singapore: "SIN",
};
export const LAST_KM: Record<string, number> = { gangtok: 125, coorg: 140 };

export interface LiveFare {
  price: number;
  transfers?: number;
  link?: string;
  found?: boolean;
  [k: string]: unknown;
}
export type FareEntry = { status: "loading" | "none" | "error" } | { status: "ok"; data: LiveFare };
export type FareLookup = (st: TripState, d: Destination) => FareEntry | undefined;

export function fareMonth(st: TripState, now = new Date()) {
  const y = now.getFullYear() + (st.month < now.getMonth() + 1 ? 1 : 0);
  return `${y}-${String(st.month).padStart(2, "0")}`;
}
export function fareKey(st: TripState, d: Destination, now = new Date()) {
  const a = IATA[st.from];
  const b = IATA[d.id];
  return a && b && a !== b ? `${a}-${b}-${fareMonth(st, now)}` : null;
}

// ---------- tiers & weather ----------
export const TIER: Record<Tier, { room: number; food: number; act: number; trainCls: string; trainRate: number; busRate: number; timeVal: number }> = {
  hostel: { room: 0.45, food: 0.8, act: 0.8, trainCls: "Sleeper", trainRate: 0.6, busRate: 1.2, timeVal: 80 },
  budget: { room: 1, food: 1, act: 1, trainCls: "3AC", trainRate: 1.6, busRate: 1.7, timeVal: 150 },
  mid: { room: 2.3, food: 1.6, act: 1.3, trainCls: "2AC", trainRate: 2.3, busRate: 1.7, timeVal: 450 },
  luxury: { room: 5.5, food: 3, act: 1.8, trainCls: "1AC", trainRate: 3.8, busRate: 2, timeVal: 1500 },
};

export type WxKey = "freezing" | "cold" | "pleasant" | "warm" | "hot" | "rainy";
export const WX: Record<WxKey, { label: string; icon: string }> = {
  freezing: { label: "Freezing", icon: "thermometer-snowflake" },
  cold: { label: "Cold", icon: "snowflake" },
  pleasant: { label: "Pleasant", icon: "cloud-sun" },
  warm: { label: "Warm", icon: "sun" },
  hot: { label: "Very hot", icon: "flame" },
  rainy: { label: "Rainy", icon: "cloud-rain" },
};
export interface Weather { k: WxKey; label: string; icon: string }

export function weather(d: Destination, m: number): Weather {
  let k: WxKey;
  switch (d.clim) {
    case "high":
      k = m >= 6 && m <= 9 ? "pleasant" : m === 5 || m === 10 ? "cold" : "freezing";
      break;
    case "hill":
      k = m === 12 || m <= 2 ? "cold" : m >= 7 && m <= 9 ? "rainy" : "pleasant";
      break;
    case "beach":
      k = m >= 11 || m <= 2 ? "pleasant" : m >= 6 && m <= 9 ? "rainy" : "warm";
      break;
    case "plain":
      k = m >= 11 || m <= 2 ? "pleasant" : m >= 4 && m <= 6 ? "hot" : m >= 7 && m <= 9 ? "rainy" : "warm";
      break;
    case "desert":
      k = m >= 11 || m <= 2 ? "pleasant" : m >= 4 && m <= 9 ? "hot" : "warm";
      break;
    case "gulf":
      k = m >= 11 || m <= 3 ? "pleasant" : "hot";
      break;
    default:
      k = d.avoid.includes(m) ? "rainy" : "warm";
  }
  return { k, ...WX[k] };
}
const weatherMatch = (k: WxKey, f: WeatherPref) =>
  f === "any" ||
  (f === "cold" && (k === "cold" || k === "freezing")) ||
  (f === "pleasant" && k === "pleasant") ||
  (f === "warm" && (k === "warm" || k === "hot"));

// ---------- travel ----------
export interface TravelOption {
  mode: Mode;
  icon: string;
  name: string;
  cost: number;
  hrs: number;
  note: string;
  live?: LiveFare;
}

export function travelOptions(st: TripState, o: Origin, d: Destination, fareFor?: FareLookup): TravelOption[] {
  const fly = hav(o, d);
  const road = fly * 1.3;
  const n = st.travelers;
  const T = TIER[st.stay];
  const modes = d.modes || ["flight", "train", "bus", "car"];
  const opts: TravelOption[] = [];
  if (fly < 40) return opts;
  if (modes.includes("flight") && d.air != null && fly > 250) {
    const one = d.intl ? 4500 + 3.3 * fly : Math.max(2800, 1800 + 3 * fly);
    const lf = fareFor?.(st, d);
    if (lf && lf.status === "ok") {
      const km = LAST_KM[d.id] ?? d.air;
      opts.push({
        mode: "flight", icon: "plane", name: "Flight", live: lf.data,
        cost: lf.data.price + km * 4 * 2,
        hrs: 2.5 + fly / 750 + km / 35,
        note: `${IATA[st.from]} → ${IATA[d.id]}${lf.data.transfers ? ` · ${lf.data.transfers} stop` : " · non-stop"}${km ? ` · then ${km} km by road` : ""}`,
      });
    } else {
      opts.push({
        mode: "flight", icon: "plane", name: "Flight",
        cost: (one + d.air * 4) * 2,
        hrs: 2.5 + fly / 750 + d.air / 35,
        note: d.air ? `then ${d.air} km by road` : "lands in the city",
      });
    }
  }
  if (modes.includes("train") && d.rail != null && road > 80 && !d.intl) {
    const one = Math.max(400, T.trainRate * road) + d.rail * 4;
    opts.push({
      mode: "train", icon: "train-front", name: `Train · ${T.trainCls}`,
      cost: one * 2, hrs: road / 52 + d.rail / 35 + 0.5,
      note: d.rail ? `then ${d.rail} km by road` : "station in town",
    });
  }
  if (modes.includes("bus") && road <= 1400 && road > 40) {
    const one = Math.max(300, T.busRate * road);
    opts.push({
      mode: "bus", icon: "bus", name: st.stay === "hostel" ? "Sleeper bus" : "Volvo AC bus",
      cost: one * 2, hrs: road / 45 + 0.5, note: "overnight buses run",
    });
  }
  if (modes.includes("car") && road <= 1600 && road > 40) {
    const cars = Math.ceil(n / 4);
    opts.push({
      mode: "car", icon: "car", name: "Road trip",
      cost: ((10 * road * cars) / n) * 2,
      hrs: road / 50 + Math.floor(road / 250) * 0.25,
      note: `fuel + tolls, ${cars} car${cars > 1 ? "s" : ""} split ${n} ways`,
    });
  }
  return opts;
}

export function pickMode(st: TripState, opts: TravelOption[], forced?: Mode | null): TravelOption | null {
  const f = forced || (st.transport !== "any" ? st.transport : null);
  if (f) return opts.find((o) => o.mode === f) || null;
  const limit = Math.min(st.maxTravel, Math.max(8, st.days * 7));
  let pool = opts.filter((o) => o.hrs <= limit);
  if (!pool.length) pool = opts.slice();
  if (!pool.length) return null;
  const w = TIER[st.stay].timeVal;
  return pool.reduce((a, b) => (a.cost + a.hrs * w <= b.cost + b.hrs * w ? a : b));
}

export type Season = "peak" | "ok" | "off";
export interface Costs {
  travel: number; stay: number; food: number; local: number; act: number; misc: number; total: number; nights: number;
}

export function costsFor(st: TripState, d: Destination, mode: TravelOption | null, season: Season): Costs {
  const n = st.travelers;
  const days = st.days;
  const nights = Math.max(1, days - 1);
  const T = TIER[st.stay];
  const occ = st.group === "solo" || n === 1 ? 1 : st.group === "family" ? Math.min(3, n) : 2;
  const seasonMul = season === "peak" ? 1.15 : season === "off" ? 0.8 : 1;
  const rooms = st.stay === "hostel" ? n : Math.ceil(n / occ);
  const stay = (rooms * d.stay * T.room * seasonMul * nights) / n;
  const food = d.food * T.food * days;
  const local = ((d.local * Math.ceil(n / 4) * days) / n) * (st.stay === "luxury" ? 1.5 : 1);
  const act = d.act * T.act * Math.max(1, days * 0.7);
  const travel = mode ? mode.cost : 0;
  const visa = d.intl && !d.visaEasy ? 3000 : 0;
  const sub = travel + stay + food + local + act;
  const misc = sub * 0.05 + visa;
  return { travel, stay, food, local, act, misc, total: sub + misc, nights };
}

export const budgetPP = (st: TripState) => (st.budgetMode === "total" ? st.budget / st.travelers : st.budget);

export interface Flag { t: "warn" | "info"; m: string }
export interface Result {
  d: Destination;
  km: number;
  opts: TravelOption[];
  mode: TravelOption | null;
  season: Season;
  wx: Weather;
  cost: Costs;
  ratio: number;
  within: boolean;
  score: number;
  flags: Flag[];
}

export function evaluate(st: TripState, d: Destination, forced?: Mode | null, fareFor?: FareLookup): Result {
  const o = originOf(st.from)!;
  const km = hav(o, d);
  const opts = travelOptions(st, o, d, fareFor);
  const mode = pickMode(st, opts, forced);
  const season: Season = d.best.includes(st.month) ? "peak" : d.avoid.includes(st.month) ? "off" : "ok";
  const wx = weather(d, st.month);
  const cost = costsFor(st, d, mode, season);
  const ratio = cost.total / budgetPP(st);
  let sc = 55;
  if (st.vibes.length) {
    const ov = d.tags.filter((t) => st.vibes.includes(t)).length;
    sc += (28 * ov) / st.vibes.length - (ov ? 0 : 20);
  } else sc += 10;
  sc += d.for.includes(st.group) ? 8 : -8;
  sc += season === "peak" ? 12 : season === "off" ? -25 : 0;
  sc += ratio <= 1 ? 10 - Math.max(0, 0.5 - ratio) * 10 : -40 * (ratio - 1);
  if (mode) sc -= Math.min(18, (mode.hrs / (st.days * 24)) * 60);
  sc += (d.rating - 4.5) * 14;
  if (st.offbeat && d.offbeat) sc += 6;
  const flags: Flag[] = [];
  if (season === "off")
    flags.push({ t: "warn", m: `${MONTHS[st.month - 1]} is off-season here (${wx.label.toLowerCase()}). Prices are lower, but some things may be closed.` });
  if (mode && mode.hrs > st.days * 6)
    flags.push({ t: "warn", m: `Long journey (${hrsLabel(mode.hrs)} each way) for a ${st.days}-day trip. Add days or fly.` });
  if (d.visa) flags.push({ t: "info", m: `@stamp ${d.visa}` });
  if (d.noKids) flags.push({ t: "info", m: "High altitude: rest a day on arrival to acclimatise." });
  return {
    d, km, opts, mode, season, wx, cost, ratio,
    within: ratio <= 1,
    score: Math.max(5, Math.min(99, Math.round(sc))),
    flags,
  };
}

export interface Stats { budget: number; other: number; cheapestHidden: number }

export function computeResults(
  st: TripState,
  overrides: Record<string, Mode> = {},
  fareFor?: FareLookup,
): { results: Result[]; stats: Stats } {
  const o = originOf(st.from)!;
  const stats: Stats = { budget: 0, other: 0, cheapestHidden: Infinity };
  const out: Result[] = [];
  for (const d of DESTINATIONS) {
    if (st.scope === "india" && d.intl) continue;
    if (st.scope === "intl" && !d.intl) continue;
    if (hav(o, d) < 40) continue;
    if (st.vibes.length && !d.tags.some((t) => st.vibes.includes(t))) { stats.other++; continue; }
    if (st.kids && d.noKids) { stats.other++; continue; }
    if (st.seniors && !d.easy) { stats.other++; continue; }
    if (st.offbeat && !d.offbeat) { stats.other++; continue; }
    if (st.nopass && d.intl && !d.visaEasy) { stats.other++; continue; }
    const r = evaluate(st, d, overrides[d.id], fareFor);
    if (!weatherMatch(r.wx.k, st.weather)) { stats.other++; continue; }
    if (st.hideOff && r.season === "off") { stats.other++; continue; }
    if (!r.mode) { stats.other++; continue; }
    if (r.mode.hrs > st.maxTravel) { stats.other++; continue; }
    if (r.ratio > (st.stretch ? 1.2 : 1)) {
      stats.budget++;
      stats.cheapestHidden = Math.min(stats.cheapestHidden, r.cost.total);
      continue;
    }
    out.push(r);
  }
  const sorters: Record<SortKey, (a: Result, b: Result) => number> = {
    match: (a, b) => b.score - a.score,
    cheap: (a, b) => a.cost.total - b.cost.total,
    near: (a, b) => a.mode!.hrs - b.mode!.hrs,
    rating: (a, b) => b.d.rating - a.d.rating || b.score - a.score,
  };
  out.sort(sorters[st.sort] || sorters.match);
  return { results: out, stats };
}

// ---------- itinerary ----------
/** Rough diet type of a dish name, for badges. */
export function dishType(e: string): "veg" | "nonveg" | "snack" | "both" {
  if (SWEET_OR_DRINK.test(e) && !NONVEG.test(e)) return "snack";
  if (NONVEG.test(e)) return "nonveg";
  if (/momo|thukpa|thenthuk/i.test(e)) return "both";
  return "veg";
}

export interface Slot {
  /** e.g. "Morning", "Lunch" */
  time: string;
  /** activity / travel / stay text (empty for meals) */
  text: string;
  kind: "travel" | "stay" | "sight" | "meal" | "free";
  /** for meals: one suggestion per diet */
  meal?: { veg: string; nonveg: string };
}
export interface DayPlan {
  day: number;
  title: string;
  /** flat, non-meal lines (used by share text / share card) */
  items: string[];
  slots: Slot[];
  /** pro tip for the day */
  tip?: string;
  /** typical food + activities spend per person for the day, INR */
  spend: number;
}

const SWEET_OR_DRINK = /tea|coffee|lassi|laddoo|bebinca|malpua|petha|jalebi|chikki|jam\b|chocolate|mithai|luqaimat|cr[êe]pes|pancake|honey|bakery|maggi|bhutta|vada pav|dabeli|chaat|sweet/i;
const NONVEG = /fish|prawn|pork|pandi|lobster|crab|chicken|mutton|lamb|laal maas|biryani|kebab|shawarma|trout|omelette|\begg|pho\b|bun cha|machboos|mas huni|garudhiya|seafood|meat|kottu|balch[ãa]o|vindaloo|skyu|phagshapa|jadoh|dohneiiong/i;
const EITHER = /momo|thukpa|thenthuk|tingmo|curry|rice & curry|thali|platter|set\b|dabeli/i;

/** Classify the destination's signature food into veg / non-veg mains and snacks. */
function foodPools(d: Destination) {
  const veg: string[] = [];
  const nonveg: string[] = [];
  const snacks: string[] = [];
  for (const e of d.eat) {
    if (SWEET_OR_DRINK.test(e) && !NONVEG.test(e)) { snacks.push(e); continue; }
    if (NONVEG.test(e)) { nonveg.push(e); continue; }
    if (/momo|thukpa|thenthuk/i.test(e)) { veg.push(`Veg ${e}`); nonveg.push(`Chicken ${e.toLowerCase()}`); continue; }
    veg.push(e);
    if (EITHER.test(e)) nonveg.push(`${e} (non-veg version)`);
  }
  const region = d.intl ? "local" : d.clim === "beach" ? "coastal" : "regional";
  if (!veg.length) veg.push(d.intl ? "Vegetarian set meal (ask for no meat or fish stock)" : "Local vegetarian thali");
  if (!nonveg.length) nonveg.push(d.clim === "beach" || d.clim === "trop" ? "Fresh-catch fish curry with rice" : `Chicken curry with rice or roti (${region} style)`);
  return { veg, nonveg, snacks };
}

/** `over` lets multi-city trips replace the first/last travel lines (e.g. "Travel on to Manali"). */
export function itinerary(st: TripState, r: Result, over?: { go?: string; back?: string }): DayPlan[] {
  const d = r.d;
  const o = originOf(st.from) ?? { name: "home" };
  const days = st.days;
  const hl = d.hl.slice();
  const m = r.mode;
  const pools = foodPools(d);
  const pick = (a: string[], n: number) => a[n % a.length];
  let mealN = 0;
  let snackN = 0;
  let usedNear = false;

  const go = over?.go ?? (m ? `${o.name} → ${d.name} by ${m.name} (~${hrsLabel(m.hrs)})` : `Travel to ${d.name}`);
  const back = over?.back ?? (m ? `Return to ${o.name} by ${m.name} (~${hrsLabel(m.hrs)})` : "Return home");
  const spend = Math.round(d.food + d.act);

  const meal = (time: string, kind: "b" | "l" | "d"): Slot => {
    const i = mealN++;
    if (kind === "b") {
      return {
        time, kind: "meal", text: "",
        meal: {
          veg: "Local breakfast: parathas / idli / poha / toast with chai or coffee",
          nonveg: "Egg omelette or bhurji with toast, chai or coffee",
        },
      };
    }
    return { time, kind: "meal", text: "", meal: { veg: pick(pools.veg, i), nonveg: pick(pools.nonveg, i) } };
  };
  const snack = (): string => {
    const s = pools.snacks.length ? pick(pools.snacks, snackN++) : "chai and local street snacks";
    return `Snack break: ${s}`;
  };
  const sight = (time: string, text?: string): Slot | null => (text ? { time, kind: "sight", text } : null);
  const next = () => hl.shift();
  const clean = (a: (Slot | null | undefined)[]) => a.filter(Boolean) as Slot[];

  const out: DayPlan[] = [];
  for (let i = 1; i <= days; i++) {
    let title = "Explore";
    let slots: Slot[] = [];

    if (days === 1) {
      title = "Quick getaway";
      slots = clean([
        { time: "Early morning", kind: "travel", text: go },
        sight("Late morning", next()),
        meal("Lunch", "l"),
        sight("Afternoon", next()),
        { time: "Evening", kind: "free", text: snack() },
        { time: "Evening", kind: "travel", text: back },
      ]);
    } else if (i === 1) {
      title = "Arrive & settle in";
      const overnight = !!m && m.hrs > 10;
      slots = clean([
        overnight ? { time: "Night before", kind: "travel", text: "Leave in the evening: this is an overnight journey, so carry a light dinner" } : null,
        { time: "Morning", kind: "travel", text: go },
        { time: "Check-in", kind: "stay", text: `Check in, freshen up and rest. Your stay: ${r.cost.nights} night${r.cost.nights > 1 ? "s" : ""} in ${d.name}` },
        meal("Lunch", "l"),
        sight("Afternoon", next()),
        sight("Evening", next() ?? `Sunset walk and local market in ${d.name}`),
        meal("Dinner", "d"),
      ]);
    } else if (i === days) {
      title = "Last morning & head home";
      slots = clean([
        meal("Breakfast", "b"),
        sight("Morning", next() ?? `Last wander around ${d.name}`),
        { time: "Late morning", kind: "free", text: "Souvenir shopping, pack up and check out" },
        meal("Lunch", "l"),
        { time: "Afternoon", kind: "travel", text: back },
      ]);
    } else {
      const a = next();
      const b = next();
      if (!a && !usedNear) {
        title = "Day trip";
        usedNear = true;
        slots = clean([
          meal("Breakfast", "b"),
          { time: "Morning", kind: "sight", text: `Day trip: ${d.near}` },
          meal("Lunch", "l"),
          { time: "Afternoon", kind: "sight", text: "Continue the day trip, then head back to your stay" },
          { time: "Evening", kind: "free", text: snack() },
          meal("Dinner", "d"),
        ]);
      } else if (!a) {
        title = "Slow day";
        slots = clean([
          meal("Breakfast", "b"),
          { time: "Morning", kind: "free", text: "Sleep in, cafés or redo your favourite spot" },
          meal("Lunch", "l"),
          { time: "Afternoon", kind: "free", text: "Local markets and souvenir hunting" },
          { time: "Evening", kind: "free", text: snack() },
          meal("Dinner", "d"),
        ]);
      } else {
        slots = clean([
          meal("Breakfast", "b"),
          sight("Morning", a),
          meal("Lunch", "l"),
          sight("Afternoon", b ?? `Relax at your stay or explore a café in ${d.name}`),
          { time: "Evening", kind: "free", text: snack() },
          meal("Dinner", "d"),
        ]);
      }
    }

    const items = slots.filter((s) => s.kind !== "meal").map((s) => (s.kind === "travel" ? `@${m?.icon ?? "car-front"} ${s.text}` : s.text));
    out.push({ day: i, title, items, slots, tip: d.tips[(i - 1) % Math.max(d.tips.length, 1)], spend });
  }
  return out;
}

/** State used by guides, saved lists and shared links: no filters, everything is shown. */
export const guideState = (over: Partial<TripState> = {}): TripState => ({
  ...defaultState(),
  vibes: [],
  scope: "all",
  hideOff: false,
  stretch: false,
  maxTravel: 99,
  travelers: 2,
  group: "couple",
  budget: 1e9,
  ...over,
});
