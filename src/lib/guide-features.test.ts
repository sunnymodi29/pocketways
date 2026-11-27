import { describe, expect, it } from "vitest";
import { DESTINATIONS } from "./data";
import { dishType, evaluate, guideState, itinerary, destOf } from "./engine";
import { buildIcs } from "./export";
import { planText } from "./links";

const st = (over = {}) => guideState({ from: "delhi", days: 4, month: 12, ...over });

describe("itinerary", () => {
  it.each([1, 2, 3, 5, 7, 10])("%i day(s): every day has slots and a meal for both diets", (n) => {
    for (const d of DESTINATIONS) {
      const s = st({ days: n });
      const plan = itinerary(s, evaluate(s, d));
      expect(plan).toHaveLength(n);
      for (const day of plan) {
        expect(day.slots.length).toBeGreaterThan(1);
        for (const slot of day.slots) {
          expect(slot.text !== undefined).toBe(true);
          if (slot.meal) { expect(slot.meal.veg.length).toBeGreaterThan(0); expect(slot.meal.nonveg.length).toBeGreaterThan(0); }
        }
      }
      if (n > 1) expect(plan[0].slots.some((x) => x.kind === "travel")).toBe(true);
    }
  });
  it("never shows fish or meat as the vegetarian option", () => {
    const meat = /fish|prawn|pork|chicken|mutton|lamb|lobster|crab/i;
    for (const d of DESTINATIONS) {
      const s = st({ days: 5 });
      for (const day of itinerary(s, evaluate(s, d))) for (const slot of day.slots) if (slot.meal) expect(slot.meal.veg).not.toMatch(meat);
    }
  });
});

describe("dishType", () => {
  it.each([
    ["Goan fish thali", "nonveg"], ["Pork vindaloo", "nonveg"], ["Rajasthani thali", "veg"],
    ["Bebinca", "snack"], ["Momos & thukpa", "both"], ["Dal baati", "veg"],
  ])("%s -> %s", (dish, want) => expect(dishType(dish)).toBe(want));
});

describe("share text and calendar export", () => {
  const s = st();
  const r = evaluate(s, destOf("goa")!);
  it("includes every day and both diets", () => {
    const t = planText(s, r, "https://x.test");
    for (let i = 1; i <= 4; i++) expect(t).toContain(`DAY ${i}`);
    expect(t).toContain("Veg:");
    expect(t).toContain("Non-veg:");
    expect(t).toContain("https://x.test");
  });
  it("builds a valid .ics with one event per day", () => {
    const ics = buildIcs(itinerary(s, r), "Goa", new Date(2027, 0, 10));
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270110");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270113");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});