/**
 * Generate long-form guide content with an AI model, one destination at a time.
 *
 *   npm run guides:generate                 # every destination that has no entry yet
 *   npm run guides:generate -- --only goa,manali
 *   npm run guides:generate -- --force      # regenerate even if an entry exists
 *   npm run guides:approve -- goa,manali    # mark reviewed => shown on the site
 *   npm run guides:approve -- all
 *
 * Env (any OpenAI-compatible chat completions API):
 *   AI_API_KEY   required
 *   AI_MODEL     required, e.g. gpt-4.1 or any model your provider offers
 *   AI_BASE_URL  optional, default https://api.openai.com/v1
 *
 * Output goes to src/lib/guides.generated.json with reviewed:false.
 * Read each entry, fix mistakes (hotel names, prices, opening rules), then approve it.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DESTINATIONS } from "../src/lib/data.ts";
import { GuideContentSchema, type StoredGuide } from "../src/lib/guide-content.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/lib/guides.generated.json");

for (const f of [".env.local", ".env"]) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const val = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const store: Record<string, StoredGuide> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8") || "{}") : {};
const save = () => writeFileSync(OUT, JSON.stringify(store, null, 2) + "\n", "utf8");

// ---- approve mode
if (args[0] === "approve") {
  const ids = args[1] === "all" ? Object.keys(store) : (args[1] ?? "").split(",").filter(Boolean);
  if (!ids.length) { console.error("Usage: guides:approve -- goa,manali | all"); process.exit(1); }
  for (const id of ids) {
    if (!store[id]) { console.warn(`skip ${id}: no entry`); continue; }
    store[id].reviewed = true;
    console.log(`approved ${id}`);
  }
  save();
  process.exit(0);
}

// ---- generate mode
const KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL;
const BASE = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
if (!KEY || !MODEL) {
  console.error("Set AI_API_KEY and AI_MODEL (and optionally AI_BASE_URL) in .env.local or the environment.");
  process.exit(1);
}

const only = val("only")?.split(",");
const targets = DESTINATIONS.filter((d) => (only ? only.includes(d.id) : flag("force") || !store[d.id]));
if (!targets.length) { console.log("Nothing to do."); process.exit(0); }

const SYSTEM = `You are a careful Indian travel writer producing a trip guide for Indian travellers.
Rules:
- Be accurate. If you are not sure of a fact (an exact price, timing, a business name), describe it generally instead of inventing specifics. Never invent hotel or restaurant names; name areas, markets and well-known landmarks only.
- All money is in INR, realistic for the current year, per person unless stated.
- Every meal must have BOTH a vegetarian and a non-vegetarian suggestion (for places where non-veg is uncommon, say what is available and be honest).
- Respect the given facts (best months, highlights, dishes) and extend them; do not contradict them.
- Plans must be geographically sensible: group nearby places on the same day and mention how to travel.
- "plans" must contain exactly 2, 3 and 5 day itineraries. The first day includes arrival, the last day includes departure.
- Reply with JSON only, matching the requested schema.`;

const SHAPE = `{
 "overview": string, "knowFirst": string[],
 "areas": [{"name","vibe","bestFor","approxRoomINR": number}],
 "sights": [{"name","why","timeNeeded","bestTime","entry"}],
 "plans": {"2": Day[], "3": Day[], "5": Day[]},
 "food": [{"name","type":"veg"|"nonveg"|"both"|"snack","about","where","approxINR": number}],
 "gettingAround": string[], "safetyAndPermits": string[], "localTips": string[],
 "faqs": [{"q","a"}]
}
Day = {"title","stayArea","morning","afternoon","evening","breakfast":{"veg","nonveg"},"lunch":{"veg","nonveg"},"dinner":{"veg","nonveg"},"getAround"}
Aim for: 6-10 sights, 4-6 areas, 8-12 food items, 5-8 faqs.`;

async function ask(prompt: string): Promise<unknown> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const j = (await res.json()) as { choices: { message: { content: string } }[] };
  return JSON.parse(j.choices[0].message.content);
}

for (const d of targets) {
  const facts = {
    name: d.name, state: d.state, country: d.country ?? "India", description: d.desc, tags: d.tags,
    bestMonths: d.best, avoidMonths: d.avoid, visa: d.visa,
    typicalDailyFoodINR: d.food, localTransportPerVehicleDayINR: d.local, budgetRoomPerNightINR: d.stay,
    highlights: d.hl, signatureFood: d.eat, tips: d.tips, skip: d.skip, nearby: d.near,
  };
  const prompt = `Write the guide for ${d.name}.\nKnown facts (JSON):\n${JSON.stringify(facts, null, 2)}\n\nReturn JSON with this shape:\n${SHAPE}`;
  process.stdout.write(`${d.id} ... `);
  let done = false;
  let lastErr = "";
  for (let attempt = 1; attempt <= 2 && !done; attempt++) {
    try {
      const parsed = GuideContentSchema.safeParse(await ask(attempt === 1 ? prompt : `${prompt}\n\nYour previous reply failed validation: ${lastErr}. Fix it.`));
      if (!parsed.success) { lastErr = parsed.error.message.slice(0, 600); continue; }
      store[d.id] = { reviewed: false, generatedAt: new Date().toISOString(), model: MODEL, content: parsed.data };
      save();
      done = true;
      console.log("ok (needs review)");
    } catch (e) {
      lastErr = String(e).slice(0, 600);
    }
  }
  if (!done) console.log(`FAILED: ${lastErr}`);
}
