"use client";

import { Heart, PencilLine, PlaneTakeoff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { cloneElement, isValidElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoogleCalendarIcon, GoogleIcon } from "./brand-icons";

const BENEFITS = [
  { icon: <Heart className="size-4" />, title: "Saved trips on every device", text: "Start on your phone, finish on your laptop." },
  { icon: <PencilLine className="size-4" />, title: "Your edits are kept", text: "Reordered stops and added places stay with the trip." },
  { icon: <GoogleCalendarIcon className="size-5" />, title: "One-click Google Calendar", text: "Every day of the plan, added to your calendar." },
];

/**
 * Wrap any button: clicking it opens the sign-in window.
 * `title` and `description` let the place that asked for sign-in explain why (for example the calendar button).
 */
export function SignInButton({ children, title = "Sign in to Pocketways", description = "Keep your trips, edits and calendar plans in one place." }: {
  children: React.ReactElement<{ onClick?: () => void }>;
  title?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      {isValidElement(children) ? cloneElement(children, { onClick: () => setOpen(true) }) : children}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setBusy(false); }}>
        <DialogContent className="gap-5 sm:max-w-md">
          <DialogHeader className="items-start text-left">
            <span className="mb-1 grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground"><PlaneTakeoff className="size-5" /></span>
            <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-sm">{description}</DialogDescription>
          </DialogHeader>

          <ul className="space-y-2.5">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-primary">{b.icon}</span>
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
              className="h-11 w-full text-sm font-semibold"
              disabled={busy}
              onClick={() => { setBusy(true); signIn("google", { callbackUrl: location.href }); }}
            >
              <GoogleIcon className="size-5" /> {busy ? "Opening Google…" : "Continue with Google"}
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
    </>
  );
}
