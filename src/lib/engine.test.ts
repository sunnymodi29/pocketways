import { describe, expect, it } from "vitest";
import { DESTINATIONS, ORIGINS } from "./data";
import { computeResults, defaultState, destOf, evaluate, itinerary, type TripState } from "./engine";

const base = (over: Partial<TripState> = {}): TripState => ({
  ...defaultState(),
  from: "mumbai", days: 4, travelers: 2, month: 12, group: "friends", stay: "budget", ...over,
});
const total = (from: string, id: string, over: Partial<TripState> = {}) =>
  Math.round(evaluate(base({ from, ...over }), destOf(id)!).cost.total);

describe("data", () => {
  it("has the full catalogue", () => {
    expect(ORIGINS.length).toBe(22);
    expect(DESTINATIONS.length).toBe(41);
    expect(new Set(DESTINATIONS.map((d) => d.id)).size).toBe(41);
  });
});

describe("parity with the original app (per-person totals)", () => {
  it.each([
    ["mumbai", "goa", 9973],
    ["mumbai", "lonavala", 8972],
    ["mumbai", "udaipur", 11060],
    ["mumbai", "amritsar", 17860],
    ["mumbai", "varanasi", 16862],
    ["mumbai", "munnar", 20902],
    ["mumbai", "varkala", 18493],
  ])("%s -> %s = %i", (from, id, want) => {
    expect(total(from, id)).toBe(want);
  });
  it("Delhi -> Manali, 5 days", () => expect(total("delhi", "manali", { days: 5 })).toBe(14620));
  it("Mumbai -> Goa, 3 travelers", () => expect(total("mumbai", "goa", { travelers: 3 })).toBe(10529));
});

describe("results + itinerary", () => {
  it("ranks and filters", () => {
    const { results } = computeResults(base());
    expect(results.length).toBeGreaterThan(5);
    expect(results.every((r) => !r.d.intl)).toBe(true);
    for (let i = 1; i < results.length; i++) expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
  });
  it("builds one plan entry per day", () => {
    const r = evaluate(base(), destOf("goa")!);
    expect(itinerary(base(), r)).toHaveLength(4);
  });
});
