"use client";

import { useEffect } from "react";
import { LOGO_LOOP_MS, logoState } from "@/lib/logo-timeline";

// The tab icon plays the same loop as the logo on the page: the plane flies off, the pin drops in, the pin drops out,
// the plane flies back. It is drawn on a canvas and swapped in as a PNG, so it animates in Chrome, Edge and Firefox.
// The static icons from the metadata remain the fallback.
//
// The loop is a fixed set of pictures (one every 50 ms), so each is drawn once while the browser is idle and kept.
// After that nothing is drawn or encoded: the tab icon just swaps to a picture it already has.
const SIZE = 64;
const ORANGE = "#F3652F";
const SCALE = (SIZE * 0.66) / 24;
const OFF = (SIZE - 24 * SCALE) / 2;
const FRAME_MS = 50;
const FRAMES = Math.round(LOGO_LOOP_MS / FRAME_MS);
const PLANE = [
  "M2 22h20",
  "M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z",
];
const PIN = "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0";

// shared by every mount of the component (React strict mode mounts twice, and the page can remount)
const frames = new Map<number, string>();
let canvas: HTMLCanvasElement | null = null;
let plane: Path2D[] = [];
let pin: Path2D | null = null;

/** The picture for one step of the loop, drawn the first time it is asked for and remembered after that. */
function frame(step: number): string {
  const hit = frames.get(step);
  if (hit) return hit;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    plane = PLANE.map((d) => new Path2D(d));
    pin = new Path2D(PIN);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx || !pin) return "";
  const tile = () => {
    const r = SIZE * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(SIZE, 0, SIZE, SIZE, r);
    ctx.arcTo(SIZE, SIZE, 0, SIZE, r);
    ctx.arcTo(0, SIZE, 0, 0, r);
    ctx.arcTo(0, 0, SIZE, 0, r);
    ctx.closePath();
  };
  const s = logoState(step / FRAMES);
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  tile();
  ctx.fillStyle = ORANGE;
  ctx.fill();
  tile();
  ctx.clip();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // plane
  if (s.plane.o > 0.01) {
    ctx.save();
    ctx.globalAlpha = s.plane.o;
    ctx.translate(OFF + s.plane.x * SIZE, OFF + s.plane.y * SIZE);
    ctx.scale(SCALE, SCALE);
    plane.forEach((g) => ctx.stroke(g));
    ctx.restore();
  }
  // pin
  if (s.pin.o > 0.01) {
    ctx.save();
    ctx.globalAlpha = s.pin.o;
    ctx.translate(OFF, OFF + s.pin.y * SIZE);
    ctx.scale(SCALE, SCALE);
    ctx.stroke(pin);
    ctx.beginPath();
    ctx.arc(12, 10, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  const url = canvas.toDataURL("image/png");
  frames.set(step, url);
  return url;
}

export function AnimatedFavicon() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.querySelectorAll('link[rel~="icon"]').forEach((l) => l.remove());
    let link: HTMLLinkElement | null = null;
    let shown = "";
    const show = (step: number) => {
      const url = frame(step);
      if (!url || url === shown) return; // that picture is already in the tab (the loop holds still for a while)
      shown = url;
      // Some Chrome versions repaint the tab icon only when the link element itself is replaced, not when its href
      // changes, so each new picture goes in on a fresh element (added first, so the tab is never without an icon).
      const next = document.createElement("link");
      next.rel = "icon";
      next.type = "image/png";
      next.href = url;
      document.head.appendChild(next);
      link?.remove();
      link = next;
    };

    show(0);
    if (reduce) return;
    // draw the whole loop while the browser is idle, so nothing is drawn while it plays
    const warm = () => { for (let s = 0; s < FRAMES; s++) frame(s); };
    const idle = typeof requestIdleCallback === "function" ? requestIdleCallback(warm, { timeout: 3000 }) : window.setTimeout(warm, 1500);
    const id = setInterval(() => {
      if (document.hidden) return;
      show(Math.floor((performance.now() % LOGO_LOOP_MS) / FRAME_MS));
    }, FRAME_MS);
    return () => {
      clearInterval(id);
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle as number);
      else clearTimeout(idle as number);
    };
  }, []);
  return null;
}
