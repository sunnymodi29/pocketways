import type { DayPlan } from "./engine";

export interface PrintMeta {
  title: string;
  subtitle: string;
  /** headline numbers, e.g. ["Per person", "₹9,973"] */
  facts: [string, string][];
  tips?: string[];
  skip?: string[];
  eat?: string[];
  /** where the plan lives online */
  link?: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dateLabel = (start: Date, add: number) =>
  new Date(start.getFullYear(), start.getMonth(), start.getDate() + add).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** The app logo mark (lucide plane-takeoff), white on the orange tile. */
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"/><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"/></svg>`;

const CSS = `
@page { size: A4; margin: 14mm 14mm 16mm; }
* { box-sizing: border-box; }
body { font: 12px/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c1c1c; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f3652f; padding-bottom: 8px; margin-bottom: 14px; }
.brand { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 18px; letter-spacing: -0.3px; color: #111; }
.logo { width: 32px; height: 32px; border-radius: 10px; background: #f3652f; display: grid; place-items: center; }
.logo svg { width: 18px; height: 18px; }
.gen { color: #77685f; font-size: 10px; }
h1 { font-size: 24px; margin: 0 0 2px; letter-spacing: -0.4px; }
.sub { color: #5c5047; margin: 0 0 12px; font-size: 13px; }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 16px; }
.fact { border: 1px solid #efd9cb; background: #fff8f3; border-radius: 10px; padding: 7px 10px; }
.fact small { display: block; color: #77685f; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
.fact b { font-size: 14px; }
.day { border: 1px solid #e9d8cc; border-radius: 10px; margin-bottom: 12px; break-inside: avoid; overflow: hidden; }
.dh { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; background: #f3652f; color: #fff; padding: 6px 12px; }
.dh b { font-size: 13px; }
.dh span { font-size: 10px; opacity: .92; }
.row { display: grid; grid-template-columns: 88px 1fr; gap: 10px; padding: 6px 12px; border-top: 1px solid #f3e6dc; }
.row:first-of-type { border-top: 0; }
.t { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #77685f; padding-top: 1px; }
.meal .v::before { content: "\\25CF"; color: #2e9d57; margin-right: 5px; }
.meal .n::before { content: "\\25CF"; color: #d63f3f; margin-right: 5px; }
.tip { margin: 0; padding: 6px 12px; background: #fff3e0; font-size: 11px; color: #5c5047; border-top: 1px solid #f3e6dc; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
.box { border: 1px solid #e9d8cc; border-radius: 10px; padding: 8px 12px; break-inside: avoid; }
.box h2 { font-size: 12px; margin: 0 0 4px; }
.box ul { margin: 0; padding-left: 16px; } .box li { margin: 2px 0; }
.full { grid-column: 1 / -1; }
footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #e9d8cc; color: #77685f; font-size: 10px; }
footer a { color: #f3652f; text-decoration: none; }
`;

/** A clean, printable A4 itinerary. Opens in its own window so the app's layout never leaks into the PDF. */
export function itineraryHtml(days: DayPlan[], meta: PrintMeta, start: Date): string {
  const list = (items?: string[]) => (items?.length ? `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
  const dayHtml = days
    .map((d, i) => {
      const rows = d.slots
        .map((s) =>
          s.meal
            ? `<div class="row meal"><div class="t">${esc(s.time)}</div><div><div class="v">${esc(s.meal.veg)}</div><div class="n">${esc(s.meal.nonveg)}</div></div></div>`
            : `<div class="row"><div class="t">${esc(s.time)}</div><div>${esc(s.text)}</div></div>`,
        )
        .join("");
      return `<section class="day"><div class="dh"><b>Day ${d.day} · ${esc(d.title)}</b><span>${esc(dateLabel(start, i))}</span></div>${rows}${d.tip ? `<p class="tip">Tip: ${esc(d.tip)}</p>` : ""}</section>`;
    })
    .join("");
  const boxes = [
    meta.eat?.length ? `<div class="box"><h2>Must eat</h2>${list(meta.eat)}</div>` : "",
    meta.tips?.length ? `<div class="box"><h2>Pro tips</h2>${list(meta.tips)}</div>` : "",
    meta.skip?.length ? `<div class="box full"><h2>Avoid this</h2>${list(meta.skip)}</div>` : "",
  ].join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(meta.title)} | Pocketways</title><style>${CSS}</style></head><body>
<header><span class="brand"><span class="logo">${LOGO}</span>Pocketways</span><span class="gen">Created ${esc(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }))}</span></header>
<h1>${esc(meta.title)}</h1><p class="sub">${esc(meta.subtitle)}</p>
<div class="facts">${meta.facts.map(([k, v]) => `<div class="fact"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join("")}</div>
${dayHtml}
<div class="cols">${boxes}</div>
<footer>Costs are estimates from typical prices and distances, not quotes. Confirm fares, visas, permits and opening times before you travel.${meta.link ? ` Plan online: <a href="${esc(meta.link)}">${esc(meta.link)}</a>` : ""}</footer>
</body></html>`;
}

/**
 * Prints the itinerary from a hidden frame inside the current page: no new tab, no pop-up.
 * The frame is removed once the print dialog closes.
 */
export function printItinerary(days: DayPlan[], meta: PrintMeta, start: Date): boolean {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) { frame.remove(); return false; }
  const prevTitle = document.title;
  doc.open();
  doc.write(itineraryHtml(days, meta, start));
  doc.close();
  const cleanup = () => { frame.remove(); document.title = prevTitle; };
  win.addEventListener("afterprint", cleanup);
  // let fonts/layout settle, then print; the frame's <title> becomes the suggested PDF name
  setTimeout(() => { win.focus(); win.print(); setTimeout(cleanup, 60_000); }, 250);
  return true;
}