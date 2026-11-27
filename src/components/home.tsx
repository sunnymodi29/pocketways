"use client";

import {
  ArrowRight,
  BookOpen,
  Dices,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { forwardRef, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { VIBES } from "@/lib/data";
import {
  MONTHS,
  fmt,
  hrsLabel,
  originOf,
  type Result,
  type Stats,
} from "@/lib/engine";
import { iconByName } from "@/lib/icons";
import { waUrl } from "@/lib/links";
import { useTrip } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Chip, DestIcon, Dropdown, Num, Tag, VibeIcon } from "./kit";
import { originOptions } from "./filters-panel";
import { InstallButton } from "./install";
import { WhatsAppIcon } from "./brand-icons";

const BUDGETS = [
  5000, 10000, 15000, 25000, 50000, 100000, 200000, 500000, 1000000,
];
const budgetOptions = BUDGETS.map((v) => ({
  v: String(v),
  label: "₹" + v.toLocaleString("en-IN"),
}));
const dayOptions = [2, 3, 4, 5, 7, 10].map((n) => ({
  v: String(n),
  label: String(n),
}));

/** One cell of the search bar: small label over a borderless dropdown, with a divider that hides on hover. */
function SbField({
  label,
  last,
  className,
  children,
}: {
  label: string;
  last?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group/sb relative flex min-w-0 cursor-pointer flex-col justify-center gap-px rounded-xl px-3.5 py-2 transition-colors duration-200 ease-out hover:bg-foreground/[0.09] sm:px-[18px] sm:py-2.5 has-[:focus-visible]:bg-foreground/[0.09] has-[[data-state=open]]:bg-foreground/[0.09]",
        !last &&
          "after:absolute after:top-4 after:-right-[3px] after:bottom-4 after:w-px after:bg-line after:transition-opacity after:duration-200 hover:after:opacity-0 max-[1100px]:after:hidden",
        className,
      )}
    >
      <span className="text-[11px] font-normal text-muted-foreground transition-colors duration-200 sm:text-[12px] group-hover/sb:text-foreground group-has-[[data-state=open]]/sb:text-primary">
        {label}
      </span>
      {children}
    </div>
  );
}
const sbTrigger =
  "h-7 rounded-md border-0 bg-transparent px-0 py-0.5 text-[15px] font-medium sm:h-9 hover:border-0 data-[state=open]:border-0 [&_svg]:transition-colors group-hover/sb:[&_svg]:text-primary";

export const Hero = forwardRef<
  HTMLElement,
  {
    results: Result[];
    stats: Stats;
    onFind: () => void;
    onOpen: (id: string) => void;
    leaving: boolean;
  }
