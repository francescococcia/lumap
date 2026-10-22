# Lumap

**An open venue map for London community organisers.** Find a room that fits your group, see which venues other organisers have vouched for, ask the city's community memory, and subscribe to a ranked feed of local events.

**Live demo:** [lumap-self.vercel.app](https://lumap-self.vercel.app)

Built at the Grok Bot Community Engineering London Hackathon (22 Oct 2026), Track 4: Open Venue & Events DB.

![Lumap: venue search with pins and the venue panel](docs/screenshot.png)

## What it does

- **Find a room.** Pick an area, capacity, day and time. Lumap searches venues within walking distance (PostGIS) and returns the best three, with a plain-English reason for each match.
- **Map and venue panel.** Results drop onto a MapLibre map as numbered pins. Click a pin or a card to fly to it and open a panel with capacity, distance, trust status, why it matches, a vouch button and directions.
- **Vouch-based trust.** New venues stay pending until trusted organisers vouch for them. The Add venue form shows this flow.
- **Ask Lumap.** Ask questions in text or by voice (Web Speech API). Answers come from Cognee community memory, with their sources.
- **Events feed.** `/api/calendar.ics` serves a ranked London community events feed that you can subscribe to from any calendar app.

## Stack

- Next.js 15 (App Router) and TypeScript
- Tailwind CSS v4, shadcn/ui, Motion and lucide-react, with a light theme
- MapLibre GL 4 with CARTO Positron tiles
- Supabase Postgres with PostGIS and row-level security
- Cognee Cloud for community memory, plus an xAI (Grok) LLM
- Deployed on Vercel

## Vouch trust model

The city starts with a small set of trusted root organisers. An approved organiser can vouch for another organiser, and only vouched organisers can add or edit venue records. Row-level security in Supabase enforces this (see `supabase/policies.sql`). Venues need two vouches before they appear publicly. Unvouched users never see venue contact details, and revoking a vouch hides that organiser's edits again.

In the hackathon demo, the database policies and search are live. The Add venue form and the vouch button in the venue panel are front-end only and don't write to the database yet.

## Data

The venue records in the demo are clearly labelled **EXAMPLE** placeholders. No real venue contact details are published, and the events feed comes from public event listings (`seed/`).

## Run it locally

1. Copy `.env.example` to `.env` and fill in the values below.
2. In the Supabase SQL editor, run `supabase/schema.sql`, `supabase/policies.sql`, `supabase/search.sql` and `supabase/seed.sql`, in that order.
3. Optionally, load community memory with `python scripts/cognee_load.py`.
4. Run `npm install` and then `npm run dev`, and open http://localhost:3000.

### Environment variables

Never commit real values.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the browser search client
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: server routes
- `SUPABASE_SERVICE_ROLE_KEY`: seeding only; keep it off the server and out of Vercel
- `LLM_API_KEY`: xAI (Grok)
- `COGNEE_API_KEY`, `COGNEE_BASE_URL`, `COGNEE_TENANT_ID`
- `COGNEE_DATASET`: optional; defaults to `lumap_london`

## Fork it for another city

`config/city.json` holds the city name, slug, map centre and trusted root organisers. To start a fork, edit that file, replace the London seeds in `seed/` and `supabase/seed.sql`, add your root organisers, and apply the Supabase schema and policies.

## Licence

[MIT](LICENSE) © 2026 Francesco Coccia
