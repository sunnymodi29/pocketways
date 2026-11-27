"use client";

import { ArrowRight, Backpack, Ban, Bed, HelpCircle, CalendarDays, Check, Compass, Lightbulb, MapPin, Plane, Route, Search, Star, Utensils, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DESTINATIONS } from "@/lib/data";
import { MONTHS, computeResults, evaluate, fmt, guideState, hrsLabel, itinerary, originOf, weather, type DayPlan } from "@/lib/engine";
import { iconByName } from "@/lib/icons";
import { useTrip } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Destination } from "@/lib/types";
import { Chip, DestIcon, Dropdown } from "./kit";
import { Header } from "./header";
import { SavedHost } from "./saved-host";
import { SectionNav } from "./section-nav";
import { DestPhoto } from "./dest-photo";
import { WeatherForecast } from "./weather-forecast";
import { TripExport } from "./trip-export";
import { SiteFooter } from "./site-footer";
import { DishCards } from "./itinerary-view";
import { EditableItinerary } from "./editable-itinerary";
import { editKey } from "@/lib/edits";
import { CuratedPlan, GuideAreas, GuideFood, GuideMore, GuideSights, GuideStory } from "./guide-extras";
import { guideContent } from "@/lib/guides-store";
import { originOptions } from "./filters-panel";

import { DATA_UPDATED, UNDER_AMOUNTS, UNDER_CITIES } from "@/lib/guide-config";

const Shell = ({ children }: { children: React.ReactNode }) => (
  <>
    <Header />
    <SavedHost />
    <main id="main" className="mx-auto w-full max-w-[960px] px-4 pt-[92px] pb-4">{children}</main>
    <SiteFooter />
  </>
);
const Crumbs = ({ items }: { items: [string, string?][] }) => (
  <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
    {items.map(([label, href], i) => (
      <span key={label} className="flex items-center gap-2">
        {i > 0 && <span aria-hidden className="text-muted-foreground/60">›</span>}
        {href ? <Link href={href} className="transition-colors hover:text-primary">{label}</Link> : label}
      </span>
    ))}
  </p>
);
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 mb-3 flex items-center gap-2 text-xl font-semibold tracking-tight">{children}</h2>;

function GuideCard({ d, sub }: { d: Destination; sub?: React.ReactNode }) {
  return (
    <Link href={`/guides/${d.id}`} className="tw-bar flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-primary/60">
      <span className="grid size-11 place-items-center rounded-lg bg-surface-2"><DestIcon d={d} className="size-5" /></span>
      <b className="tw-underline w-fit text-base">{d.name}</b>
      <span className="text-[13px] text-muted-foreground">{sub ?? d.desc}</span>
    </Link>
  );
}

/* ---------------------------------------------------------------- index */
export function GuideIndex() {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return DESTINATIONS.filter((d) => !s || [d.name, d.state, d.desc, ...d.tags].join(" ").toLowerCase().includes(s));
  }, [q]);
  return (
    <Shell>
      <Crumbs items={[["Home", "/"], ["Travel guides"]]} />
      <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] leading-tight font-medium tracking-tight">Travel guides: budget trip plans for India &amp; abroad</h1>
      <p className="mt-3 max-w-[64ch] text-muted-foreground">
        Honest trip costs from Indian cities, ready-made itineraries, best months to go, what to eat and what to skip for {DESTINATIONS.length} destinations. Pick a place, or let the{" "}
        <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">Pocketways planner</Link> find trips in your budget.
      </p>
      <H2><Wallet className="size-5 text-primary" /> Budget trip lists</H2>
      <div className="flex flex-wrap gap-2">
        {UNDER_CITIES.flatMap((c) =>
          UNDER_AMOUNTS.map((a) => (
            <Link key={c + a} href={`/guides/under-${a}-from-${c}`}>
              <Chip>Trips under {fmt(a)} from {originOf(c)!.name}</Chip>
            </Link>
          )),
        )}
      </div>
      <H2><Compass className="size-5 text-primary" /> All destinations</H2>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search destinations or vibes (beach, snow, heritage…)"
          aria-label="Search destinations"
          className="w-full rounded-lg border border-line bg-surface py-2.5 pr-3 pl-9 text-sm outline-none focus:border-primary"
        />
      </div>
      {list.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">{list.map((d) => <GuideCard key={d.id} d={d} />)}</div>
      ) : (
        <p className="text-muted-foreground">No destinations match that search.</p>
      )}
    </Shell>
  );
}

