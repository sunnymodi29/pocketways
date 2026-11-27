"use client";

import {
  ArrowLeft, ArrowLeftRight, BookOpen, Ban, Check, Copy, Dices, ExternalLink, Heart, Image as ImageIcon, Info,
  Minus, Plane, Plus, Star, TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  MONTHS, budgetPP, fmt, hrsLabel, itinerary, originOf, type DayPlan, type Result,
} from "@/lib/engine";
import { Lbl, iconByName } from "@/lib/icons";
import { extrasLinks, liveLinks, planText, stayLinks, waUrl } from "@/lib/links";
import { useResults, useTrip, useTripFor } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DishCards } from "./itinerary-view";
import { EditableItinerary } from "./editable-itinerary";
import { editKey } from "@/lib/edits";
import { TripExport } from "./trip-export";
import { DestPhoto } from "./dest-photo";
import { WeatherForecast } from "./weather-forecast";
import { DestIcon, Num, Seg, Stepper, Tag } from "./kit";
import { WhatsAppIcon } from "./brand-icons";

function HeartBtn({ id, className, label }: { id: string; className?: string; label?: boolean }) {
  const on = useTrip((s) => s.saved.some((x) => x.id === id));
  const toggle = useTrip((s) => s.toggleSave);
  return (
    <button
      type="button"
      aria-pressed={on}
      title={on ? "Remove from My trips" : "Save to My trips"}
      aria-label={on ? "Remove from My trips" : "Save to My trips"}
      onClick={(e) => { e.stopPropagation(); toggle(id); }}
      className={cn("grid place-items-center rounded-lg border border-line transition-colors duration-200 hover:border-primary hover:text-primary", on && "border-primary bg-primary text-primary-foreground hover:text-primary-foreground", label ? "h-8 gap-2 px-3 text-[13px] font-medium" : "size-8", className)}
    >
      <span className="flex items-center gap-2"><Heart className={cn("size-4", on && "fill-current")} />{label && (on ? "Saved" : "Save")}</span>
    </button>
  );
}
function CompareBtn({ id, label, className }: { id: string; label?: boolean; className?: string }) {
  const on = useTrip((s) => s.compare.some((c) => c.id === id));
  const toggle = useTrip((s) => s.toggleCompare);
  return (
    <button
      type="button"
      aria-pressed={on}
      title={on ? "Remove from compare" : "Add to compare"}
      aria-label={on ? "Remove from compare" : "Add to compare"}
      onClick={(e) => { e.stopPropagation(); toggle(id); }}
      className={cn("grid place-items-center rounded-lg border border-line transition-colors duration-200 hover:border-primary hover:text-primary", on && "border-primary bg-primary/15 text-primary", label ? "h-8 px-3 text-[13px] font-medium" : "size-8", className)}
    >
      <span className="flex items-center gap-2">{on ? <Check className="size-4" /> : <ArrowLeftRight className="size-4" />}{label && (on ? "Added" : "Compare")}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ list */
export function ResultsList({ onSurprise }: { onSurprise: () => void }) {
  const S = useTrip((s) => s.S);
  const set = useTrip((s) => s.set);
  const select = useTrip((s) => s.select);
  const selectedId = useTrip((s) => s.selectedId);
  const { results, stats } = useResults();
  const o = originOf(S.from)!;
  const raise = isFinite(stats.cheapestHidden) ? Math.ceil(stats.cheapestHidden / 1000) * 1000 : 0;

  const shareList = () => {
    const lines = results.slice(0, 5).map((r, i) => `${i + 1}. ${r.d.name}: ${fmt(r.cost.total)}/person`);
    const text = ["✈ Top trips from " + o.name + " (" + fmt(budgetPP(S)) + "/person, " + S.days + " days):", ...lines, "", "See them ⬇", location.href].join("\n");
    window.open(waUrl(text), "_blank", "noopener");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line px-5">
        <h2 className="text-base font-semibold">
          {results.length ? <><Num value={results.length} ms={500} /> trips for you</> : "No trips yet"}
        </h2>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={onSurprise} title="Pick a random great trip"><Dices /> Surprise me</Button>
          <Button variant="outline" size="icon-sm" className="text-whatsapp hover:border-whatsapp hover:bg-whatsapp/10 hover:text-whatsapp" onClick={shareList} title="Share these trips on WhatsApp" aria-label="Share these trips on WhatsApp"><WhatsAppIcon /></Button>
        </div>
      </div>
      <div className="space-y-2.5 px-5 pt-3 pb-3">
        <p className="text-[13px] text-muted-foreground">From {o.name} · {fmt(budgetPP(S))}/person · {S.days} day{S.days > 1 ? "s" : ""} · {MONTHS[S.month - 1]}</p>
        <Seg
          size="sm"
          value={S.sort}
          onChange={(v) => set({ sort: v })}
          options={[{ v: "match", label: "Best match" }, { v: "cheap", label: "Cheapest" }, { v: "near", label: "Closest" }, { v: "rating", label: "Top rated" }]}
        />
      </div>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 pb-5">
        {!results.length && (
          <div className="rounded-xl border border-dashed border-line p-6 text-center text-[13px] text-muted-foreground">
            <b className="mb-1 block text-base text-foreground">Nothing fits all your filters</b>
            {raise ? (
              <>
                {stats.budget} trip{stats.budget > 1 ? "s" : ""} need a bigger budget. Cheapest starts at <b className="text-foreground">{fmt(stats.cheapestHidden)}</b>/person.
                <div className="mt-4"><Button onClick={() => set({ budget: raise, budgetMode: "pp" })}>Set budget to {fmt(raise)}</Button></div>
              </>
            ) : (
              "Try removing a vibe, allowing longer journeys, or switching off “Hide off-season”."
            )}
          </div>
        )}
        {results.map((r, i) => {
          const over = r.cost.total - budgetPP(S);
          const ModeIcon = iconByName(r.mode!.icon);
          const WxIcon = iconByName(r.wx.icon);
          return (
            <div
              key={r.d.id}
              role="button"
              tabIndex={0}
              data-active={r.d.id === selectedId}
              onClick={() => select(r.d.id)}
              onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); select(r.d.id); } }}
              style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}
              className="tw-bar tw-rise relative flex cursor-pointer gap-3 rounded-xl border border-line bg-surface p-3 transition-colors duration-200 hover:border-primary/60"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2"><DestIcon d={r.d} className="size-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="tw-underline truncate text-base font-semibold">{r.d.name}</span>
                  <span className="text-base font-semibold tabular-nums">{fmt(r.cost.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>{r.d.state}</span><span>per person</span></div>
                <div className="mt-2 flex flex-wrap gap-1.5 pr-[76px]">
                  <Tag tone="match">{r.score}% match</Tag>
                  <Tag><ModeIcon /> {hrsLabel(r.mode!.hrs)}</Tag>
                  <Tag><WxIcon /> {r.wx.label}</Tag>
                  {r.season === "peak" && <Tag tone="good">Best season</Tag>}
                  {r.season === "off" && <Tag tone="bad">Off-season</Tag>}
                  {r.within ? <Tag tone="good">Within budget</Tag> : <Tag tone="warn">{fmt(over)} over</Tag>}
                </div>
              </div>
              <div className="absolute right-3 bottom-3 flex gap-1.5">
                <CompareBtn id={r.d.id} />
                <HeartBtn id={r.d.id} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- detail */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-6">
    <h3 className="mb-2.5 text-sm font-semibold">{title}</h3>
    {children}
  </section>
);

const ExtLink = ({ href, children, sub }: { href: string; children: React.ReactNode; sub: string }) => (
  <a href={href} target="_blank" rel="noopener" className="tw-bar flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-primary/60">
    <div className="min-w-0"><div className="text-sm font-semibold">{children}</div><div className="truncate text-xs text-muted-foreground">{sub}</div></div>
    <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
  </a>
);

export function TripDetail({ onShareCard }: { onShareCard: (id: string) => void }) {
  const id = useTrip((s) => s.selectedId)!;
  const S = useTrip((s) => s.S);
  const set = useTrip((s) => s.set);
  const select = useTrip((s) => s.select);
  const setMode = useTrip((s) => s.setMode);
  const fetchFare = useTrip((s) => s.fetchFare);
  const fares = useTrip((s) => s.fares);
  const fareDisabled = useTrip((s) => s.fareDisabled);
  const r = useTripFor(id);
  useEffect(() => { fetchFare(id); }, [id, S.from, S.month, fetchFare]);
  const [livePlan, setLivePlan] = useState<DayPlan[] | null>(null);
  const days = useMemo(() => (r ? itinerary(S, r) : []), [S, r]);
  if (!r) return null;
  const d = r.d;
  const c = r.cost;
  const over = c.total - budgetPP(S);
  const WxIcon = iconByName(r.wx.icon);
  const k = (() => { const a = S.from, b = d.id; return `${a}-${b}`; })();
  void k;
  const live = r.opts.find((o) => o.live)?.live;
  const loading = Object.values(fares).some((f) => f.status === "loading");
  const parts: [string, number, string][] = [
    ["Travel", c.travel, "#2f5d8a"],
    ["Stay", c.stay, "#f3652f"],
    ["Food", c.food, "#5b8c3a"],
    ["Local transport", c.local, "#a35d3a"],
    ["Activities", c.act, "#d99a1e"],
    [d.intl && !d.visaEasy ? "Visa + misc" : "Buffer (5%)", c.misc, "#9a9288"],
  ];
  const agoLabel = (iso?: unknown) => {
    const h = Math.max(0, (Date.now() - new Date(String(iso)).getTime()) / 36e5);
    return h < 1 ? "just now" : h < 24 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)}d ago`;
  };
  const text = () => planText(S, r, location.href, livePlan ?? undefined);

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      {/* slim bar stays put while the whole panel scrolls, so the content gets the full height */}
      <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b border-line bg-surface/95 px-5 backdrop-blur">
        <button type="button" onClick={() => select(null)} className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="size-4" /> All trips
        </button>
        <span className="min-w-0 truncate text-[13px] font-semibold"><span className="text-muted-foreground">{d.name} · </span><span className="tabular-nums text-primary">{fmt(c.total)}</span></span>
        <HeartBtn id={d.id} label />
      </div>
      <div className="border-b border-line px-5 pt-4 pb-4">
        <DestPhoto d={d} className="mb-3 h-36 rounded-xl" />
        <div className="flex items-center gap-3">
          <DestIcon d={d} className="size-8 shrink-0" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight">{d.name}</h2>
            <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
              {d.state} · <Star className="size-3.5 fill-current text-warn" /> {d.rating} · <WxIcon className="size-3.5" /> {r.wx.label} in {MONTHS[S.month - 1]} · {r.score}% match
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{d.desc}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-primary bg-primary p-3 text-primary-foreground"><div className="text-[11px] text-primary-foreground/85">Per person</div><div className="text-lg font-bold tabular-nums"><Num value={c.total} format={fmt} /></div></div>
          <div className="rounded-xl border border-line bg-surface p-3"><div className="text-[11px] text-muted-foreground">Group of {S.travelers}</div><div className="text-lg font-bold tabular-nums"><Num value={c.total * S.travelers} format={fmt} /></div></div>
          <div className="rounded-xl border border-line bg-surface p-3"><div className="text-[11px] text-muted-foreground">{over <= 0 ? "You save" : "Over budget"}</div><div className={cn("text-lg font-bold tabular-nums", over <= 0 ? "text-good" : "text-warn")}><Num value={Math.abs(over)} format={fmt} /></div></div>
        </div>
      </div>

      <div className="px-5 pt-1 pb-8">
        {r.flags.map((f, i) => (
          <div key={i} className={cn("mt-3 flex items-start gap-2 rounded-xl border p-3 text-[13px]", f.t === "warn" ? "border-warn/40 text-warn" : "border-blue/40 text-blue")}>
            {f.t === "warn" ? <TriangleAlert className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
            <span><Lbl text={f.m} /></span>
          </div>
        ))}

        <Section title="Where your money goes">
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
            {parts.map(([n, v, col]) => <div key={n} style={{ flex: Math.max(v, 1), background: col }} />)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
            {parts.map(([n, v, col]) => (
              <div key={n} className="flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: col }} />{n}<b className="ml-auto tabular-nums">{fmt(v)}</b></div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {c.nights} night{c.nights > 1 ? "s" : ""} · {S.stay === "hostel" ? "hostel beds" : S.stay === "luxury" ? "luxury stays" : S.stay === "mid" ? "3★–4★ hotels" : "budget hotels"} · {r.season === "peak" ? "peak-season pricing" : r.season === "off" ? "off-season discount applied" : "regular pricing"}
          </p>
        </Section>

        <Section title="Weather forecast">
          <WeatherForecast lat={d.lat} lng={d.lng} name={d.name} days={7} />
        </Section>

        <Section title="How to get there">
          <div className="space-y-2">
            {r.opts.length ? r.opts.map((o) => {
              const I = iconByName(o.icon);
              const on = r.mode?.mode === o.mode;
              return (
                <button key={o.mode} type="button" onClick={() => setMode(d.id, o.mode)} aria-pressed={on}
                  className={cn("tw-bar flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors", on ? "border-primary bg-primary/10" : "border-line bg-surface hover:border-primary/60")} data-active={on}>
                  <I className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                      {o.name}
                      {o.live ? <Tag tone="good">{o.live.mock ? "DEMO" : "LIVE"}</Tag> : o.mode === "flight" && loading ? <Tag>checking live fare…</Tag> : o.mode === "flight" && !fareDisabled ? <Tag>estimate</Tag> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{hrsLabel(o.hrs)} one way · {o.note}{o.live ? ` · updated ${agoLabel(o.live.fetched_at)}` : ""}</div>
                  </div>
                  <div className="text-right text-sm font-bold tabular-nums">{fmt(o.cost)}<small className="block text-[10px] font-normal text-muted-foreground">return / person</small></div>
                </button>
              );
            }) : <p className="text-sm text-muted-foreground">Too close to need long-distance travel.</p>}
          </div>
        </Section>

        <Section title="Check live prices">
          {live?.link && (
            <Button asChild className="mb-2.5 w-full"><a href={String(live.link)} target="_blank" rel="noopener sponsored"><Plane /> Book this fare · {fmt(live.price)} return</a></Button>
          )}
          <div className="flex flex-wrap gap-2">
            {liveLinks(S, d).map(([l, h]) => (
              <Button key={l} asChild variant="outline" size="sm" className="rounded-lg"><a href={h} target="_blank" rel="noopener"><Lbl text={l} className="size-4" /></a></Button>
            ))}
          </div>
        </Section>

        <Section title="Where to stay">
          <div className="space-y-2">
            {stayLinks(S, d).map(([l, site, h]) => <ExtLink key={l + site} href={h} sub={`Live prices on ${site}`}><Lbl text={l} className="mr-2 inline size-4 text-primary" /></ExtLink>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Your plan budgets about {fmt(c.stay / c.nights)} per person per night for stay.</p>
        </Section>

        <Section title="Things to do & travel extras">
          <div className="space-y-2">
            {extrasLinks(d).map(([l, sub, h]) => <ExtLink key={l} href={h} sub={sub}><Lbl text={l} className="mr-2 inline size-4 text-primary" /></ExtLink>)}
          </div>
        </Section>

        <Section title={`Your ${S.days}-day itinerary`}>
          <EditableItinerary base={days} storeKey={editKey(d.id, S.from, S.days)} onChange={setLivePlan} />
          <TripExport days={livePlan ?? days} destName={d.name} month={S.month} doc={{
            title: `${d.name} trip plan`,
            subtitle: `${originOf(S.from)?.name ?? "Home"} to ${d.name} · ${S.days} days · ${MONTHS[S.month - 1]} · ${S.travelers} ${S.travelers === 1 ? "traveller" : "travellers"}`,
            facts: [
              ["Per person", fmt(c.total)],
              [`Group of ${S.travelers}`, fmt(c.total * S.travelers)],
              ["Getting there", r.mode ? `${r.mode.name}, ~${hrsLabel(r.mode.hrs)}` : "Local"],
              ["Weather", `${r.wx.label} in ${MONTHS[S.month - 1]}`],
            ],
            eat: d.eat, tips: d.tips, skip: d.skip, link: location.href,
          }} />
        </Section>

        <Section title="Must eat">
          <DishCards d={d} />
        </Section>
        <Section title="Pro tips">
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">{d.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </Section>
        <Section title="Avoid this">
          <ul className="space-y-1 text-[13px] text-muted-foreground">{d.skip.map((t) => <li key={t} className="flex gap-2"><Ban className="mt-0.5 size-3.5 shrink-0 text-bad" />{t}</li>)}</ul>
        </Section>

        <Section title="Split with friends">
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-sm"><span>How many people?</span><div className="w-32"><Stepper label="people" value={S.travelers} min={1} max={20} onChange={(v) => set({ travelers: v })} /></div></div>
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm"><span>Each person pays</span><b className="tabular-nums">{fmt(c.total)}</b></div>
            <div className="mt-1 flex justify-between text-sm"><span>Total trip cost</span><b className="tabular-nums">{fmt(c.total * S.travelers)}</b></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button className="rounded-lg bg-whatsapp text-[#04321a] hover:bg-whatsapp/85" onClick={() => window.open(waUrl(text()), "_blank", "noopener")}><WhatsAppIcon /> Share on WhatsApp</Button>
            <Button variant="outline" className="rounded-lg" onClick={async () => { try { await navigator.clipboard.writeText(text()); toast("Plan copied! Paste it anywhere"); } catch { toast("Couldn't copy. Select & copy manually"); } }}><Copy /> Copy plan &amp; link</Button>
            <Button variant="outline" className="rounded-lg" onClick={() => onShareCard(d.id)}><ImageIcon /> Share card</Button>
            <CompareBtn id={d.id} label className="h-9" />
            <Button asChild variant="outline" className="rounded-lg"><Link href={`/guides/${d.id}`}><BookOpen /> Full guide</Link></Button>
          </div>
        </Section>
        <p className="mt-6 text-xs text-muted-foreground">Fares marked LIVE are the cheapest round trip per adult found for that month; everything else is an estimate based on typical {new Date().getFullYear()} costs and distances. Always confirm prices before booking.</p>
      </div>
    </div>
  );
}

export type { Result };
export { HeartBtn, CompareBtn, Minus, Plus };
