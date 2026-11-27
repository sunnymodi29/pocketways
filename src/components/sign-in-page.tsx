"use client";

import { ArrowDown, ArrowUp, Check, Heart, Plus, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { destOf } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { useAccount } from "@/lib/use-account";
import { GoogleCalendarIcon, GoogleIcon } from "./brand-icons";
import { Header } from "./header";
import { DestIcon, Seg } from "./kit";
import { SiteFooter } from "./site-footer";
import { WELCOME_KEY } from "./sign-in";

/** Only same-site paths are allowed as the place to return to. */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

/* ---------------------------------------------------------------- demos */
const TRIP_IDS = ["goa", "manali", "udaipur"] as const;

function SaveDemo() {
  const [saved, setSaved] = useState<string[]>([]);
  const toggle = (id: string) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
      <div className="rounded-2xl border border-line bg-surface p-3">
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">On your phone</p>
        <ul className="space-y-1.5">
          {TRIP_IDS.map((id) => {
            const d = destOf(id)!;
            const on = saved.includes(id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 p-2">
                <DestIcon d={d} className="size-4 shrink-0" />
                <span className="flex-1 truncate text-[13px] font-medium">{d.name}</span>
                <button type="button" aria-pressed={on} aria-label={on ? `Remove ${d.name}` : `Save ${d.name}`} onClick={() => toggle(id)}
                  className={cn("grid size-7 place-items-center rounded-md border transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-line hover:border-primary hover:text-primary")}>
                  <Heart className={cn("size-3.5", on && "fill-current")} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="grid h-full place-items-center">
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors", saved.length ? "border-good/40 bg-good/15 text-good" : "border-line text-muted-foreground")}>
          {saved.length ? "Synced" : "Tap a heart"}
        </span>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-3">
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">On your laptop</p>
        <ul className="min-h-[104px] space-y-1.5">
          {saved.length === 0 && <li className="rounded-lg border border-dashed border-line p-3 text-center text-xs text-muted-foreground">My trips is empty</li>}
          {saved.map((id) => {
            const d = destOf(id)!;
            return (
              <li key={id} className="tw-rise flex items-center gap-2 rounded-lg bg-surface-2/60 p-2">
                <DestIcon d={d} className="size-4 shrink-0" />
                <span className="flex-1 truncate text-[13px] font-medium">{d.name}</span>
                <Heart className="size-3.5 fill-current text-primary" />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const STOPS = ["Fort Aguada at sunset", "Anjuna flea market", "Dinner: Goan fish thali"];
function EditDemo() {
  const [order, setOrder] = useState<string[]>(STOPS);
  const edited = order.join() !== STOPS.join();
  const move = (i: number, dir: -1 | 1) => setOrder((o) => {
    const j = i + dir;
    if (j < 0 || j >= o.length) return o;
    const n = o.slice();
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  const own = "Beach shack with friends";
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Day 2 · Goa</p>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors", edited ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-muted-foreground")}>
          {edited ? "Edited by you, saved" : "Try moving a stop"}
        </span>
      </div>
      <ul className="space-y-1.5">
        {order.map((s, i) => (
          <li key={s} className="flex items-center gap-2 rounded-lg bg-surface-2/60 p-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface text-[10px] font-bold text-primary">{i + 1}</span>
            <span className="flex-1 truncate text-[13px]">{s}</span>
            <button type="button" aria-label={`Move ${s} up`} disabled={i === 0} onClick={() => move(i, -1)} className="grid size-6 place-items-center rounded-md text-muted-foreground hover:text-primary disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
            <button type="button" aria-label={`Move ${s} down`} disabled={i === order.length - 1} onClick={() => move(i, 1)} className="grid size-6 place-items-center rounded-md text-muted-foreground hover:text-primary disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
          </li>
        ))}
      </ul>
      <button type="button" disabled={order.includes(own)} onClick={() => setOrder((o) => [...o, own])}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
        <Plus className="size-3.5" /> {order.includes(own) ? "Added your own stop" : "Add my own stop"}
      </button>
    </div>
  );
}

const DAYS = ["Arrive and settle in", "Beaches and markets", "Old Goa and sunset", "Last morning, head home"];
function CalendarDemo() {
  const [added, setAdded] = useState(false);
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"><GoogleCalendarIcon className="size-4" /> Google Calendar</p>
        {added && <button type="button" onClick={() => setAdded(false)} className="text-xs font-medium text-muted-foreground hover:text-primary">Try again</button>}
      </div>
      {!added ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-line py-6">
          <Button size="sm" onClick={() => setAdded(true)}><GoogleCalendarIcon className="size-4" /> Add Goa trip to my calendar</Button>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {DAYS.map((d, i) => (
            <li key={d} style={{ animationDelay: `${i * 0.12}s` }} className="tw-rise flex items-center gap-2 rounded-lg border-l-2 border-[#4285F4] bg-surface-2/60 p-2">
              <span className="text-[11px] font-semibold text-muted-foreground">Day {i + 1}</span>
              <span className="flex-1 truncate text-[13px]">{d}</span>
              <Check className="size-3.5 text-good" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TABS = [
  { v: "save", label: "Save", title: "Save a trip on one device, find it on all", Demo: SaveDemo },
  { v: "edit", label: "Edit", title: "Reorder it, add your own stops, they stay", Demo: EditDemo },
  { v: "cal", label: "Calendar", title: "Put the whole plan in your calendar", Demo: CalendarDemo },
] as const;
type Tab = (typeof TABS)[number]["v"];

/** Try-it-yourself preview of what an account gives you. Rotates on its own until you touch it. */
function Showcase() {
  const [tab, setTab] = useState<Tab>("save");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (touched) return;
    const t = setInterval(() => setTab((c) => TABS[(TABS.findIndex((x) => x.v === c) + 1) % TABS.length].v), 7000);
    return () => clearInterval(t);
  }, [touched]);
  const cur = TABS.find((t) => t.v === tab)!;
  return (
    <div onPointerDown={() => setTouched(true)}>
      <Seg<Tab> value={tab} onChange={(v) => { setTouched(true); setTab(v); }} options={TABS.map((t) => ({ v: t.v, label: t.label }))} className="w-full sm:w-auto" />
      <h2 key={cur.v + "-t"} className="tw-fade mt-4 mb-3 text-base font-semibold">{cur.title}</h2>
      <div key={cur.v} className="tw-fade"><cur.Demo /></div>
      <p className="mt-3 text-xs text-muted-foreground">This is a preview. Nothing here is saved until you sign in.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- page */
export function SignInPage() {
  const q = useSearchParams();
  const next = safeNext(q.get("next"));
  const reason = q.get("reason");
  const { isLoaded, isSignedIn, user } = useAccount();
  const [busy, setBusy] = useState(false);

  const go = () => {
    setBusy(true);
    try { sessionStorage.setItem(WELCOME_KEY, "1"); } catch { /* storage blocked */ }
    signIn("google", { callbackUrl: next });
  };

  const title = reason === "calendar" ? "Add this trip to your calendar" : "Welcome aboard";
  const lead = reason === "calendar" ? "Sign in with Google and every day of the plan lands in your calendar in one tap." : "Sign in and your next trip is always one tap away.";

  return (
    <>
      <Header />
      <main id="main" className="mx-auto w-full max-w-[1040px] px-4 pt-[92px] pb-4">
        <p className="mb-4 text-[13px] text-muted-foreground"><Link href="/" className="transition-colors hover:text-primary">Home</Link> › Sign in</p>
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          <section aria-label="What you get" className="order-2 lg:order-1">
            <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] leading-tight font-semibold tracking-tight">Plan once. Take it everywhere.</h1>
            <p className="mt-2 mb-6 max-w-[52ch] text-muted-foreground">Try it right here: tap the hearts, move a stop, add the trip to a calendar. An account makes it real.</p>
            <Showcase />
          </section>

          <aside className="order-1 rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-[92px] lg:order-2">
            <span className="tw-float grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-6" /></span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{lead}</p>

            {isLoaded && isSignedIn && user ? (
              <div className="mt-5 space-y-3">
                <p className="rounded-xl border border-good/30 bg-good/10 p-3 text-sm">You&apos;re signed in as <b>{user.email || user.name}</b>.</p>
                <Button asChild className="h-11 w-full"><Link href={next}>Continue</Link></Button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <Button variant="outline" className="h-11 w-full text-sm font-semibold hover:border-primary" disabled={busy} onClick={go}>
                  <GoogleIcon className="size-5" /> {busy ? "Opening Google…" : "Continue with Google"}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="size-3.5 shrink-0 text-primary" /> Free, and it takes about five seconds.</p>
                <p className="flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground"><ShieldCheck className="mt-px size-3.5 shrink-0 text-good" /> No password to remember. We only see your name, email and photo.</p>
                <Link href={next} className="block pt-1 text-center text-[13px] font-medium text-muted-foreground transition-colors hover:text-primary">Maybe later, keep exploring</Link>
              </div>
            )}
            <p className="mt-5 border-t border-line pt-3 text-center text-[11px] text-muted-foreground">
              By continuing you agree to our <Link href="/terms" className="underline underline-offset-2 hover:text-primary">Terms</Link> and <Link href="/privacy" className="underline underline-offset-2 hover:text-primary">Privacy policy</Link>.
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}