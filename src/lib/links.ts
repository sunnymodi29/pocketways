import type { Destination } from "./types";
import {
  IATA,
  MONTHS,
  fmt,
  hrsLabel,
  itinerary,
  type DayPlan,
  originOf,
  type Result,
  type TripState,
} from "./engine";

export type Link =
  | [label: string, href: string]
  | [label: string, sub: string, href: string];

export const cityName = (d: Destination) =>
  d.name
    .split(" & ")[0]
    .replace("Leh-Ladakh", "Ladakh")
    .replace("Rann of Kutch", "Kutch");

export function monthYear(st: TripState, now = new Date()) {
  const y = now.getFullYear() + (st.month < now.getMonth() + 1 ? 1 : 0);
  return `${MONTHS[st.month - 1]} ${y}`;
}

export function liveLinks(st: TripState, d: Destination): [string, string][] {
  const o = originOf(st.from)!;
  const city = cityName(d);
  const links: [string, string][] = [
    [
      "@plane Flights · Google",
      `https://www.google.com/travel/flights?q=${encodeURIComponent(`round trip flights from ${o.name} to ${IATA[d.id] || city} in ${monthYear(st)}`)}`,
    ],
    ["@plane Flights · MakeMyTrip", "https://www.makemytrip.com/flights/"],
  ];
  if (!d.intl) {
    links.push([
      "@train-front Trains · IRCTC",
      "https://www.irctc.co.in/nget/train-search",
    ]);
    links.push(["@bus Buses · redBus", "https://www.redbus.in/"]);
  }
  links.push([
    "@map Directions · Google Maps",
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o.name)}&destination=${encodeURIComponent(city + (d.intl ? "" : ", India"))}`,
  ]);
  return links;
}

export function stayLinks(
  st: TripState,
  d: Destination,
): [string, string, string][] {
  const city = cityName(d);
  const place = city + (d.intl ? "" : ", India");
  const rooms = Math.max(1, Math.ceil(st.travelers / 2));
  const bk = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(place)}&group_adults=${st.travelers}&no_rooms=${rooms}`;
  const all: Record<string, [string, string, string]> = {
    hotel: ["@hotel Hotels", "Booking.com", bk],
    agoda: [
      "@hotel Hotels",
      "Agoda",
      `https://www.agoda.com/search?textToSearch=${encodeURIComponent(city)}&adults=${st.travelers}&rooms=${rooms}`,
    ],
    mmt: [
      "@hotel Hotels & homestays",
      "MakeMyTrip",
      "https://www.makemytrip.com/hotels/",
    ],
    hostel: ["@bed Hostels", "Booking.com", bk + "&nflt=ht_id%3D203"],
    zostel: [
      "@backpack Backpacker hostels",
      "Zostel",
      "https://www.zostel.com/",
    ],
    home: [
      "@house Homestays & villas",
      "Airbnb",
      `https://www.airbnb.co.in/s/${encodeURIComponent(place.replace(/, /g, "--").replace(/ /g, "-"))}/homes?adults=${st.travelers}`,
    ],
    lux: [
      "@sparkles Luxury stays",
      "Booking.com",
      bk + "&nflt=class%3D5%3Bclass%3D4",
    ],
  };
  const order = {
    hostel: ["hostel", "zostel", "home", "hotel", "agoda"],
    budget: ["hotel", "agoda", "mmt", "home", "hostel"],
    mid: ["hotel", "agoda", "mmt", "home", "lux"],
    luxury: ["lux", "agoda", "home", "hotel"],
  }[st.stay];
  return order
    .filter((k) => (k !== "zostel" && k !== "mmt") || !d.intl)
    .map((k) => all[k]);
}

export function extrasLinks(d: Destination): [string, string, string][] {
  const q = cityName(d);
  const out: [string, string, string][] = [
    [
      `@ticket Tours & activities in ${q}`,
      "Tickets, tours & experiences on Klook",
      `https://www.klook.com/en-IN/search/result/?query=${encodeURIComponent(q)}`,
    ],
    [
      `@map-pin Things to do in ${q}`,
      "Attractions & reviews on Tripadvisor",
      `https://www.tripadvisor.in/Search?q=${encodeURIComponent(q + " things to do")}`,
    ],
  ];
  if (d.intl)
    out.push([
      `@wifi ${d.country || q} eSIM`,
      "Skip roaming charges with a travel eSIM on Airalo",
      `https://www.airalo.com/search?q=${encodeURIComponent(d.country || q)}`,
    ]);
  return out;
}

const waSafe = (text: string) =>
  text
    .replace(/\uFE0F/g, "")
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^ +/gm, "");
export const waUrl = (text: string) =>
  "https://api.whatsapp.com/send?text=" + encodeURIComponent(waSafe(text));

export function planText(st: TripState, r: Result, href: string, plan?: DayPlan[]) {
  const o = originOf(st.from)!;
  // Only BMP symbols here: WhatsApp links strip astral emoji (see waSafe).
  const bar = "━━━━━━━━━━━━━━";
  const icon = (t: string, kind: string) =>
    /breakfast/i.test(t) ? "☕" : /lunch/i.test(t) ? "♨" : /dinner/i.test(t) ? "☾"
    : kind === "travel" ? "✈" : kind === "stay" ? "⌂" : /morning/i.test(t) ? "☀" : /afternoon/i.test(t) ? "⛅" : "✦";
  const lines = [
    `✈ *${r.d.name.toUpperCase()} TRIP PLAN* ✈`,
    bar,
    `⏰ ${st.days} days · ${MONTHS[st.month - 1]}`,
    `☛ From ${o.name} · ${st.travelers} ${st.travelers === 1 ? "traveller" : "travellers"}`,
    r.mode ? `☛ ${r.mode.name}, ~${hrsLabel(r.mode.hrs)} each way` : "",
    `✅ *${fmt(r.cost.total)}* per person (${fmt(r.cost.total * st.travelers)} total)`,
    bar,
    "",
    ...(plan ?? itinerary(st, r)).flatMap((d) => [
      `★ *DAY ${d.day}* · ${d.title}`,
      ...d.slots.flatMap((s) =>
        s.meal
          ? [`${icon(s.time, s.kind)} *${s.time}*`, `    ✅ Veg: ${s.meal.veg}`, `    ♦ Non-veg: ${s.meal.nonveg}`]
          : [`${icon(s.time, s.kind)} *${s.time}*: ${s.text}`],
      ),
      d.tip ? `☞ _Tip: ${d.tip}_` : "",
      "",
    ]),
    bar,
    `Plan yours ⬇\n${href}`,
  ];
  return lines.filter((l, i) => l !== "" || lines[i - 1] !== "").join("\n");
}
