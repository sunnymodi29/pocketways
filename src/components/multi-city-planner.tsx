"use client";

import { ArrowDown, ArrowUp, Check, Copy, MapPin, Plus, Route, Shuffle, Trash2, TriangleAlert, Wand2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DESTINATIONS } from "@/lib/data";
import { MONTHS, fmt, hrsLabel, originOf, defaultState, guideState, type TripState } from "@/lib/engine";
import { iconByName } from "@/lib/icons";
import { waUrl } from "@/lib/links";
import { MAX_STOPS, MAX_STOP_DAYS, STARTERS, decodeRoute, encodeRoute, optimiseOrder, planMulti, type Leg, type Stop } from "@/lib/multicity";
import { editKey } from "@/lib/edits";
import { cn } from "@/lib/utils";
import { originOptions } from "./filters-panel";
import { DestIcon, Dropdown, Num, Seg, Stepper } from "./kit";
import { EditableItinerary } from "./editable-itinerary";
import { Header } from "./header";
import { SavedHost } from "./saved-host";
import { SiteFooter } from "./site-footer";
import { TripExport } from "./trip-export";
import { WeatherForecast } from "./weather-forecast";
import type { DayPlan } from "@/lib/engine";
import type { Tier } from "@/lib/types";
import { WhatsAppIcon } from "./brand-icons";

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-xl border border-line bg-surface p-4", className)}>{children}</div>
);
const H2 = ({ children, icon: I }: { children: React.ReactNode; icon: React.ElementType }) => (
  <h2 className="mt-10 mb-3 flex items-center gap-2 text-xl font-semibold tracking-tight">
    <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><I className="size-4" /></span>{children}
  </h2>
);
const Label = ({ children }: { children: React.ReactNode }) => <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</span>;

function LegRow({ leg, last }: { leg: Leg; last?: boolean }) {
  const I = iconByName(leg.opt?.icon ?? "car");
  return (
    <div className="my-1 flex items-center gap-3 pl-[18px]">
      <span className="h-8 w-0.5 bg-gradient-to-b from-primary/60 to-primary/10" aria-hidden />
      <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-xl border border-dashed border-line px-3 py-1.5 text-xs text-muted-foreground">
        <I className="size-4 text-primary" />
        <b className="text-foreground">{leg.opt?.name}</b>
        <span>{hrsLabel(leg.opt?.hrs ?? 0)}</span>
        <span>{Math.round(leg.km)} km</span>
        <span className="ml-auto font-semibold tabular-nums text-foreground">{fmt(leg.opt?.cost ?? 0)}<small className="font-normal text-muted-foreground"> {last ? "back home" : "one way"}</small></span>
      </div>
    </div>
  );
}

