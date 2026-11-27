"use client";

import { useEffect } from "react";
import { useTrip } from "@/lib/store";

// The logo's plane-takeoff icon flies out of the tab icon and back in. Drawn on a canvas and swapped in as a PNG,
// so it animates in Chrome, Edge and Firefox. The static icons from the metadata remain the fallback.
const SIZE = 64;
const ORANGE = "#F3652F";
const SCALE = (SIZE * 0.66) / 24;
const OFF = (SIZE - 24 * SCALE) / 2;
const GLYPH = [
  "M2 22h20",
  "M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z",
];

export function AnimatedFavicon() {
  useEffect(() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = SIZE;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paths = GLYPH.map((d) => new Path2D(d));

    document.querySelectorAll('link[rel~="icon"]').forEach((l) => l.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    document.head.appendChild(link);

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
    const easeIn = (t: number) => t * t;
    const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

    // p: 0..1 flight progress, or null for the resting icon.
    const draw = (p: number | null) => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      tile();
      ctx.fillStyle = ORANGE;
      ctx.fill();
      tile();
      ctx.clip();
      let dx = 0;
      let dy = 0;
      if (p !== null) {
        if (p < 0.45) {
          const t = easeIn(p / 0.45);
          dx = t * SIZE;
          dy = -t * SIZE;
        } else {
          const t = easeOut((p - 0.45) / 0.55);
          dx = -(1 - t) * SIZE;
          dy = (1 - t) * SIZE;
        }
      }
      ctx.translate(OFF + dx, OFF + dy);
      ctx.scale(SCALE, SCALE);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      paths.forEach((g) => ctx.stroke(g));
      ctx.restore();
      link.href = cv.toDataURL("image/png");
    };

    let busy = false;
    const fly = (ms = 700) => {
      if (reduce || busy || document.hidden) return;
      busy = true;
      const t0 = performance.now();
      const id = setInterval(() => {
        const p = Math.min(1, (performance.now() - t0) / ms);
        draw(p);
        if (p >= 1) {
          clearInterval(id);
          draw(null);
          busy = false;
        }
      }, 50);
    };

    draw(null);
    const hello = setTimeout(() => fly(), 600);
    const loop = setInterval(() => fly(), 3500);
    // pulse when a search starts or a trip opens
    const unsub = useTrip.subscribe((s, prev) => {
      if (s.started !== prev.started || s.selectedId !== prev.selectedId) fly(600);
    });
    return () => {
      clearTimeout(hello);
      clearInterval(loop);
      unsub();
    };
  }, []);
  return null;
}
