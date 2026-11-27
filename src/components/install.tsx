"use client";

import { Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTrip } from "@/lib/store";
import { Logo } from "./header";
import { Button } from "@/components/ui/button";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<unknown>;
}

const DISMISS_KEY = "wf-install-dismissed";
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const dismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
};

/** "Add to home screen": Chrome/Edge/Android use the install prompt, iOS shows manual steps. */
export function useInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    setIos(isIOS() && window.matchMedia("(max-width: 1100px)").matches);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    const onInstalled = () => { setEvt(null); setDone(true); toast("Pocketways added to your home screen"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canOffer = !done && (!!evt || ios);
  const install = useCallback(async () => {
    if (evt) {
      await evt.prompt();
      try { await evt.userChoice; } catch { /* dismissed */ }
      setEvt(null);
      return "native" as const;
    }
    return ios ? ("ios" as const) : null;
  }, [evt, ios]);
  return { canOffer, install };
}

export function InstallButton() {
  const { canOffer, install } = useInstall();
  const [sheet, setSheet] = useState(false);
  if (!canOffer) return null;
  return (
    <>
      <button type="button" onClick={async () => { if ((await install()) === "ios") setSheet(true); }} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13.5px] font-semibold transition-colors hover:border-primary">
        <Smartphone className="size-4 text-primary" /> Add to home screen
      </button>
      {sheet && <IosSheet onClose={() => setSheet(false)} />}
    </>
  );
}

function IosSheet({ onClose }: { onClose: () => void }) {
  const kbd = "rounded-md bg-surface-2 px-2 py-px font-semibold";
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 p-3.5 backdrop-blur-sm" onClick={onClose}>
      <div className="grid w-[min(420px,100%)] gap-2.5 rounded-2xl bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <b>Add Pocketways to your home screen</b>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Tap the <span className={kbd}>Share</span> button at the bottom of Safari</li>
          <li>Scroll and tap <span className={kbd}>Add to Home Screen</span></li>
          <li>Tap <span className={kbd}>Add</span>. Done</li>
        </ol>
        <Button onClick={onClose}>Got it</Button>
      </div>
    </div>
  );
}

/** Small chip that appears a few seconds after load when the app can be installed. */
export function InstallChip() {
  const { canOffer, install } = useInstall();
  const started = useTrip((s) => s.started);
  const [show, setShow] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    // not on the home screen: the hero already has an "Add to home screen" button
    if (!canOffer || dismissed() || !started) return;
    const t = setTimeout(() => setShow(true), 6000);
    return () => clearTimeout(t);
  }, [canOffer, started]);

  if (!canOffer || !show || !started) return sheet ? <IosSheet onClose={() => setSheet(false)} /> : null;
  const close = () => {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* storage blocked */ }
  };
  return (
    <>
      <div className="tw-rise fixed bottom-[76px] left-1/2 z-[80] flex w-[min(420px,calc(100vw-24px))] -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 py-2.5 max-[1100px]:bottom-[70px] min-[1101px]:bottom-6">
        <Logo className="size-8" icon="size-4" />
        <span className="grid flex-1 text-sm"><b>Add Pocketways to home screen</b><small className="text-muted-foreground">Open it like an app, one tap</small></span>
        <Button size="sm" className="rounded-lg" onClick={async () => { if ((await install()) === "ios") { setSheet(true); setShow(false); } else setShow(false); }}>Add</Button>
        <button type="button" onClick={close} aria-label="Close" className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
      </div>
      {sheet && <IosSheet onClose={() => setSheet(false)} />}
    </>
  );
}
