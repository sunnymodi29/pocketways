"use client";

import { Heart, PencilLine, PlaneTakeoff, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { cloneElement, isValidElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoogleCalendarIcon, GoogleIcon } from "./brand-icons";

const BENEFITS = [
  { icon: <Heart className="size-4" />, title: "Your trips, everywhere", text: "Start on your phone, finish on your laptop." },
  { icon: <PencilLine className="size-4" />, title: "Plans that stay yours", text: "Every stop you move or add is kept." },
  { icon: <GoogleCalendarIcon className="size-5" />, title: "Straight to your calendar", text: "Add the whole itinerary in one tap." },
];

/** Set before leaving for Google, read after coming back, so we can say hello. */
export const WELCOME_KEY = "tw-welcome";

/**
 * Wrap any button: clicking it opens the sign-in window.
 * `title` and `description` let the place that asked for sign-in explain why (for example the calendar button).
 */
export function SignInButton({ children, title = "Welcome aboard", description = "Sign in and your next trip is always one tap away." }: {
  children: React.ReactElement<{ onClick?: () => void }>;
  title?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const go = () => {
    setBusy(true);
    try { sessionStorage.setItem(WELCOME_KEY, "1"); } catch { /* storage blocked */ }
    signIn("google", { callbackUrl: location.href });
  };
  return (
    <>
      {isValidElement(children) ? cloneElement(children, { onClick: () => setOpen(true) }) : children}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setBusy(false); }}>
        <DialogContent className="gap-5 sm:max-w-md">
          <DialogHeader className="items-start text-left">
            <span className="tw-float mb-1 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <PlaneTakeoff className="size-6" />
            </span>
            <DialogTitle className="text-2xl font-semibold tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-sm">{description}</DialogDescription>
          </DialogHeader>

          <ul className="space-y-2.5">
            {BENEFITS.map((b, i) => (
              <li key={b.title} style={{ animationDelay: `${0.08 + i * 0.07}s` }} className="tw-rise flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-primary">{b.icon}</span>
                <span className="min-w-0">
                  <b className="block text-[13px] font-semibold">{b.title}</b>
                  <span className="block text-xs text-muted-foreground">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-2.5">
            <Button variant="outline" className="h-11 w-full text-sm font-semibold hover:border-primary" disabled={busy} onClick={go}>
              <GoogleIcon className="size-5" /> {busy ? "Opening Google…" : "Continue with Google"}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Sparkles className="size-3.5 shrink-0 text-primary" /> Free, and it takes about five seconds.
            </p>
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
    </>
  );
}