/* ---------------------------------------------------------------- under */
export function UnderList({ amount, city }: { amount: number; city: string }) {
  const o = originOf(city)!;
  const st = guideState({ from: city, budget: amount, days: 4, stretch: false, hideOff: true, scope: "all" });
  const { results } = computeResults(st, {});
  return (
    <Shell>
      <Crumbs items={[["Home", "/"], ["Travel guides", "/guides"], [`Under ${fmt(amount)} from ${o.name}`]]} />
      <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] leading-tight font-medium tracking-tight">Trips under {fmt(amount)} from {o.name}</h1>
      <p className="mt-3 max-w-[64ch] text-muted-foreground">
        {results.length} destinations fit {fmt(amount)} per person for a 4-day trip in {MONTHS[st.month - 1]} (travelling as a pair, budget stay, best-value transport).
      </p>
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {results.map((r) => {
          const I = iconByName(r.mode!.icon);
          return <GuideCard key={r.d.id} d={r.d} sub={<span className="flex items-center gap-1.5">{fmt(r.cost.total)} · <I className="size-3.5" /> {hrsLabel(r.mode!.hrs)}</span>} />;
        })}
      </div>
      {!results.length && <p className="text-muted-foreground">Nothing fits that budget in this month.</p>}
      <Button asChild className="mt-8 rounded-lg"><Link href={`/#from=${city}&budget=${amount}&days=4`}>Open in planner with filters <ArrowRight /></Link></Button>
    </Shell>
  );
}

