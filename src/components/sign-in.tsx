"use client";

import { signIn } from "next-auth/react";
import { cloneElement, isValidElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoogleIcon } from "./brand-icons";

/** Wrap any button: clicking it opens the sign-in window. */
export function SignInButton({ children }: { children: React.ReactElement<{ onClick?: () => void }> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      {isValidElement(children) ? cloneElement(children, { onClick: () => setOpen(true) }) : children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-semibold">Sign in to Pocketways</DialogTitle>
            <DialogDescription>Save trips across devices and add itineraries to Google Calendar.</DialogDescription>
          </DialogHeader>
          <Button
            variant="outline"
            className="h-10 w-full"
            disabled={busy}
            onClick={() => { setBusy(true); signIn("google", { callbackUrl: location.href }); }}
          >
            <GoogleIcon className="size-5" /> {busy ? "Opening Google…" : "Continue with Google"}
          </Button>
          <p className="text-xs text-muted-foreground">We only ask for your name, email and photo. Calendar access is requested separately, and only if you choose it.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}