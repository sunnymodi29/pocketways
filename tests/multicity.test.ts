import { describe, expect, it } from "vitest";
import { decodeRoute, encodeRoute, optimiseOrder, planMulti, STARTERS } from "@/lib/multicity";
import { defaultState, guideState } from "@/lib/engine";

const st = guideState({ ...defaultState(), from: "delhi", month: 10, travelers: 2 });

describe("multi-city", () => {
  it.each(STARTERS)("$label prices every leg and builds one plan day per trip day", ({ stops }) => {
    const t = planMulti(st, stops)!;
    expect(t.stops).toHaveLength(stops.length);
    expect(t.plan).toHaveLength(stops.reduce((a, s) => a + s.days, 0));
    expect(t.plan.map((d) => d.day)).toEqual(t.plan.map((_, i) => i + 1));
    expect(t.total).toBeGreaterThan(0);
    expect(t.stops.every((s) => s.leg.opt && s.leg.opt.cost > 0)).toBe(true);
    const parts = t.travel + t.stay + t.food + t.local + t.act + t.misc;
    expect(Math.round(parts)).toBe(Math.round(t.total));
  });
  it("returns null with no stops", () => expect(planMulti(st, [])).toBeNull());
  it("chains travel lines between stops", () => {
    const t = planMulti(st, STARTERS[0].stops)!;
    expect(t.plan[0].items.some((i) => i.includes("Shimla"))).toBe(true);
    expect(t.plan.some((d) => d.items.some((i) => i.includes("Travel on to Manali")))).toBe(true);
  });
  it("optimiseOrder keeps every stop", () => {
    const stops = [{ id: "kasol", days: 2 }, { id: "shimla", days: 2 }, { id: "manali", days: 2 }];
    expect(optimiseOrder("delhi", stops).map((s) => s.id).sort()).toEqual(["kasol", "manali", "shimla"]);
    expect(optimiseOrder("delhi", stops)[0].id).toBe("shimla");
  });
  it("share links round-trip", () => {
    const stops = [{ id: "goa", days: 3 }, { id: "hampi", days: 2 }];
    const r = decodeRoute(encodeRoute("mumbai", 12, "mid", 3, stops))!;
    expect(r).toMatchObject({ from: "mumbai", month: 12, stay: "mid", travelers: 3, stops });
    expect(decodeRoute("nowhere.1.budget.2")).toBeNull();
  });
});