>(function Hero({ results, stats, onFind, onOpen, leaving }, ref) {
  const S = useTrip((s) => s.S);
  const set = useTrip((s) => s.set);
  const [busy, setBusy] = useState(false);
  const o = originOf(S.from)!;
  const moods = S.vibes
    .map((v) => VIBES.find((x) => x.id === v)?.label)
    .filter(Boolean)
    .join(", ");
  const budgetValue = BUDGETS.includes(S.budget)
    ? String(S.budget)
    : String(
        BUDGETS.reduce((a, b) =>
          Math.abs(b - S.budget) < Math.abs(a - S.budget) ? b : a,
        ),
      );

  const find = () => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      onFind();
      setBusy(false);
    }, 320);
  };
  const surprise = () => {
    if (!results.length) return toast("Nothing fits yet. Try a bigger budget");
    const pool = results.slice(0, Math.min(8, results.length));
    onOpen(pool[Math.floor(Math.random() * pool.length)].d.id);
  };
  // staggered entrance, like the original
  const rise = (i: number) => ({ animationDelay: `${i * 0.04}s` });

  return (
    <section
      ref={ref}
      className={cn(
        "fixed z-30 flex flex-col [&>*]:shrink-0 transition-all duration-500 ease-[var(--ease)]",
        "inset-x-3 bottom-3 max-h-[calc(100dvh-88px)] overflow-y-auto rounded-2xl border border-line bg-surface p-3 sm:p-4",
        "min-[1101px]:inset-x-auto min-[1101px]:top-[100px] min-[1101px]:[@media(max-height:860px)]:top-[84px] min-[1101px]:bottom-auto min-[1101px]:left-8 min-[1101px]:max-h-[calc(100dvh-116px)] min-[1101px]:w-[min(700px,calc(100vw-64px))] min-[1101px]:overflow-visible min-[1101px]:border-transparent min-[1101px]:bg-transparent min-[1101px]:p-0",
        leaving && "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <h1
        style={rise(0)}
        className="tw-rise mb-2.5 border-l-[3px] border-primary pl-3 text-[clamp(1.5rem,7.4vw,2.2rem)] leading-[1.08] sm:mb-3 sm:border-l-4 sm:pl-[14px] sm:text-[clamp(2.2rem,9.5vw,4.4rem)] sm:leading-[1.04] font-medium tracking-normal uppercase min-[1101px]:mb-[18px] min-[1101px]:pl-[18px] min-[1101px]:text-[clamp(36px,min(5.6vw,10vh),84px)] [@media(max-height:860px)]:mb-3"
      >
        Plan your
        <br />
        next trip
      </h1>
      <p
        style={rise(1)}
        className="tw-rise mb-5 hidden [@media(max-height:860px)]:!hidden max-w-[520px] text-[17px] leading-[1.55] font-light text-muted-foreground min-[640px]:block"
      >
        Set your city, budget and days. Pocketways shows where you can go, what it
        costs, and a day-by-day plan.
      </p>

      <div
        role="search"
        style={rise(2)}
        className="tw-rise grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1.5 min-[1101px]:grid-cols-[1.15fr_1.05fr_.65fr_auto]"
      >
        <SbField label="From" className="col-span-2 min-[1101px]:col-span-1">
          <Dropdown
            label="From"
            value={S.from}
            onChange={(v) => set({ from: v })}
            options={originOptions}
            triggerClassName={sbTrigger}
          />
        </SbField>
        <SbField label="Budget per person">
          <Dropdown
            label="Budget per person"
            value={budgetValue}
            onChange={(v) => set({ budget: Number(v), budgetMode: "pp" })}
            options={budgetOptions}
            triggerClassName={sbTrigger}
          />
        </SbField>
        <SbField label="Days" last>
          <Dropdown
            label="Days"
            value={String(S.days)}
            onChange={(v) => set({ days: Number(v) })}
            options={dayOptions}
            triggerClassName={sbTrigger}
          />
        </SbField>
        <button
          type="button"
          onClick={find}
          disabled={busy}
          className="group/go col-span-2 flex h-11 items-center justify-center gap-2.5 rounded-xl bg-primary px-5 text-[16px] leading-none sm:h-12 sm:gap-3 sm:px-6 sm:text-[19px] font-bold tracking-[0.01em] text-primary-foreground transition-colors duration-200 hover:bg-primary-2 disabled:pointer-events-none disabled:opacity-90 min-[1101px]:col-span-1 min-[1101px]:h-auto! min-[1101px]:min-w-[176px] min-[1101px]:text-[19px]"
        >
          {busy ? (
            <Loader2 className="tw-spin size-[21px]" strokeWidth={2.4} />
          ) : (
            <Search
              className="size-[21px] transition-transform duration-200 ease-out group-hover/go:-translate-px group-hover/go:-rotate-[14deg]"
              strokeWidth={2.4}
            />
          )}
          <span>{busy ? "Searching" : "Find trips"}</span>
        </button>
      </div>

      <div
        role="group"
        aria-label="What are you in the mood for"
        style={rise(3)}
        className="tw-rise mt-3 flex items-center gap-1.5 tw-noscroll overflow-x-auto pb-0.5 sm:mt-4 sm:gap-2 sm:pb-1 min-[1101px]:flex-wrap min-[1101px]:overflow-visible"
      >
        <span className="mr-1 hidden shrink-0 text-[13px] text-muted-foreground sm:inline">
          In the mood for
        </span>
        {VIBES.slice(0, 8).map((v, i) => (
          <Chip
            key={v.id}
            on={S.vibes.includes(v.id)}
            className={cn("py-[6px] pr-[11px] pl-[9px] text-[12.5px] sm:py-[7px] sm:pr-[13px] sm:pl-[11px] sm:text-[13px] [&_svg]:size-[14px] sm:[&_svg]:size-[15px]", i > 4 && "[@media(max-height:860px)]:hidden")}
            onClick={() =>
              set({
                vibes: S.vibes.includes(v.id)
                  ? S.vibes.filter((x) => x !== v.id)
                  : [...S.vibes, v.id],
              })
            }
          >
            <VibeIcon id={v.id} /> {v.label}
          </Chip>
        ))}
      </div>

      <div
        aria-live="polite"
        style={rise(4)}
        className="tw-rise mt-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 sm:mt-4 sm:rounded-2xl sm:px-[18px] sm:py-4 [@media(max-height:860px)]:sm:mt-3 [@media(max-height:860px)]:sm:py-3"
      >
        <p className="flex items-baseline gap-2 text-[15px] sm:gap-2.5 sm:text-[17px]">
          <b className="min-w-[1.3ch] text-2xl leading-none font-bold text-primary sm:text-4xl">
            <Num value={results.length} ms={450} />
          </b>
          <span>
            {results.length === 1 ? "trip fits" : "trips fit"} your budget
          </span>
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground sm:mt-1.5 sm:mb-3 sm:text-[13px]">
          {results.length
            ? `From ${o.name} · ${S.days} days · ${MONTHS[S.month - 1]}${moods ? " · " + moods : ""}`
            : stats.budget && isFinite(stats.cheapestHidden)
              ? `Nothing fits yet. The cheapest trip starts at ${fmt(stats.cheapestHidden)} per person.`
              : "Try fewer moods, or more days."}
        </p>
        <div className="hidden flex-wrap gap-2 sm:flex [@media(max-height:860px)]:hidden">
          {results.slice(0, 3).map((r) => (
            <button
              key={r.d.id}
              type="button"
              onClick={() => onOpen(r.d.id)}
              className="inline-flex items-center gap-2.5 rounded-lg border border-transparent bg-surface-2 py-[7px] pr-3.5 pl-[7px] font-medium transition-colors duration-200 hover:border-primary"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-surface text-primary">
                <DestIcon d={r.d} className="size-[17px]" />
              </span>
              <span>{r.d.name.split(" & ")[0]}</span>
              <span className="font-bold text-primary tabular-nums">
                {fmt(r.cost.total)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        style={rise(5)}
        className="tw-rise mt-3 flex gap-2 tw-noscroll sm:mt-[22px] sm:gap-2.5 [@media(max-height:860px)]:sm:mt-3 overflow-x-auto pb-1 min-[1101px]:flex-wrap min-[1101px]:overflow-visible [&>*]:shrink-0"
      >
        {[
          <button key="s" type="button" onClick={surprise}>
            <Dices /> Surprise me
          </button>,
          <Link key="g" href="/guides">
            <BookOpen /> Browse travel guides
          </Link>,
          <button
            key="w"
            type="button"
            onClick={() =>
              window.open(
                waUrl(
                  `Plan a trip on a budget with Pocketways ⬇\n${location.origin}`,
                ),
                "_blank",
                "noopener",
              )
            }
          >
            <WhatsAppIcon /> Share on WhatsApp
          </button>,
        ].map((el) => (
          <span
            key={el.key}
            className="contents [&>*]:inline-flex [&>*]:shrink-0 [&>*]:whitespace-nowrap [&>*]:items-center [&>*]:gap-2 [&>*]:rounded-lg [&>*]:border [&>*]:border-line [&>*]:bg-surface [&>*]:px-3 [&>*]:py-2 [&>*]:text-[12.5px] [&>*]:font-semibold sm:[&>*]:px-4 sm:[&>*]:py-2.5 sm:[&>*]:text-[13.5px] [&>*]:transition-colors [&>*]:duration-200 hover:[&>*]:border-primary [&_svg]:size-4 [&_svg]:text-primary"
          >
            {el}
          </span>
        ))}
        <InstallButton />
      </div>
    </section>
  );
});

/** Card that tours the best trips for the current search while the globe is showing. */
export function Spotlight({
  list,
  index,
  setIndex,
  onOpen,
  onPause,
}: {
  list: Result[];
  index: number;
  setIndex: (n: number) => void;
  onOpen: (id: string) => void;
  onPause: (p: boolean) => void;
}) {
  const r = list[index];
  if (!r) return null;
  const ModeIcon = iconByName(r.mode!.icon);
  const WxIcon = iconByName(r.wx.icon);
  return (
    <aside
      aria-label="Featured trip"
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
      onFocus={() => onPause(true)}
      onBlur={() => onPause(false)}
      className="tw-rise fixed right-[max(28px,4vw)] bottom-[max(32px,7vh)] z-30 hidden w-[330px] [@media(max-height:860px)]:w-[300px] rounded-2xl border border-line bg-surface p-3.5 min-[1101px]:block"
    >
      <div className="mx-0.5 mb-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground">
          <Sparkles className="size-[15px] text-primary" />
          Spotlight
        </span>
        <span className="flex items-center gap-1.5">
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show trip ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-[7px] rounded-full transition-all duration-300 ease-out after:absolute after:-inset-x-1 after:-inset-y-[9px] after:content-['']",
                i === index ? "w-5 bg-primary" : "w-[7px] bg-line",
              )}
            />
          ))}
        </span>
      </div>
      <button
        key={r.d.id}
        type="button"
        onClick={() => onOpen(r.d.id)}
        className="tw-fade group/sp grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 rounded-xl border border-transparent bg-surface-2 p-3 text-left transition-colors duration-200 hover:border-primary"
      >
        <span className="row-span-2 grid size-[46px] place-items-center rounded-lg bg-surface">
          <DestIcon d={r.d} className="size-6" />
        </span>
        <span className="grid">
          <span className="text-lg leading-tight font-semibold">
            {r.d.name}
          </span>
          <span className="text-[12.5px] text-muted-foreground">
            {r.d.state}
          </span>
        </span>
        <span className="col-start-3 row-span-2 grid text-right text-[22px] leading-[1.1] font-bold text-primary">
          {fmt(r.cost.total)}
          <small className="text-[11px] font-normal text-muted-foreground">
            per person
          </small>
        </span>
        <span className="col-span-full mt-2.5 flex flex-wrap gap-1.5 [@media(max-height:860px)]:hidden">
          <Tag>
            <ModeIcon /> {hrsLabel(r.mode!.hrs)}
          </Tag>
          <Tag>
            <WxIcon /> {r.wx.label}
          </Tag>
          {r.season === "peak" && <Tag tone="good">Best season</Tag>}
        </span>
        <span className="col-span-full mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-primary">
          Open this trip{" "}
          <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover/sp:translate-x-1" />
        </span>
      </button>
    </aside>
  );
}

export function useSpotlight(list: Result[], active: boolean) {
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const key = list.map((r) => r.d.id).join();
  useEffect(() => setIndex(0), [key]);
  useEffect(() => {
    if (!active || !list.length) return;
    const t = setInterval(() => {
      if (paused.current || document.hidden) return;
      setIndex((i) => (i + 1) % list.length);
    }, 4200);
    return () => clearInterval(t);
  }, [active, list.length]);
  return { index, setIndex, setPaused: (p: boolean) => (paused.current = p) };
}