/* --------------------------------------------------------------- detail */
const Stat = ({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) => (
  <div className="rounded-xl border border-line bg-surface p-4">
    <small className="block text-xs text-muted-foreground">{label}</small>
    <b className="flex items-center gap-1.5 text-xl tabular-nums">{children}</b>
    {sub && <small className="text-xs text-muted-foreground">{sub}</small>}
  </div>
);

const TIERS = [
  ["hostel", "Backpacker", "Hostel beds & dorms"],
  ["budget", "Budget", "Simple private rooms"],
  ["mid", "Comfort", "3★–4★ hotels"],
  ["luxury", "Luxury", "Resorts & premium stays"],
] as const;

const GROUP_LABEL: Record<string, string> = { friends: "Friends", couple: "Couples", family: "Families", solo: "Solo travellers" };

function packList(d: Destination): string[] {
  const base = ["Phone + power bank", "Photo ID", "Reusable water bottle", "Basic medicines & first-aid", "Comfortable walking shoes"];
  const by: Record<string, string[]> = {
    beach: ["Sunscreen & sunglasses", "Swimwear & quick-dry towel", "Flip-flops", "Light cotton clothes", "Waterproof phone pouch"],
    desert: ["Sunscreen & sunglasses", "Scarf or cap for dust and sun", "Light layers + a jacket for cold nights", "Moisturiser & lip balm"],
    high: ["Thermals & down jacket", "SPF 50 sunscreen & UV sunglasses", "Lip balm & moisturiser", "Gloves, cap & woollen socks", "Altitude-sickness medicine (ask a doctor)", "Some cash: ATMs are rare"],
    hill: ["Warm layers & a jacket", "Rain jacket or umbrella", "Grippy shoes", "Woollen cap for evenings"],
    plain: ["Breathable cotton clothes", "Sunscreen & cap", "Modest outfits for temples & mosques", "Hand sanitiser & wet wipes"],
    gulf: ["Light clothes + one warm layer for AC", "Sunscreen", "Modest outfits for mosques & old quarters"],
    trop: ["Light, quick-dry clothes", "Umbrella or poncho", "Mosquito repellent", "Sunscreen"],
  };
  const extra = d.intl ? ["Passport (6+ months valid)", "Visa / e-visa printouts", "Forex card + some cash", "Travel insurance", "Travel eSIM or roaming pack"] : [];
  return [...(by[d.clim] ?? []), ...base, ...extra];
}

const NAV = [
  ["overview", "Overview"], ["sights", "Sights"], ["when", "When to go"], ["reach", "Getting there"], ["cost", "Costs"],
  ["stay", "Where to stay"], ["plan", "Itinerary"], ["food", "Food"], ["tips", "Tips"], ["faq", "FAQ"], ["pack", "Packing"],
] as const;

const Sec = ({ id, title, icon: I, children }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-28">
    <H2><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><I className="size-4" /></span>{title}</H2>
    {children}
  </section>
);

export function GuideDetail({ d, nowMonth }: { d: Destination; nowMonth: number }) {
  const homeCity = useTrip((s) => s.S.from);
  const [from, setFrom] = useState(homeCity);
  const [days, setDays] = useState(4);
  const st = guideState({ from, days, month: d.best[0] });
  const ev = evaluate(st, d);
  const o = originOf(from)!;
  const cheap = (n: number) => evaluate(guideState({ from, days: n, month: d.best[0], stay: "budget" }), d).cost.total;
  const tierCost = (t: (typeof TIERS)[number][0]) => evaluate(guideState({ from, days, month: d.best[0], stay: t }), d).cost.total;
  const plan = useMemo(() => itinerary(st, ev), [from, days, d.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [live, setLive] = useState<DayPlan[] | null>(null);
  const more = DESTINATIONS.filter((x) => x.id !== d.id && x.tags.some((t) => d.tags.includes(t))).slice(0, 4);
  const c = guideContent(d.id);
  const nav = NAV.filter(([id]) => c || !["stay", "sights", "faq"].includes(id));
  const ModeIcon = ev.mode ? iconByName(ev.mode.icon) : null;
  const bestLabel = d.best.length ? `${MONTHS[d.best[0] - 1].slice(0, 3)} – ${MONTHS[d.best[d.best.length - 1] - 1].slice(0, 3)}` : "Year-round";
  const NowIcon = iconByName(weather(d, nowMonth).icon);
  const facts: [string, string][] = [
    ["Best months", bestLabel],
    ["Ideal for", d.for.map((g) => GROUP_LABEL[g] ?? g).join(", ")],
    ["Terrain & climate", { beach: "Beach & coast", desert: "Desert", gulf: "Hot desert city", high: "High altitude", hill: "Hill station", plain: "Plains & cities", trop: "Tropical" }[d.clim]],
    ["Nearest railway", d.rail == null ? "Not practical" : d.rail === 0 ? "In the destination" : `~${d.rail} km by road`],
    ["Nearest airport", d.air == null ? "Not practical" : d.air === 0 ? "In the destination" : `~${d.air} km by road`],
    ["Local transport", `~${fmt(d.local)} per vehicle / day`],
    ["Kids", d.noKids ? "Not recommended" : d.kids ? "Kid-friendly" : "Fine for older kids"],
    ["Difficulty", d.easy ? "Easy, low-effort trip" : "Some planning or effort needed"],
  ];
  if (d.intl) facts.push(["Visa", d.visa ?? "Check requirements"]);

  return (
    <Shell>
      <Crumbs items={[["Home", "/"], ["Travel guides", "/guides"], [d.name]]} />

      <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-primary/15 via-surface to-surface p-6 sm:p-8">
        <DestPhoto d={d} className="-mx-6 -mt-6 mb-5 h-44 sm:-mx-8 sm:-mt-8 sm:h-64" />
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-surface-2"><DestIcon d={d} className="size-9" /></span>
          <div className="min-w-0">
            <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] leading-tight font-medium tracking-tight">{d.name} travel guide</h1>
            <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" /> {d.state}{d.country ? `, ${d.country}` : ""} · <Star className="size-4 fill-current text-warn" /> {d.rating} · <NowIcon className="size-4" /> {weather(d, nowMonth).label} in {MONTHS[nowMonth - 1]}
            </p>
          </div>
        </div>
        <p className="mt-4 max-w-[68ch] text-[15px]">{d.desc}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {d.tags.map((t) => <span key={t} className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium capitalize">{t}</span>)}
          {d.offbeat && <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Offbeat</span>}
        </div>
      </div>

      <SectionNav items={nav} className="sticky top-[68px] z-10 -mx-4 mt-4 bg-background/90 px-4 py-2 backdrop-blur" />

      <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-[200px_160px_auto]">
        <label><span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">Starting from</span><Dropdown label="Starting from" value={from} onChange={setFrom} options={originOptions} triggerClassName="border-transparent bg-surface-2" /></label>
        <label><span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">Trip length</span><Dropdown label="Trip length" value={String(days)} onChange={(v) => setDays(Number(v))} options={[2, 3, 4, 5, 7, 10].map((n) => ({ v: String(n), label: `${n} days` }))} triggerClassName="border-transparent bg-surface-2" /></label>
        <Button asChild className="h-10 rounded-lg"><Link href={`/#from=${from}&days=${days}&trip=${d.id}`}>Plan this trip <ArrowRight /></Link></Button>
      </div>

      <Sec id="overview" title="At a glance" icon={Compass}>
        {c && <div className="mb-6"><GuideStory c={c} /></div>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">{k}</span><b className="text-right font-semibold">{v}</b>
            </div>
          ))}
        </div>
        <h3 className="mt-6 mb-2 text-sm font-semibold">Top things to do</h3>
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {d.hl.map((x, i) => (
            <li key={x} className="flex gap-3 rounded-xl border border-line bg-surface p-3 text-[13px]">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>{x}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted-foreground"><b className="text-foreground">Nearby:</b> {d.near}</p>
      </Sec>

      {c && <Sec id="sights" title="Places to see" icon={MapPin}><GuideSights c={c} name={d.name} /></Sec>}

      <Sec id="when" title="Weather & best time to visit" icon={CalendarDays}>
        <h3 className="mb-2 text-sm font-semibold">Live forecast for {d.name}</h3>
        <WeatherForecast lat={d.lat} lng={d.lng} name={d.name} days={10} className="mb-6" />
        <h3 className="mb-2 text-sm font-semibold">Typical weather by month</h3>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {MONTHS.map((m, i) => {
            const w = weather(d, i + 1);
            const W = iconByName(w.icon);
            const best = d.best.includes(i + 1), avoid = d.avoid.includes(i + 1);
            return (
              <div key={m} className={cn("rounded-xl border p-2.5 text-center", best ? "border-good/50 bg-good/15" : avoid ? "border-bad/50 bg-bad/15" : "border-line bg-surface")}>
                <div className="text-xs font-bold">{m.slice(0, 3)}</div>
                <W className="mx-auto my-1 size-4 text-muted-foreground" />
                <div className="text-[10px] text-muted-foreground">{w.label}</div>
                <div className={cn("mt-0.5 text-[10px] font-semibold", best ? "text-good" : avoid ? "text-bad" : "text-muted-foreground")}>{best ? "Best" : avoid ? "Avoid" : "OK"}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Best months mean good weather and peak-season prices; avoid months mean heavy rain, extreme heat or cold, or closures.</p>
      </Sec>

      <Sec id="reach" title={`Getting there from ${o.name}`} icon={Plane}>
        {ev.opts.length ? (
          <div className="space-y-2">
            {ev.opts.map((x) => {
              const I = iconByName(x.icon);
              return (
                <div key={x.mode} className={cn("flex items-center gap-3 rounded-xl border p-3", ev.mode?.mode === x.mode ? "border-primary bg-primary/10" : "border-line bg-surface")}>
                  <I className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{x.name}{ev.mode?.mode === x.mode && <span className="ml-2 text-[11px] font-medium text-primary">Best value</span>}</div>
                    <div className="text-xs text-muted-foreground">{hrsLabel(x.hrs)} one way · {x.note}</div>
                  </div>
                  <div className="text-right text-sm font-bold tabular-nums">{fmt(x.cost)}<small className="block text-[10px] font-normal text-muted-foreground">return / person</small></div>
                </div>
              );
            })}
          </div>
        ) : <p className="text-muted-foreground">Too close to this destination to need long-distance travel.</p>}
      </Sec>

      <Sec id="cost" title="What it costs" icon={Wallet}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {ev.mode ? (
            <>
              <Stat label={`${days}-day trip, per person`}>{fmt(ev.cost.total)}</Stat>
              <Stat label="Getting there (return)" sub={`${hrsLabel(ev.mode.hrs)} one way`}>{ModeIcon && <ModeIcon className="size-5 text-primary" />}{fmt(ev.cost.travel)}</Stat>
              <Stat label="Stay per person / night">{fmt(ev.cost.stay / ev.cost.nights)}</Stat>
              <Stat label="Food per person / day">{fmt(d.food)}</Stat>
            </>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Estimates based on typical prices, reviewed {DATA_UPDATED}. Live fares and room rates change daily: confirm before booking. <Link href="/terms" className="underline underline-offset-2 hover:text-primary">Details</Link></p>
        <h3 className="mt-6 mb-2 text-sm font-semibold">By travel style ({days} days, per person)</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {TIERS.map(([t, label, sub]) => (
            <div key={t} className="rounded-xl border border-line bg-surface p-4">
              <small className="block text-xs text-muted-foreground">{label}</small>
              <b className="text-lg tabular-nums">{ev.mode ? fmt(tierCost(t)) : "—"}</b>
              <small className="block text-[11px] text-muted-foreground">{sub}</small>
            </div>
          ))}
        </div>
        <h3 className="mt-6 mb-2 text-sm font-semibold">By trip length (budget stay)</h3>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2.5">Length</th><th className="px-4 py-2.5">Per person</th></tr></thead>
            <tbody>{[2, 3, 4, 5, 7].map((n) => <tr key={n} className="border-t border-line"><td className="px-4 py-2.5">{n} days</td><td className="px-4 py-2.5 tabular-nums">{ev.mode ? fmt(cheap(n)) : "—"}</td></tr>)}</tbody>
          </table>
        </div>
      </Sec>

      {c && <Sec id="stay" title="Where to stay" icon={Bed}><GuideAreas c={c} name={d.name} /></Sec>}

      <Sec id="plan" title={`${days}-day itinerary`} icon={Route}>
        {c ? <CuratedPlan c={c} days={days} /> : <EditableItinerary base={plan} storeKey={editKey(d.id, from, days)} onChange={setLive} />}
        {!c && <TripExport days={live ?? plan} destName={d.name} month={d.best[0]} doc={{
          title: `${d.name} trip plan`,
          subtitle: `${originOf(from)?.name ?? "Home"} to ${d.name} · ${days} days · ${MONTHS[d.best[0] - 1]}`,
          facts: [
            ["Per person", fmt(ev.cost.total)],
            ["Getting there", ev.mode ? `${ev.mode.name}, ~${hrsLabel(ev.mode.hrs)}` : "Local"],
            ["Best months", bestLabel],
            ["Rating", `${d.rating} / 5`],
          ],
          eat: d.eat, tips: d.tips, skip: d.skip, link: typeof location === "undefined" ? undefined : location.href,
        }} />}
      </Sec>

      <Sec id="food" title="What to eat" icon={Utensils}>
        {c ? <GuideFood c={c} name={d.name} /> : <DishCards d={d} />}
      </Sec>

      <Sec id="tips" title="Pro tips & what to skip" icon={Lightbulb}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-good/40 bg-good/5 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Check className="size-4 text-good" /> Do this</h3>
            <ul className="space-y-2 text-[13px] text-muted-foreground">{d.tips.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-good" />{x}</li>)}</ul>
          </div>
          <div className="rounded-xl border border-bad/40 bg-bad/5 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Ban className="size-4 text-bad" /> Skip this</h3>
            <ul className="space-y-2 text-[13px] text-muted-foreground">{d.skip.map((x) => <li key={x} className="flex gap-2"><Ban className="mt-0.5 size-3.5 shrink-0 text-bad" />{x}</li>)}</ul>
          </div>
        </div>
      </Sec>

      {c && <Sec id="faq" title="Getting around, safety & FAQ" icon={HelpCircle}><GuideMore c={c} /></Sec>}

      <Sec id="pack" title="What to pack" icon={Backpack}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {packList(d).map((x) => <div key={x} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[13px]"><Check className="size-3.5 text-primary" />{x}</div>)}
        </div>
      </Sec>

      <div className="mt-10 rounded-2xl border border-primary/40 bg-primary/10 p-6 text-center">
        <h3 className="text-lg font-semibold">Ready for {d.name}?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Get live fares, stay links and a shareable plan for your dates.</p>
        <Button asChild className="mt-4 rounded-lg"><Link href={`/#from=${from}&days=${days}&trip=${d.id}`}>Plan this trip <ArrowRight /></Link></Button>
      </div>

      <H2>More guides you may like</H2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">{more.map((x) => <GuideCard key={x.id} d={x} />)}</div>
    </Shell>
  );
}
