"use client";

import { useAccount } from "@/lib/use-account";
import { SignInButton } from "./sign-in";
import { UserMenu } from "./user-menu";
import { ArrowUpRight, BookOpen, Heart, MapPin, Menu, Moon, PlaneTakeoff, Route, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { DESTINATIONS, ORIGINS } from "@/lib/data";
import { destOf, evaluate, fmt, guideState, originOf } from "@/lib/engine";
import { useTrip } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Num } from "./kit";

const EXAMPLES: [string, string, number][] = [
  ["mumbai", "goa", 4], ["delhi", "manali", 5], ["bengaluru", "coorg", 3],
  ["kolkata", "darjeeling", 4], ["chennai", "pondicherry", 3], ["pune", "lonavala", 2],
];

interface Msg { t: string; href?: string }

function useTaglines(): Msg[] {
  return useMemo(() => {
    const msgs: Msg[] = [{ t: "Plan trips that fit your budget" }];
    for (const [from, id, days] of EXAMPLES) {
      const d = destOf(id);
      const o = originOf(from);
      if (!d || !o) continue;
      const r = evaluate(guideState({ from, days }), d);
      if (!r.mode) continue;
      msgs.push({
        t: `${o.name} to ${d.name}: ${fmt(r.cost.total)} for ${days} days`,
        href: `/#from=${from}&budget=${Math.ceil(r.cost.total / 1000) * 1000}&days=${days}&trip=${id}`,
      });
    }
    msgs.push({ t: `${DESTINATIONS.length} destinations from ${ORIGINS.length} cities` });
    return msgs;
  }, []);
}

function Tagline() {
  const msgs = useTaglines();
  const [i, setI] = useState(0);
  const [out, setOut] = useState(false);
  const paused = useRef(false);
  const go = (n: number) => {
    setOut(true);
    setTimeout(() => {
      setI((n + msgs.length) % msgs.length);
      setOut(false);
    }, 220);
  };
  useEffect(() => {
    const t = setInterval(() => {
      if (!paused.current && !document.hidden) go(i + 1);
    }, 4200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, msgs.length]);

  const m = msgs[i];
  const inner = (
    <>
      <span className="block h-5 overflow-hidden">
        <span key={i} className={cn("tw-fade block truncate text-[13px] font-medium transition-all duration-200", out && "-translate-y-2 opacity-0")}>
          {m.t}
        </span>
      </span>
      <ArrowUpRight className={cn("size-3.5 shrink-0 text-primary transition-opacity duration-300 group-hover/tl:opacity-100 group-focus-visible/tl:opacity-100", m.href ? "opacity-100" : "opacity-50")} />
    </>
  );
  const cls =
    "group/tl hidden min-w-0 max-w-[340px] items-center gap-2 rounded-full bg-surface-2/60 px-3 py-1.5 text-muted-foreground transition-colors duration-300 hover:bg-surface-2 hover:text-foreground min-[1100px]:flex";
  const hover = {
    onMouseEnter: () => (paused.current = true),
    onMouseLeave: () => (paused.current = false),
    onFocus: () => (paused.current = true),
    onBlur: () => (paused.current = false),
  };
  return m.href ? (
    <Link href={m.href} className={cls} title="Open this trip" aria-live="polite" {...hover}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls} title="Next tip" aria-live="polite" onClick={() => go(i + 1)} {...hover}>
      {inner}
    </button>
  );
}

