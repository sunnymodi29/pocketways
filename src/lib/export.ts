import type { DayPlan } from "./engine";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/** Fold lines to 75 octets-ish as RFC 5545 asks. */
const fold = (line: string) => (line.length <= 73 ? line : line.match(/.{1,73}/g)!.join("\r\n "));

export function slotLines(day: DayPlan): string[] {
  return day.slots.map((s) => (s.meal ? `${s.time}: Veg - ${s.meal.veg} | Non-veg - ${s.meal.nonveg}` : `${s.time}: ${s.text}`));
}

/** One all-day calendar event per itinerary day. `start` is the first day of the trip. */
export function buildIcs(days: DayPlan[], destName: string, start: Date): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pocketways//Trip plan//EN", "CALSCALE:GREGORIAN"];
  days.forEach((d, i) => {
    const a = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const b = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i + 1);
    out.push(
      "BEGIN:VEVENT",
      `UID:${destName.toLowerCase().replace(/\W+/g, "-")}-${ymd(start)}-d${d.day}@pocketways`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(a)}`,
      `DTEND;VALUE=DATE:${ymd(b)}`,
      fold(`SUMMARY:${esc(`${destName} · Day ${d.day}: ${d.title}`)}`),
      fold(`DESCRIPTION:${esc([...slotLines(d), d.tip ? `Tip: ${d.tip}` : ""].filter(Boolean).join("\n"))}`),
      `LOCATION:${esc(destName)}`,
      "END:VEVENT",
    );
  });
  out.push("END:VCALENDAR");
  return out.join("\r\n") + "\r\n";
}

/** Prefilled "new event" page on Google Calendar for one itinerary day (all-day event). */
export function googleCalUrl(day: DayPlan, destName: string, start: Date): string {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day.day - 1);
  const b = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day.day);
  return "https://calendar.google.com/calendar/render?" + new URLSearchParams({
    action: "TEMPLATE",
    text: `${destName} · Day ${day.day}: ${day.title}`,
    dates: `${ymd(a)}/${ymd(b)}`,
    details: [...slotLines(day), day.tip ? `Tip: ${day.tip}` : ""].filter(Boolean).join("\n"),
    location: destName,
  });
}

export function download(name: string, text: string, type = "text/calendar") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}