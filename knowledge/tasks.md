# Lumap build queue

How this works: each agent takes ONE task, does only that, commits, ticks the box, writes one line under "Notes", and stops.
Tasks in the same lane must run in order. Tasks in different lanes (DB, UI) can run in parallel in separate agents.
Each task should take about 10–20 minutes. If a task grows bigger, split it into new cards instead of continuing.

## Setup checklist (do before DB1, about 10 minutes)
- [ ] **S1 Supabase project**: create it at supabase.com, then turn on the `postgis` extension (Database > Extensions).
- [ ] **S2 .env**: copy `.env.example` to `.env` and fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (seed only, never commit it) and `LLM_API_KEY`.
- [ ] **S3 Supabase MCP in Cursor**: so agents can run SQL and inspect tables themselves.
- [ ] **S4 (optional) shadcn MCP and Magic UI MCP in Cursor**: so agents pull real components.
- [ ] **S5 GitHub**: create an empty public repo `lumap`, then `git remote add origin ...` and `git push -u origin main`.
- [ ] **S6 Cognee (for X1)**: a Cognee Cloud key in `.env` as `COGNEE_API_KEY`, or `pip install cognee` (uses `LLM_API_KEY`).
- Map: MapLibre with CARTO Positron or OpenFreeMap tiles. No key.
- Voice: the browser's built-in Web Speech API in Chrome. No key, no Whisper.

## Lane DB (Supabase)
- [ ] **DB1 Schema**: `supabase/schema.sql` with organisers, vouches, venues (PostGIS geography point), hosted_events, communities. Done when the SQL runs in the Supabase SQL editor.
- [ ] **DB2 Trust rules**: RLS policies so only vouched organisers can insert or update venues, contact is hidden from unvouched users, and vouches can be revoked. Root organisers come from `config/city.json`. Done when the policies are in `supabase/policies.sql`.
- [x] **DB3 Luma snapshot**: a script that fetches the Luma London discover feed once and saves `seed/luma-london.json`, then `seed/seed.ts` loads venues and hosted_events from it. Done when `npm run seed` fills the tables.
- [ ] **DB4 Search query**: a Postgres function `search_venues(lat, lng, radius_m, min_capacity, day, time)` that returns the top 3 with a reason string. Done when it returns rows for Old Street, 80 people.

## Lane UI (Next.js, light theme, match docs/lumap-mockup.jpg)
- [ ] **UI1 Scaffold**: Next.js + Tailwind + shadcn/ui + motion + lucide-react. Top bar as in the mockup. Done when `npm run dev` shows the top bar.
- [ ] **UI2 Map**: MapLibre light map of London with pins from mock data (green for vouched, amber for pending). Done when the pins show.
- [ ] **UI3 Chat panel**: floating white panel, input with a mic icon, suggested prompt chips, result cards (Magic UI animated list). Mock data only. Done when it looks like the mockup.
- [ ] **UI4 Search moment**: on submit, fly to the area, draw the radius, drop numbered pins 1–3, show the "found in Xs" ticker. Done when it animates with mock data.
- [ ] **UI5 Add venue form**: shadcn form, with a shake plus a red toast when the post is rejected. Done when it submits to a stub.

## Lane Wire (after DB4 and UI4)
- [ ] **W1 Connect search**: parse the chat text into capacity, area, day and time (LLM with a regex fallback), call `search_venues`, render real results. Done when the Old Street question returns real venues.
- [ ] **W2 Connect add venue**: insert through Supabase, so a vouched user succeeds and an unvouched user gets the readable error. Done when both cases work live.
- [ ] **W3 Draft request**: the button opens a drafted email (mailto, or a demo inbox). Done when the draft opens.
- [ ] **W4 Events feed and .ics**: `/events` page plus `/api/calendar.ics` from hosted_events. Done when the .ics downloads.

## Lane Extra (only after W1–W3 work)
- [ ] **X1 Cognee**: add hosted_events and notes, and use them for the "why this venue" line. Fallback: the SQL reason string.
- [ ] **X2 Voice**: hold-to-talk mic using the browser Web Speech API, live transcript into the input. Fallback: typing.
- [ ] **X3 Ship**: README with a one-command setup, city config doc, public GitHub push.

## Notes
- DB3 (hackbot): seed/ has the Luma snapshot from 22 Oct with 59 upcoming events, 34 with addresses, and 32 candidate venues (status pending, max_guest_count_lower_bound isn't real capacity). There's no personal host info. The DB1 seed script should load seed/venues-candidates.json and seed/hosted_events.json. Venues collected in the room tonight are the main data.
- Events (hackbot): seed/events-all.json has 95 events from Luma, Meetup, BuilderBase, MLH and Devpost, ranked with reasons[]. For W4, hide events that already started (or give 'happening now' zero recency points), or tonight's events crowd the top. Never commit a raw/ folder.
