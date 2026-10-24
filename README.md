# Lumap: accessible venue finder (Encode London 2026)

**Find a London venue your whole group can actually get into.** Lumap reads venue photos and listings, checks them against OpenStreetMap, TfL and the weather, and shows the top 3 with reasons and a confidence level. When it can't tell, it says "not sure" and drafts a question to the venue, which you approve before it's sent.

**For:** London community organisers running 30–100 person events with wheelchair users or people who need step-free access, quiet rooms or seating. Today they phone each venue to ask "is it really step-free?"

**Live demo:** [lumap-self.vercel.app](https://lumap-self.vercel.app) · Built for the **Encode London Hackathon** (23–25 Oct 2026): The Real World + Agents That Ship.

> **Disclosure:** Lumap's base map and chat started at an earlier hackathon on 22 Oct 2026. Last pre-Encode commit: `5809e2d` (tag `encode-baseline`). Encode-built features are listed below; see `git diff encode-baseline..encode-london`.

![Lumap: venue search with pins and the venue panel](docs/screenshot.png)

## Status (Encode checkpoints)
- [x] CP1 Fri 18:00: check-in (idea, bounty)
- [x] CP2 Sat 18:00: progress (demo link, repo, problem). Bounties: The Real World, Agents That Ship
- [ ] CP3 Sun 12:00 GMT: final submission (3-min video, repo, bounties)

## Built at Encode (Fri 23 Oct 17:00 onwards)
- [ ] Photo intake with in-browser face/plate blur and EXIF/GPS stripping
- [ ] AI access read (step-free entrance, steps, toilet, seating, AV, noise) with confidence, evidence and "not sure"
- [ ] Verification loop: each claim checked against OSM `wheelchair` tags and TfL step-free data
- [ ] TfL nearest step-free station + journey time, Open-Meteo evening forecast
- [ ] Accessible top 3 on the map with reasons, confidence and sources
- [ ] Request agent: drafts questions for the unknowns, human approves, sends to a demo inbox only, and logs every step
- [x] General polish on Fri evening (sign-in, date picker, postcode origin, Ask fixes). Not part of the Encode feature.

## Already there before Encode
- **Find a room:** area, capacity, date and time → PostGIS search within walking distance, the best three with a reason each.
- **Map and venue panel:** MapLibre pins; click for capacity, distance, trust status, organiser details and directions.
- **Vouch-based trust:** venues and reports need vouched organisers (Supabase RLS, a shared review queue, a 2-vouch trigger).
- **Ask Lumap:** text or voice (Web Speech API), answered from Cognee community memory + Grok, with sources.
- **Events feed:** `/api/calendar.ics`, a ranked London community events feed.

## Models & data sources
*(fill in as built)*
| Model / source | Used for |
|---|---|
| Gemini API (`gemini-4-argon` / `gemini-3.8-flash`, TBD) | photo + listing access read, claim verification |
| xAI Grok + Cognee Cloud | Ask answers (grounded in retrieved docs) |
| OpenStreetMap (Overpass) | `wheelchair`, `toilets:wheelchair` tags |
| TfL Unified API | step-free stations, journey time |
| Open-Meteo | evening forecast |
| postcodes.io | origin geocoding |
| Public venue pages, Luma | venue facts with source URLs (`src/data/venue-facts.json`) |
| MongoDB Atlas (if used) | access assessments, agent log, hybrid search |

## Responsibility
- Faces and number plates are blurred in the browser before upload; EXIF/GPS is stripped.
- No personal location is stored; the origin is used for the search only.
- Every access claim shows its confidence and evidence; unclear inputs give "not sure", never a guess.
- The agent never sends without approval, and only to a demo inbox.

## Stack

- Next.js 15 (App Router) and TypeScript
- Tailwind CSS v4, shadcn/ui, Motion and lucide-react, with a light theme
- MapLibre GL 4 with CARTO Positron tiles
- Supabase Postgres with PostGIS and row-level security
- Cognee Cloud for community memory, plus an xAI (Grok) LLM
- Deployed on Vercel

## Vouch trust model

The city starts with a small set of trusted root organisers. An approved organiser can vouch for another, and only vouched organisers can add or edit venue records. Row-level security in Supabase enforces this (`supabase/policies.sql`). Venues need two vouches before they appear publicly, unvouched users never see venue contact details, and revoking a vouch hides that organiser's edits again.

## Data

The old **EXAMPLE** venues have been removed. Venue types, hours and capacity come only from public pages (venue websites, Luma, listing sites), with every source URL kept in `src/data/venue-facts.json`. Recurring sessions such as Co-Working Fridays at Somerset House are in `src/data/recurring-sessions.json`. No venue contact details are published, and the events feed comes from public event listings (`seed/`). The three trust roots in `config/city.json` are still placeholder accounts.

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
