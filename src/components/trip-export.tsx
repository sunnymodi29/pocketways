"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { CalendarCheck, CalendarDays, CalendarPlus, ChevronDown, ExternalLink, Loader2, LogIn, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { DayPlan } from "@/lib/engine";
import { buildIcs, download, googleCalUrl, slotLines } from "@/lib/export";
import { connectGoogleCalendar } from "@/lib/google-calendar";
import { GoogleCalendarIcon } from "./brand-icons";
import { printItinerary, type PrintMeta } from "@/lib/print";
import { cn } from "@/lib/utils";

/** First day of `month` (1-12): this year if still ahead, otherwise next year. */
function defaultStart(month: number) {
  const now = new Date();
  let y = now.getFullYear();
  if (new Date(y, month, 0) < now) y += 1;
  const d = new Date(y, month - 1, Math.max(1, month === now.getMonth() + 1 && y === now.getFullYear() ? now.getDate() + 1 : 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "5 Dec" style label for the nth day after the start date. */
function fmtDate(start: string, add: number) {
  const [y, m, d] = start.split("-").map(Number);
  if (!y) return "?";
  return new Date(y, m - 1, d + add).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function TripExport({ days, destName, month, doc }: { days: DayPlan[]; destName: string; month: number; doc?: PrintMeta }) {
  const [start, setStart] = useState(() => defaultStart(month));
  const [gOpen, setGOpen] = useState(false);
  const startDate = () => { const [y, m, d] = start.split("-").map(Number); return new Date(y, m - 1, d); };
  const { isSignedIn, user } = useUser();
  const [adding, setAdding] = useState(false);
  const oneClick = async () => {
    if (!isSignedIn || !user) return toast("Sign in with Google to add the trip to your calendar in one click");
    setAdding(true);
    try {
      const r = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: destName,
          start,
          days: days.map((d) => ({ title: `Day ${d.day}: ${d.title}`, description: [...slotLines(d), d.tip ? `Tip: ${d.tip}` : ""].filter(Boolean).join("\n") })),
        }),
      });
      if (r.ok) return toast(`Added ${days.length} days to your Google Calendar`);
      const e = (await r.json().catch(() => ({}))) as { error?: string };
      if (e.error === "needs_google" || e.error === "needs_calendar_scope") {
        toast("Google needs your permission to add events. Redirecting…");
        await connectGoogleCalendar(user);
        return;
      }
      toast(`Couldn't add to Google Calendar (${e.error ?? r.status}). Use the links below instead`);
    } catch (err) {
      console.error("calendar", err);
      const msg = (err as { errors?: { longMessage?: string; message?: string }[] })?.errors?.[0];
      toast(msg?.longMessage || msg?.message || "Couldn't reach Google Calendar. Use the links below instead");
    } finally {
      setAdding(false);
    }
  };
  const savePdf = () => {
    const meta: PrintMeta = doc ?? { title: `${destName} itinerary`, subtitle: `${days.length} days`, facts: [] };
    if (!printItinerary(days, meta, startDate())) toast("Couldn't open the print dialog. Try again");
  };
  const calendar = () => {
    const [y, m, d] = start.split("-").map(Number);
    if (!y) return toast("Pick a start date first");
    download(`${destName.toLowerCase().replace(/\W+/g, "-")}-itinerary.ics`, buildIcs(days, destName, new Date(y, m - 1, d)));
    toast("Calendar file downloaded. Open it to add the trip");
  };
  const pill = "inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface-2/50 px-3 text-xs font-medium transition-colors hover:border-primary hover:text-primary [&_svg]:size-3.5 [&_svg]:text-primary";
  return (
    <section className="mt-4 rounded-xl border border-line bg-surface p-3 print:hidden" aria-label="Export itinerary">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Trip starts</span>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Trip start date"
          className="h-8 rounded-lg border border-line bg-surface-2 px-2.5 text-xs font-medium text-foreground outline-none transition-colors [color-scheme:light] focus:border-primary dark:[color-scheme:dark]" />
        <span className="text-[11px] text-muted-foreground">{fmtDate(start, 0)} to {fmtDate(start, days.length - 1)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isSignedIn ? (
          <button type="button" disabled={adding} onClick={oneClick} title={`Adds all ${days.length} days to your Google Calendar`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
            {adding ? <Loader2 className="size-3.5 animate-spin" /> : <GoogleCalendarIcon className="size-4" />}
            {adding ? "Adding…" : "Add to Google Calendar"}
          </button>
        ) : (
          <SignInButton mode="modal">
            <button type="button" title="Sign in to add every day to your Google Calendar in one click"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90">
              <GoogleCalendarIcon className="size-4" /> Sign in to add to Calendar
            </button>
          </SignInButton>
        )}
        <button type="button" onClick={() => setGOpen((o) => !o)} aria-expanded={gOpen} title="Open each day in Google Calendar, no sign-in needed" className={pill}>
          <GoogleCalendarIcon /> Day links <ChevronDown className={cn("!text-muted-foreground transition-transform duration-200", gOpen && "rotate-180")} />
        </button>
        <button type="button" onClick={calendar} title="Download an .ics file for Apple Calendar or Outlook" className={pill}><CalendarPlus /> .ics</button>
        <button type="button" onClick={savePdf} title="Open a clean itinerary to print or save as PDF" className={pill}><Printer /> PDF</button>
      </div>

      {gOpen && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
          <span className="text-[11px] text-muted-foreground">Opens Google Calendar, press Save:</span>
          {days.map((d) => (
            <a key={d.day} href={googleCalUrl(d, destName, startDate())} target="_blank" rel="noopener" className={pill}>
              Day {d.day} <ExternalLink />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}