/** Plane flies out diagonally (top-right); the pin drops in from above and, on leave, exits downward. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("tw-logo-loop relative grid size-9 place-items-center overflow-hidden rounded-lg bg-primary text-primary-foreground", className)}>
      <PlaneTakeoff className="tw-lp size-[18px]" />
      <MapPin className="tw-lpin absolute size-[18px]" />
    </span>
  );
}

export function Header({ onHome, transparent }: { onHome?: () => void; transparent?: boolean }) {
  const { isLoaded, isSignedIn } = useAccount();
  const saved = useTrip((s) => s.saved);
  const openSaved = useTrip((s) => s.openSaved);
  const loadSaved = useTrip((s) => s.loadSaved);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    loadSaved();
    const onStorage = (e: StorageEvent) => e.key === "tw-saved" && loadSaved();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadSaved]);

  const btn =
    "relative flex h-9 shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-lg bg-surface-2/70 px-3 text-[13px] font-medium text-foreground transition-colors duration-200 hover:bg-surface-2 hover:text-primary";
  return (
    <>
    {!transparent && <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-30 print:hidden h-[84px] bg-background/50 backdrop-blur-md [mask-image:linear-gradient(to_bottom,black_70%,transparent)]" />}
    <header
      className={cn(
        "fixed inset-x-3 top-3 z-40 flex h-14 print:hidden items-center justify-between gap-3 rounded-2xl border pr-2 pl-4 transition-colors duration-300",
        transparent ? "border-transparent bg-transparent" : "border-line bg-surface",
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href="/"
          onClick={onHome}
          aria-label="Pocketways home"
          className="group/brand flex items-center gap-2.5"
        >
          <Logo />
          <b className="text-lg font-bold tracking-tight transition-colors duration-200 group-hover/brand:text-primary group-focus-visible/brand:text-primary">Pocketways</b>
        </Link>
        <Tagline />
      </div>
      <nav className="flex items-center gap-1">
        {!(isLoaded && isSignedIn) && (
          <>
        <button type="button" className={cn(btn, "max-sm:hidden")} onClick={() => openSaved()} aria-label="My trips">
          <Heart className="size-4" />
          <span className="hidden sm:inline">My trips</span>
          {saved.length > 0 && (
            <b className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] leading-5 text-primary-foreground">
              <Num value={saved.length} ms={350} />
            </b>
          )}
        </button>
        <Link href="/multi-city" className={cn(btn, "max-sm:hidden")}>
          <Route className="size-4" />
          <span className="hidden md:inline">Multi-city</span>
        </Link>
        <Link href="/guides" className={cn(btn, "max-sm:hidden")}>
          <BookOpen className="size-4" />
          <span className="hidden sm:inline">Guides</span>
        </Link>
          </>
        )}
        {isLoaded && (isSignedIn ? (
          <span className="grid h-9 place-items-center px-1"><UserMenu /></span>
        ) : (
          <SignInButton>
            <button type="button" className={btn}><UserRound className="size-4" /><span>Sign in</span></button>
          </SignInButton>
        ))}
        <button
          type="button"
          className={cn(btn, "w-9 justify-center px-0 max-sm:hidden")}
          aria-label="Switch light / dark theme"
          onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
        >
          {mounted && resolvedTheme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>

        {/* phones: everything else lives behind one menu button */}
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className={cn(btn, "w-9 justify-center px-0 sm:hidden")} aria-label="Open menu">
              <Menu className="size-[18px]" />
              {saved.length > 0 && <i className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-[min(320px,86vw)] flex-col gap-0 border-line bg-surface p-0">
            <SheetHeader className="border-b border-line px-4 py-3.5 pr-12">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetClose asChild>
                <Link href="/" onClick={onHome} aria-label="Pocketways home" className="flex items-center gap-2.5">
                  <Logo />
                  <b className="text-lg font-bold tracking-tight">Pocketways</b>
                </Link>
              </SheetClose>
            </SheetHeader>
            <ul className="flex-1 space-y-1 p-3">
              {[
                { icon: <Heart className="size-[18px]" />, label: "My trips", count: saved.length, onClick: () => openSaved() },
                { icon: <Route className="size-[18px]" />, label: "Multi-city", href: "/multi-city" },
                { icon: <BookOpen className="size-[18px]" />, label: "Guides", href: "/guides" },
              ].map((it, i) => {
                const row = "tw-rise flex h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-200 hover:bg-surface-2 hover:text-primary";
                const inner = (
                  <>
                    <span className="text-primary">{it.icon}</span>
                    <span className="flex-1 text-left">{it.label}</span>
                    {!!it.count && <b className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] leading-5 text-primary-foreground">{it.count}</b>}
                  </>
                );
                return (
                  <li key={it.label} style={{ animationDelay: `${0.05 + i * 0.06}s` }} className="tw-rise">
                    <SheetClose asChild>
                      {it.href ? <Link href={it.href} className={row}>{inner}</Link> : <button type="button" className={row} onClick={it.onClick}>{inner}</button>}
                    </SheetClose>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-line p-3">
              <button
                type="button"
                className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-200 hover:bg-surface-2 hover:text-primary"
                onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
              >
                <span className="text-primary">{mounted && resolvedTheme === "light" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}</span>
                {mounted && resolvedTheme === "light" ? "Dark mode" : "Light mode"}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
    </>
  );
}
