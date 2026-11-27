import { z } from "zod";

/**
 * Long-form guide content, generated once per destination by `scripts/generate-guides.ts`,
 * reviewed by a human, and stored in `guides.generated.json`.
 * This file must not use relative imports: the script runs it directly with Node.
 */
const meal = z.object({ veg: z.string(), nonveg: z.string() });

export const DayPlanSchema = z.object({
  title: z.string(),
  stayArea: z.string().describe("Where to sleep that night, or empty on the last day"),
  morning: z.string(),
  afternoon: z.string(),
  evening: z.string(),
  breakfast: meal,
  lunch: meal,
  dinner: meal,
  getAround: z.string().describe("How to move around that day and roughly what it costs"),
});

export const GuideContentSchema = z.object({
  overview: z.string().describe("2-3 short paragraphs: what the place is, what it feels like, who it suits"),
  knowFirst: z.array(z.string()).describe("5-8 practical facts to know before going"),
  areas: z.array(z.object({
    name: z.string(), vibe: z.string(), bestFor: z.string(), approxRoomINR: z.number(),
  })).describe("Neighbourhoods or areas to base yourself in"),
  sights: z.array(z.object({
    name: z.string(), why: z.string(), timeNeeded: z.string(), bestTime: z.string(), entry: z.string(),
  })),
  plans: z.object({ "2": z.array(DayPlanSchema), "3": z.array(DayPlanSchema), "5": z.array(DayPlanSchema) }),
  food: z.array(z.object({
    name: z.string(), type: z.enum(["veg", "nonveg", "both", "snack"]), about: z.string(), where: z.string(), approxINR: z.number(),
  })),
  gettingAround: z.array(z.string()),
  safetyAndPermits: z.array(z.string()),
  localTips: z.array(z.string()),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })),
});

export type GuideContent = z.infer<typeof GuideContentSchema>;
export type GuideDayPlan = z.infer<typeof DayPlanSchema>;

/** Shape of guides.generated.json entries. Only `reviewed: true` entries are shown on the site. */
export const StoredGuideSchema = z.object({
  reviewed: z.boolean(),
  generatedAt: z.string(),
  model: z.string(),
  content: GuideContentSchema,
});
export type StoredGuide = z.infer<typeof StoredGuideSchema>;
