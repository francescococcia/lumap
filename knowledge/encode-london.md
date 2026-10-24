# Lumap @ Encode London: accessible venue finder

Encode Hub, 41 Pitfield St, N1 6DA · Fri 23 to Sun 25 Oct 2026 · all times BST (Europe/London)
Sunday: final build and submissions, **event ends 16:30**. Exact code freeze **TBC, confirm at the desk**.
Repo: francescococcia/lumap, branch `encode-london` (= `build`). Live: lumap-self.vercel.app

## 1. Pitch and user
- **Pitch:** Ask "step-free space for 80 next Thursday near Old Street" and Lumap reads venue photos, listings, OSM, TfL and the weather to show the top 3 with reasons and confidence. It says "not sure" when it can't tell.
- **Named user:** Priya (persona), runs a 60–80 person London meetup that includes wheelchair users. Today she phones every venue to ask "is it really step-free?"
- **Track:** The Real World. Stack-ons: Agents That Ship (draft-and-approve email). Gemini and MongoDB are optional, see risks.

## 2. Exists vs new
**Exists (committed before kickoff, last pre-kickoff commit `5809e2d`, Fri 16:44):**
- [x] Next.js 15 + Tailwind 4 + shadcn + MapLibre 4.7.1 map with venue pins and venue panel (`venue-home`, `venue-map`)
- [x] Find a room: area, capacity, date and time, PostGIS `search_venues` (`supabase/search.sql`)
- [x] Ask panel + `/api/ask`: Cognee Cloud memory + xAI Grok, grounded prompt, London date resolution, local instant answers (`ask-local.ts`)
- [x] Vouch trust: Supabase RLS, shared review queue, 2-vouch trigger (`/review`, migrations 23 Oct)
- [x] Data: 38 + 6 public-source venues (`src/data/venue-facts.json`), Luma seed (59 events, 32 candidate venues), events feed + `/api/calendar.ics`, co-working sessions
- [x] Voice ask (Web Speech API)

**Committed Fri 17:14–18:54, after kickoff but before the Encode angle:** magic-link auth, sign-in gating, venue_reports, date picker, postcode origin, Ask prompt/date fixes (23 commits). Disclose these as general Lumap polish, not the Encode feature.

**New for Encode (none of this exists yet):** venue photos, vision access read, OSM wheelchair tags, TfL step-free, Open-Meteo, confidence scores, access ranking, approve-before-send email, face blur, action log.

## 3. Build order (timeboxed, with fallbacks)
First: tag the baseline, `git tag encode-baseline 5809e2d && git push --tags` (2 min).

| # | Feature | Box | When | Fallback |
|---|---|---|---|---|
| E1 | `access` schema: photos, per-venue access fields + confidence + source, `actions_log` table | 30m | Sat 18:00 | JSON file in `src/data/` |
| E2 | Photo intake: upload 1–3 photos per venue (+ 1 deliberately blurry); **in-browser face blur** before upload; EXIF/GPS stripped | 60m | Sat 18:30 | Use pre-blurred, EXIF-stripped demo photos |
| E3 | Vision read `/api/access-read`: step-free entrance, steps count, seating, AV, noise → JSON `{value, confidence, evidence}`; "not sure" if blurry/absent | 75m | Sat 19:30 | Text-only read of listing page |
| E4 | OSM: Overpass `wheelchair=*` / `toilets:wheelchair` near venue lat/lng | 30m | Sat 21:00 | Cached `seed/osm-access.json` |
| E5 | TfL: nearest step-free station + journey time (Journey Planner, step-free preference) | 45m | Sun 09:00 | Cached responses for demo venues |
| E6 | Open-Meteo: forecast for the event evening (rain/temp) as a reason line | 20m | Sun 09:45 | Hide the line |
| E7 | Ranking + UI: top 3 on map, reason chips, confidence badge, "not sure" chip, sources | 60m | Sun 10:05 | Plain list under Ask panel |
| E8 | Agent step: draft request email asking unknowns; **user approves** → demo inbox only; every step written to `actions_log` and shown | 45m | Sun 11:05 | mailto: draft + log panel |
| — | Feature freeze, README, video, submit | — | Sun 12:30 | — |
Rule: 15-min debug cap per bug, then fallback. Stretch, only if E1–E8 are done by Sun 12:00: Gemini verification loop.

