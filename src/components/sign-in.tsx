"use client";

import { ArrowRight, Heart, MapPin, PencilLine, Plane, PlaneTakeoff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn } from "next-auth/react";
import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { useSignInPrompt } from "@/lib/sign-in-prompt";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoogleCalendarIcon, GoogleIcon } from "./brand-icons";

const BENEFITS = [
  { icon: <Heart className="size-4" />, title: "Saved trips on every device", text: "Start on your phone, finish on your laptop." },
  { icon: <PencilLine className="size-4" />, title: "Your edits are kept", text: "Reordered stops and added places stay with the trip." },
  { icon: <GoogleCalendarIcon className="size-5" />, title: "One-click Google Calendar", text: "Every day of the plan, added to your calendar." },
];

/** Set before leaving for Google, read after coming back, so we can say hello. */
export const WELCOME_KEY = "tw-welcome";

/** A dashed rounded track hugging the popup, with a plane circling it forever. */
function PlaneOrbit() {
  const box = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const plane = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = size;
  const r = 36; // popup corner radius plus the gap
  useEffect(() => {
    const pa = path.current;
    if (!w || !pa || !plane.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const len = pa.getTotalLength();
    let raf = 0;
    const tick = (now: number) => {
      const d = ((now / 9000) % 1) * len;
      const p = pa.getPointAtLength(d);
      const q = pa.getPointAtLength((d + 2) % len);
      const deg = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI + 45; // the icon points up-right
      plane.current!.style.transform = `translate(${p.x - 12}px, ${p.y - 12}px) rotate(${deg}deg)`;
      plane.current!.style.opacity = "1";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [w, h]);
  return (
    <div ref={box} aria-hidden className="pointer-events-none absolute -inset-5">
      {w > 0 && (
        <svg className="absolute inset-0 size-full text-primary" fill="none">
          <rect x="1" y="1" width={w - 2} height={h - 2} rx={r} stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 8" strokeLinecap="round" opacity="0.4" />
          <path ref={path} fill="none" d={`M${r + 1} 1H${w - r - 1}A${r} ${r} 0 0 1 ${w - 1} ${r + 1}V${h - r - 1}A${r} ${r} 0 0 1 ${w - r - 1} ${h - 1}H${r + 1}A${r} ${r} 0 0 1 1 ${h - r - 1}V${r + 1}A${r} ${r} 0 0 1 ${r + 1} 1Z`} stroke="none" />
        </svg>
      )}
      <span ref={plane} className="absolute top-0 left-0 text-primary opacity-0"><Plane className="size-6" /></span>
    </div>
  );
}

/**
 * Wrap any button: clicking it opens the sign-in window.
 * `title` and `description` let the place that asked for sign-in explain why (for example the calendar button).
 */
export function SignInButton({ children, title, description }: {
  children: React.ReactElement<{ onClick?: () => void }>;
  title?: string;
  description?: string;
}) {
  const ask = useSignInPrompt((s) => s.ask);
  return isValidElement(children) ? cloneElement(children, { onClick: () => ask({ title, description }) }) : children;
}

/** The one sign-in window for the whole app. Mounted once, opened from SignInButton or useGate. */
export function SignInHost() {
  const { open, setOpen, title, description } = useSignInPrompt();
  const [busy, setBusy] = useState(false);
  // the window belongs to the whole app, so close it when the page changes (for example after tapping Terms)
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname, setOpen]);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setBusy(false); }}>
      <DialogContent overlayClassName="bg-black/70 backdrop-blur-sm" className="gap-5 sm:max-w-md">
          <PlaneOrbit />
          <DialogHeader className="items-start text-left">
            <span className="relative mb-1 grid size-11 place-items-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
              <PlaneTakeoff className="tw-logo-plane size-5" />
              <MapPin className="tw-logo-pin absolute size-5" />
            </span>
            <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-sm">{description}</DialogDescription>
          </DialogHeader>

          <ul className="space-y-2.5">
            {BENEFITS.map((b, i) => (
              <li key={b.title} style={{ animationDelay: `${0.15 + i * 0.12}s` }} className="tw-rise group/b flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-3 transition-colors duration-200 hover:border-primary">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-primary transition-transform duration-500 group-hover/b:-rotate-12">{b.icon}</span>
                <span className="min-w-0">
                  <b className="block text-[13px] font-semibold">{b.title}</b>
                  <span className="block text-xs text-muted-foreground">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-2.5">
            <Button
              variant="outline"
              className="group/g tw-rise h-11 w-full text-sm font-semibold hover:border-primary"
              style={{ animationDelay: "0.55s" }}
              disabled={busy}
              onClick={() => { setBusy(true); try { sessionStorage.setItem(WELCOME_KEY, "1"); } catch { /* storage blocked */ } signIn("google", { callbackUrl: location.href }); }}
            >
              <GoogleIcon className="size-5" /> {busy ? "Opening Google…" : "Continue with Google"} <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover/g:translate-x-0 group-hover/g:opacity-100" />
            </Button>
            <p className="flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-good" />
              No password to remember. We only see your name, email and photo.
            </p>
          </div>

          <p className="border-t border-line pt-3 text-center text-[11px] text-muted-foreground">
            By continuing you agree to our <Link href="/terms" className="underline underline-offset-2 hover:text-primary">Terms</Link> and <Link href="/privacy" className="underline underline-offset-2 hover:text-primary">Privacy policy</Link>.
          </p>
        </DialogContent>
    </Dialog>
  );
}