export function MultiCityPlanner() {
  const [from, setFrom] = useState("delhi");
  const [month, setMonth] = useState(((new Date().getMonth() + 1) % 12) + 1);
  const [stay, setStay] = useState<Tier>("budget");
  const [travelers, setTravelers] = useState(2);
  const [stops, setStops] = useState<Stop[]>(STARTERS[0].stops);
  const [live, setLive] = useState<DayPlan[] | null>(null);
  const [ready, setReady] = useState(false);

  // restore from a shared link, then keep the link up to date
  useEffect(() => {
    const m = /[#&]r=([^&]+)/.exec(location.hash);
    const r = m && decodeRoute(decodeURIComponent(m[1]));
    if (r) {
      setFrom(r.from); setMonth(r.month); setStay((r.stay as Tier) || "budget"); setTravelers(r.travelers);
      if (r.stops.length) setStops(r.stops);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) history.replaceState(null, "", `#r=${encodeURIComponent(encodeRoute(from, month, stay, travelers, stops))}`);
  }, [ready, from, month, stay, travelers, stops]);

  const st: TripState = useMemo(
    () => guideState({ ...defaultState(), from, month, stay, travelers, group: travelers === 1 ? "solo" : travelers > 2 ? "friends" : "couple" }),
    [from, month, stay, travelers],
  );
  const trip = useMemo(() => planMulti(st, stops), [st, stops]);
  const taken = new Set(stops.map((s) => s.id));
  const addOptions = DESTINATIONS.filter((d) => !taken.has(d.id)).map((d) => ({ v: d.id, label: `${d.name} · ${d.country ?? d.state}` }));
  const o = originOf(from)!;

  const setDays = (i: number, days: number) => setStops((s) => s.map((x, k) => (k === i ? { ...x, days } : x)));
  const move = (i: number, dir: -1 | 1) => setStops((s) => {
    const j = i + dir;
    if (j < 0 || j >= s.length) return s;
    const n = s.slice();
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  const parts: [string, number, string][] = trip
    ? [["Travel", trip.travel, "#2f5d8a"], ["Stay", trip.stay, "#f3652f"], ["Food", trip.food, "#5b8c3a"], ["Local transport", trip.local, "#a35d3a"], ["Activities", trip.act, "#d99a1e"], ["Buffer & visa", trip.misc, "#9a9288"]]
    : [];

  const text = () => {
    if (!trip) return "";
    const route = [o.name, ...trip.stops.map((s) => `${s.d.name} (${s.days}d)`), o.name].join(" > ");
    return [
      `*MULTI-CITY TRIP* ${trip.totalDays} days, ${MONTHS[month - 1]}`,
      `Route: ${route}`,
      `${fmt(trip.total)} per person (${fmt(trip.total * travelers)} for ${travelers})`,
      "",
      ...(live ?? trip.plan).flatMap((d) => [`*Day ${d.day}: ${d.title}*`, ...d.slots.map((s) => (s.meal ? `- ${s.time}: Veg: ${s.meal.veg} | Non-veg: ${s.meal.nonveg}` : `- ${s.time}: ${s.text}`)), ""]),
      `Plan yours: ${location.href}`,
    ].join("\n");
  };

  const itinKey = editKey("multi", from, trip?.totalDays ?? 0) + "|" + stops.map((s) => `${s.id}${s.days}`).join("");

  return (
    <>
      <Header />
      <SavedHost />
      <main id="main" className="mx-auto w-full max-w-[1040px] px-4 pt-[92px] pb-4">
        <p className="mb-4 text-[13px] text-muted-foreground"><Link href="/" className="transition-colors hover:text-primary">Home</Link> › Multi-city trips</p>
        <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] leading-tight font-medium tracking-tight">Build a multi-city trip</h1>
        <p className="mt-3 max-w-[64ch] text-muted-foreground">Chain two to six places into one route. We price every leg and stop, check the weather, and write a day-by-day plan you can edit and share.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            <Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label><Label>Starting from</Label><Dropdown label="Starting from" value={from} onChange={setFrom} options={originOptions} triggerClassName="border-transparent bg-surface-2" /></label>
                <label><Label>Month</Label><Dropdown label="Month" value={String(month)} onChange={(v) => setMonth(Number(v))} options={MONTHS.map((m, i) => ({ v: String(i + 1), label: m }))} triggerClassName="border-transparent bg-surface-2" /></label>
                <div><Label>Travellers</Label><Stepper label="travellers" value={travelers} min={1} max={20} onChange={setTravelers} /></div>
                <div><Label>Stay style</Label>
                  <Seg<Tier> size="sm" value={stay} onChange={setStay} options={[{ v: "hostel", label: "Hostel" }, { v: "budget", label: "Budget" }, { v: "mid", label: "Comfort" }, { v: "luxury", label: "Luxury" }]} />
                </div>
              </div>
            </Card>

            <H2 icon={Route}>Your route</H2>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Quick start:</span>
              {STARTERS.map((s) => (
                <button key={s.label} type="button" onClick={() => setStops(s.stops)}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary">{s.label}</button>
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-sm">
              <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><MapPin className="size-4" /></span>
              <div><b>{o.name}</b><div className="text-xs text-muted-foreground">Start</div></div>
            </div>

            {trip?.stops.map((s, i) => (
              <div key={s.d.id}>
                <LegRow leg={s.leg} />
                <Card className="flex flex-wrap items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold text-primary">{i + 1}</span>
                  <DestIcon d={s.d} className="size-6 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate">{s.d.name}</b>
                    <span className="text-xs text-muted-foreground">{s.d.state}{s.d.country ? `, ${s.d.country}` : ""} · {fmt(s.onGround)} on the ground</span>
                  </div>
                  <div className="w-[118px]"><Stepper label="days" value={s.days} min={1} max={MAX_STOP_DAYS} onChange={(v) => setDays(i, v)} /></div>
                  <div className="flex items-center">
                    <button type="button" aria-label={`Move ${s.d.name} up`} disabled={i === 0} onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-primary disabled:opacity-30"><ArrowUp className="size-4" /></button>
                    <button type="button" aria-label={`Move ${s.d.name} down`} disabled={i === stops.length - 1} onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-primary disabled:opacity-30"><ArrowDown className="size-4" /></button>
                    <button type="button" aria-label={`Remove ${s.d.name}`} onClick={() => setStops((x) => x.filter((_, k) => k !== i))} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-bad"><Trash2 className="size-4" /></button>
                  </div>
                </Card>
              </div>
            ))}
            {trip && <LegRow leg={trip.returnLeg} last />}
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-sm">
              <span className="grid size-9 place-items-center rounded-full bg-good/20 text-good"><Check className="size-4" /></span>
              <div><b>{o.name}</b><div className="text-xs text-muted-foreground">Back home</div></div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1">
                <Label>Add a stop {stops.length >= MAX_STOPS && `(max ${MAX_STOPS})`}</Label>
                <Dropdown label="Add a stop" value="" onChange={(id) => id && stops.length < MAX_STOPS && setStops((s) => [...s, { id, days: 2 }])} options={addOptions} triggerClassName="border-transparent bg-surface-2" />
              </div>
              <Button variant="outline" className="h-10 rounded-lg" disabled={stops.length < 2} onClick={() => { setStops(optimiseOrder(from, stops)); toast("Reordered to cut back-tracking"); }}><Wand2 /> Best order</Button>
              <Button variant="outline" className="h-10 rounded-lg" disabled={!stops.length} onClick={() => setStops([])}><Shuffle /> Clear</Button>
            </div>
            {!stops.length && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Plus className="size-4" /> Add your first stop, or pick a quick start above.</p>}

            {trip && (
              <>
                <H2 icon={MapPin}>Weather on your route</H2>
                <div className="space-y-5">
                  {trip.stops.map((s) => (
                    <div key={s.d.id}>
                      <h3 className="mb-2 text-sm font-semibold">{s.d.name}</h3>
                      <WeatherForecast lat={s.d.lat} lng={s.d.lng} name={s.d.name} days={7} />
                    </div>
                  ))}
                </div>

                <H2 icon={Route}>Day-by-day itinerary</H2>
                <EditableItinerary base={trip.plan} storeKey={itinKey} onChange={setLive} />
                <TripExport days={live ?? trip.plan} destName="Multi-city trip" month={month} doc={{
                  title: "Multi-city trip plan",
                  subtitle: [o.name, ...trip.stops.map((s) => `${s.d.name} (${s.days}d)`), o.name].join(" > "),
                  facts: [
                    ["Per person", fmt(trip.total)],
                    [`Group of ${travelers}`, fmt(trip.total * travelers)],
                    ["Trip length", `${trip.totalDays} days, ${trip.stops.length} cities`],
                    ["Distance", `${Math.round(trip.km).toLocaleString("en-IN")} km`],
                  ],
                  tips: trip.warnings, link: typeof location === "undefined" ? undefined : location.href,
                }} />
              </>
            )}
          </div>

          <aside className="lg:sticky lg:top-[92px] lg:self-start">
            {trip ? (
              <Card className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-primary bg-primary p-3 text-primary-foreground"><div className="text-[11px] text-primary-foreground/85">Per person</div><div className="text-xl font-bold tabular-nums"><Num value={trip.total} format={fmt} /></div></div>
                  <div className="rounded-xl border border-line bg-surface-2/50 p-3"><div className="text-[11px] text-muted-foreground">Group of {travelers}</div><div className="text-xl font-bold tabular-nums"><Num value={trip.total * travelers} format={fmt} /></div></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-surface-2/60 py-2"><b className="block text-sm tabular-nums">{trip.totalDays}</b>days</div>
                  <div className="rounded-lg bg-surface-2/60 py-2"><b className="block text-sm tabular-nums">{trip.stops.length}</b>cities</div>
                  <div className="rounded-lg bg-surface-2/60 py-2"><b className="block text-sm tabular-nums">{Math.round(trip.km).toLocaleString("en-IN")}</b>km</div>
                </div>
                <div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">{parts.map(([n, v, c]) => <div key={n} style={{ flex: Math.max(v, 1), background: c }} />)}</div>
                  <div className="mt-3 space-y-1.5 text-[13px]">
                    {parts.map(([n, v, c]) => <div key={n} className="flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: c }} />{n}<b className="ml-auto tabular-nums">{fmt(v)}</b></div>)}
                  </div>
                </div>
                {trip.warnings.map((w) => (
                  <div key={w} className="flex items-start gap-2 rounded-xl border border-warn/40 p-2.5 text-[12.5px] text-warn"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><span>{w}</span></div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button className="rounded-lg bg-whatsapp text-[#04321a] hover:bg-whatsapp/85" onClick={() => window.open(waUrl(text()), "_blank", "noopener")}><WhatsAppIcon /> WhatsApp</Button>
                  <Button variant="outline" className="rounded-lg" onClick={async () => { try { await navigator.clipboard.writeText(text()); toast("Plan copied!"); } catch { toast("Couldn't copy. Select and copy manually"); } }}><Copy /> Copy</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Estimates from typical prices and distances. Legs use the best-value mode for the distance. Confirm fares before booking.</p>
              </Card>
            ) : (
              <Card className="text-sm text-muted-foreground">Add a stop to see the route cost.</Card>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