## 4. Data sources and models
| Source / model | Used for | Status |
|---|---|---|
| `venue-facts.json` (public venue pages, Luma) | venue list, capacity, hours | exists |
| Supabase Postgres + PostGIS + RLS | venues, trust, new access fields | exists / extend |
| Cognee Cloud + xAI Grok | Ask answers (grounded) | exists |
| Venue photos (own photos / venue's public pages, licence noted) | vision access read | new |
| Vision LLM (Grok vision or Gemini, decide Sat 18:00) | photo + listing → access JSON + confidence | new |
| Browser face detector (e.g. MediaPipe) | blur faces/plates before upload | new |
| OpenStreetMap Overpass | `wheelchair`, `toilets:wheelchair` tags | new |
| TfL Unified API | nearest step-free station, journey time | new |
| Open-Meteo | evening forecast | new |
| postcodes.io | origin geocoding | exists |
Not using now: London Datastore, Met Office, Breathe London, EA flood API. Mention them as next steps.

## 5. Demo script (3:00, real inputs)
- 0:00 Priya's problem: "Step-free claims are vague, so I phone ten venues."
- 0:15 Disclosure line: "Map, search and vouching existed before Friday. Everything you'll see next was built at Encode."
- 0:25 Ask: "step-free space for 80 next Thursday near Old Street"
- 0:40 Upload a real entrance photo: faces blur on screen before upload
- 1:00 Vision read: "1 step at entrance, ramp visible, 0.8 confidence" + evidence
- 1:20 Blurry photo → "Not sure: photo unclear. Ask the venue." (honesty)
- 1:40 OSM tag + TfL "Old St, step-free to platform? / 9 min" + Open-Meteo "rain 70%, entrance covered?"
- 2:05 Top 3 on map with reasons + confidence chips; one venue has a data gap, shown as such
- 2:25 Agent drafts an email asking the unknowns → Priya edits and approves → lands in demo inbox; action log shown
- 2:45 Privacy: no personal location stored, faces blurred, EXIF stripped. Models + data list. Close.

## 6. Submission checklist
**Real World:**
- [ ] Working demo, live URL opens logged-out
- [ ] Repo public, README: what's new at Encode, setup, env vars, `.env.example`, no secrets
- [ ] 2–4 min video on real inputs (real photos, incl. blurry one), uploaded
- [ ] Note on models + data sources (copy table §4 into README)
- [ ] Responsibility section: face/plate blur, EXIF strip, no user location stored, confidence + "not sure"
- [ ] Disclosure note (§7) in README and form
**Checkpoint 2 form:**
- [ ] Live demo link (placeholder OK): lumap-self.vercel.app
- [ ] GitHub link: https://github.com/francescococcia/lumap (branch `encode-london`)
- [ ] What are you building: 2 sentences from §1
- [ ] Bounties: The Real World (+ Agents That Ship if E8 works). Gemini / MongoDB only if actually built
- [ ] Problem + who: Priya, organisers needing step-free venues
- [ ] Project image: `docs/screenshot.png` or new access screenshot
- [ ] Submit before the deadline minus 20 min; screenshot the confirmation

## 7. Disclosure note (paste into README + form)
> Lumap started at the Grok Bot Community Engineering London Hackathon (22 Oct 2026). Before Encode kickoff (Fri 23 Oct, 17:00 BST) it already had the venue map, room search, Ask panel (Cognee + Grok), vouch-based trust (Supabase RLS) and Luma event data; the last pre-kickoff commit is `5809e2d`, tagged `encode-baseline`. Some general polish (sign-in, date picker, Ask fixes) was committed on Friday evening. Built during Encode: photo intake with face blur, AI access reading with confidence and "not sure", OSM, TfL and Open-Meteo signals, accessible top-3 ranking, and the approve-before-send request agent with an action log. See `git diff encode-baseline..encode-london`.

## 8. Risks
- [ ] **Prior-work rule:** judges may discount pre-built parts. Disclose up front and demo only Encode features.
- [ ] **Gemini 4 Argon bounty:** demo must show only hackathon code and pre-kickoff projects are disqualified. **High risk for Lumap; skip unless organisers confirm in writing.**
- [ ] **MongoDB Atlas:** means moving core data off Supabase (RLS, PostGIS). That's a big rewrite and a cost to check. Skip.
- [ ] Vision overconfidence: show evidence + confidence; never say "accessible", say "looks step-free, confirm"
- [ ] Photo rights/privacy: own photos or licensed; blur before upload; no faces in the video
- [ ] TfL/Overpass rate limits or downtime: cache demo venues
- [ ] Code freeze TBC: assume Sun 12:30 freeze until confirmed
- [ ] Email: demo inbox only, never real venue contacts
- [ ] Keys: no secrets in repo/video; rotate any pasted key after the event
