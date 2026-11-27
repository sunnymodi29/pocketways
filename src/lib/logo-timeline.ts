/**
 * The logo loop as numbers, for places that cannot use the CSS animation (the browser tab icon is drawn on a canvas).
 * It is the same timeline as the `tw-logo-plane` / `tw-logo-pin` keyframes in globals.css, so keep the two in step:
 *
 *   plane rests 0-18%, flies off 18-34%, pin drops in 34-50%, rests 50-68%, drops out 68-84%, plane flies back in 84-100%.
 *
 * One icon at a time, back to back. Every way in uses the app's ease-out curve; every way out is that curve in reverse.
 * Offsets are in tiles: 1 means one full tile width or height.
 */
export const LOGO_LOOP_MS = 2600;

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 12; i++) {
      const err = ((ax * t + bx) * t + cx) * t - x;
      const slope = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(err) < 1e-6 || Math.abs(slope) < 1e-6) break;
      t -= err / slope;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

const settle = bezier(0.2, 0.8, 0.2, 1); // --ease in globals.css: how things arrive
const leave = bezier(0.8, 0, 0.8, 0.2); // the same curve played backwards: how things go
const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));

export interface LogoState {
  /** offset in tiles and opacity of the plane */
  plane: { x: number; y: number; o: number };
  /** offset in tiles (it only moves up and down) and opacity of the pin */
  pin: { y: number; o: number };
}

/** Where both icons are at `p`, a position in the loop from 0 up to (not including) 1. */
export function logoState(p: number): LogoState {
  const plane = { x: 0, y: 0, o: 0 };
  if (p < 0.18) plane.o = 1;
  else if (p < 0.34) {
    const e = leave(seg(p, 0.18, 0.34));
    plane.x = e;
    plane.y = -e;
    plane.o = 1 - e;
  } else if (p >= 0.84) {
    const e = settle(seg(p, 0.84, 1));
    plane.x = -(1 - e);
    plane.y = 1 - e;
    plane.o = e;
  }
  const pin = { y: 0, o: 0 };
  if (p >= 0.34 && p < 0.5) {
    const e = settle(seg(p, 0.34, 0.5));
    pin.y = -(1 - e);
    pin.o = e;
  } else if (p >= 0.5 && p < 0.68) pin.o = 1;
  else if (p >= 0.68 && p < 0.84) {
    const e = leave(seg(p, 0.68, 0.84));
    pin.y = e;
    pin.o = 1 - e;
  }
  return { plane, pin };
}
