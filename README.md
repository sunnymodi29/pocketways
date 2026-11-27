<div align="center">

# Pocketways

**Plan trips that fit your pocket.**
Pick a city, a budget and the days you have. Get destinations you can actually afford, with real cost breakdowns, travel options, weather and a day-by-day plan you can edit.

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)
![Postgres](https://img.shields.io/badge/Neon-Postgres-00e599?logo=postgresql&logoColor=white)
![Auth](https://img.shields.io/badge/Auth-Clerk-6c47ff?logo=clerk&logoColor=white)

</div>

---

## Features

**Plan**
- Budget-first search from 22 Indian cities to 41 destinations in India and abroad, ranked by match, price, distance or rating.
- Honest cost breakdown per person and per group: travel, stay, food, local transport, activities, buffer and visa.
- Travel options by flight, train, bus or car, with live flight fares when a [Travelpayouts](https://www.travelpayouts.com) token is set.
- Live 16-day weather forecast (Open-Meteo) and typical weather by month for every destination.
- Cover photos from Unsplash with proper attribution.

**Itinerary**
- Day-by-day plan with breakfast, lunch and dinner, each with a veg and a non-veg option.
- Fully editable: change, delete, reorder (across days) or add your own stops. Edits are kept and used everywhere the plan is exported.
- **Multi-city trips**: chain up to six stops, set days per stop, get priced legs, warnings and one combined itinerary.
- Export to Google Calendar (one click when signed in, or per-day links), Apple/Outlook (`.ics`), print or save as PDF, or share on WhatsApp.

**Together**
- Save trips, compare up to four, and make a share card.
- "Plan with friends" polls: vote on the trips your group likes.
- Sign in with Google (Clerk) to sync saved trips and edited itineraries across devices.
- Statically generated travel guides and "trips under ₹X from your city" pages for SEO.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| UI | Tailwind CSS v4, Radix UI primitives, shadcn-style components, lucide icons |
| State and data | Zustand, TanStack Query, Zod |
| Map | MapLibre GL via react-map-gl |
| Database | Neon (serverless Postgres) with Drizzle ORM |
| Auth | Clerk (Google sign-in, Google Calendar scope) |
| Services | Open-Meteo (weather), Unsplash (photos), Travelpayouts (fares) |
| Tests | Vitest |
| Hosting | Vercel |

## Getting started

Requirements: Node.js 20 or newer and npm.

```bash
git clone <your-repo-url>
cd pocketways
npm install
cp .env.example .env        # Windows PowerShell: copy .env.example .env
npm run dev                 # http://localhost:3100
```

The app runs with just the defaults. Each service below is optional and switches on its feature when its key is set.

### Environment variables

| Variable | Needed for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Polls, synced trips | Neon connection string. Tables are created on first use. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Sign-in, calendar, account sync | From the Clerk dashboard. |
| `UNSPLASH_ACCESS_KEY` | Destination photos | Server-side only. Responses are cached for a week. |
| `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER` | Live flight fares | Without a token, fares are estimates. |
| `FARE_MOCK=1` | Trying the live-fare UI | Returns fake fares in development. |
| `NEXT_PUBLIC_SITE_URL` | Sitemap, canonical links, share previews | Your production URL. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Privacy page | Shown as the contact address. |

Never commit `.env`. It is git-ignored, and only `.env.example` (with empty values) is tracked.

### Setting up Clerk and Google Calendar

1. Create a Clerk application and turn on **Google** under SSO connections.
2. Under Organizations, set membership to **optional**. Pocketways uses plain user accounts.
3. For Calendar access, switch Google to **custom credentials**: create an OAuth client in Google Cloud, enable the Google Calendar API, add your Clerk redirect URI, and add the scope `https://www.googleapis.com/auth/calendar.events`.
4. While your Google app is in testing mode, add your own account as a test user. Google must verify the app before the calendar scope is open to everyone.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3100 |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest, in `tests/`) |

## Project structure

```
src/
  app/                 routes: planner, guides, multi-city, account, polls, legal, API
    api/               fare, photo, weather, calendar, poll, me/data
  components/          UI (kit.tsx has the shared controls; ui/ has primitives)
  db/                  Drizzle schema and Neon connection
  lib/
    engine.ts          pure trip engine: costs, travel modes, scoring, itinerary
    multicity.ts       multi-city legs, costs and combined plan
    data.ts            destinations, origin cities, vibes
    store.ts, edits.ts client state (trips, saved list, itinerary edits)
    export.ts, print.ts calendar, .ics and PDF output
tests/                 unit tests (engine, itinerary, multi-city, exports)
public/                icons, manifest, borders
```

## How the numbers work

Costs are estimates built from typical prices and distances, not quotes. Flights use live fares when available, and everything else comes from per-destination daily costs, a stay-tier multiplier and a season factor. The engine in `src/lib/engine.ts` is pure and unit-tested. Destination content (highlights, dishes, tips, costs) lives in `src/lib/data.ts` and should be reviewed regularly.

## Testing

```bash
npm test
```

Tests live in `tests/`, away from the source. They cover the cost engine, itinerary generation for every destination and trip length, veg and non-veg meal rules, multi-city planning, share text and calendar files. If `vitest` complains about a missing `vite` package, install it with `npm install -D vite`.

## Deploying to Vercel

1. Push this repository to GitHub and import it in Vercel.
2. Add the environment variables above in **Project Settings, Environment Variables**. Use your Clerk production keys and a Neon production database.
3. Set `NEXT_PUBLIC_SITE_URL` to your domain and add that domain in Clerk.
4. Deploy. Guide pages are generated at build time.

## Design principles

One radius scale (containers 20px, cards 14px, controls 10px, pills full), semantic colour tokens only, shared components before new ones, skeletons instead of spinners, real brand logos for WhatsApp and Google, and every screen working in light and dark.

## Roadmap

- Photos and hand-written content for every destination
- Price alerts by email or WhatsApp
- Live hotel and bus prices
- Hindi and other regional languages
- Move destination data to a database or CMS

## Notes

Share links from the earlier version of the app (`#from=…&trip=…`, `#saved=…`, `#poll=…`) still work.

## License

Released under the [GNU General Public License v3.0](LICENSE).
