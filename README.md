# Pocketways (Next.js)

Budget trip planner for India: pick a city, budget and days, get trips you can afford with costs, routes and day plans.

**Stack:** Next.js (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Zustand · TanStack Query · MapLibre GL · Drizzle ORM + libSQL · Zod · Vitest

## Run

```powershell
npm install
copy .env.example .env.local   # optional: add TRAVELPAYOUTS_TOKEN for live fares
npm run dev                    # http://localhost:3100
```

`FARE_MOCK=1` (in `.env.local`) returns fake fares so the "LIVE/DEMO" UI can be tried without a token.
The poll database is created automatically at `data/pocketways.db` on first use. For production use a Turso URL in `DATABASE_URL` (+ `DATABASE_AUTH_TOKEN`).

```powershell
npm run build    # production build (guides are statically generated)
npm test         # engine parity tests (needs `vite` installed as a dev dependency)
npm run typecheck
```

## Layout

| Path | What |
| --- | --- |
| `src/lib/engine.ts` | Pure trip engine (costs, travel modes, scoring, filters, itinerary). Parity-tested against the original app. |
| `src/lib/data.ts` | 41 destinations, 22 origin cities, 12 vibes |
| `src/lib/store.ts` | Zustand store: trip state, saved trips, compare list, live fares, URL hash sync |
| `src/components/map-view.tsx` | Globe, fly-in, pins, routes, plane animation |
| `src/components/app-shell.tsx` | Home ↔ planner orchestration |
| `src/app/api/fare` | Live flight fares (server-side token, 6 h cache) |
| `src/app/api/poll/**` | "Plan with friends" polls (Zod-validated, rate-limited, Drizzle) |
| `src/app/guides/**` | Statically generated guides + "trips under ₹X from city" pages |
| `scripts/copy-map-worker.mjs` | Copies MapLibre's worker to `public/vendor` (runs on install / dev / build) |

Share links from the original app (`#from=…&trip=…`, `#saved=…`, `#poll=…`) still work.
