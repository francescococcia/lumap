# Lumap @ Encode London: accessible venue finder

Encode Hub, 41 Pitfield St, N1 6DA · Fri 23 to Sun 25 Oct 2026 · all times BST (Europe/London)
Sun (GMT after clocks go back): **feature freeze 10:30 · video by 11:30 · submit by 12:00 (no late entries)** · top 10 pitch 15:00 · ends about 16:30. Event facts: `event.md`. Sponsor plan: `sponsors-fit.md`.
Repo: francescococcia/lumap, branch `encode-london` (= `build`). Live: lumap-self.vercel.app

## 1. Pitch and user
- **Pitch:** Ask "step-free space for 80 next Thursday near Old Street" and Lumap reads venue photos, listings, OSM, TfL and the weather to show the top 3 with reasons and confidence. It says "not sure" when it can't tell.
- **Named user:** Priya (persona), runs a 60–80 person London meetup that includes wheelchair users. Today she phones every venue to ask "is it really step-free?"
- **Bounties:** The Real World + Agents That Ship (entered at CP2). MongoDB if gate G2 passes; Gemini Argon only if the mentors say yes (G1). See `sponsors-fit.md`.

## Product base (before Encode)
An open venue map for London community organisers: find a room by area, capacity, date and time (PostGIS), see venues other organisers vouched for (Supabase RLS), ask in text or by voice (Cognee + Grok), and subscribe to a ranked events feed (`.ics`). Venue facts come only from public pages, with sources. Forkable per city via `config/city.json`.

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
Bounties and the reasoning are in `sponsors-fit.md`. Saturday times are BST. **Clocks go back at 02:00, so Sunday times are GMT.**

**Now (Sat 18:00–18:30):**
- [ ] Tag the baseline: `git tag encode-baseline 5809e2d && git push --tags` (2 min)
- [ ] Claim credits: Gemini (QR form), Treg (treg.to, same email), MongoDB $100 (booth, ground floor)
- [ ] G1: ask Amit or Geneviève the Argon eligibility question (`sponsors-fit.md` §3)
- [ ] Ask the MongoDB booth the "does a partial layer count as core" question (`sponsors-fit.md` §4)

| # | Feature | Box | Start | Fallback |
|---|---|---|---|---|
| E1 | Access store: `access_assessments` (field, value, confidence, evidence, source), `agent_actions` log. **On Atlas** if going for MongoDB, otherwise Supabase | 45m | Sat 18:30 | JSON in `src/data/` |
| E3 | Access read `/api/access-read` on Gemini (`gemini-4-argon`, or `gemini-3.8-flash`): photo + listing → step-free entrance, steps, toilet, seating, AV, noise, each with `{value, confidence, evidence}`; "not sure" when blurry or missing | 90m | Sat 19:15 | Text-only read of the listing page |
| E4 | OSM Overpass: `wheelchair`, `toilets:wheelchair` near the venue | 30m | Sat 20:45 | Cached `seed/osm-access.json` |
| E5 | TfL: nearest step-free station + journey time; **verify loop**: each AI claim → confirmed / contradicted / unknown vs OSM/TfL | 60m | Sat 21:15 | Cached TfL responses for the demo venues |
| E7 | Ranking + UI: top 3 on the map, reason chips, confidence badge, "not sure" chip, sources | 60m | Sat 22:15 | Plain list under the Ask panel |
| M1 | *(MongoDB only)* Atlas Hybrid Search (text + vector, Automated Embedding or Voyage) drives the "quiet step-free room like X" query | 60m | Sat 23:15 | Skip and drop the MongoDB bounty |
| E2 | Privacy: in-browser face/plate blur before upload, EXIF/GPS stripped, no user location stored | 60m | Sun 07:30 | Pre-blurred, EXIF-stripped demo photos |
| E8 | Agent: unknowns → drafted request email → **user approves** → demo inbox only; every step in `agent_actions` and shown | 45m | Sun 08:30 | mailto: draft + log panel |
| — | **G2 Sun 09:00:** is M1 working? Enter MongoDB yes/no | — | Sun 09:00 | — |
| E6 | Open-Meteo: forecast for the event evening as a reason line | 20m | Sun 09:15 | Hide the line |
| D1 | README: models & data sources, responsibility, disclosure, setup, env vars | 30m | Sun 09:35 | — |
| — | **Feature freeze** | — | **Sun 10:30** | — |
| — | Record the 3:00 video on real inputs (+ backup take) | 60m | Sun 10:30 | First take |
| — | **Submit CP3** (video, repo, bounties); screenshot the confirmation | 20m | **by 11:40** (hard 12:00) | — |

Rules: 15-min debug cap per bug, then use the fallback. Cut order if late: E6 → M1 → E2 (use the fallback) → E8 (mailto fallback). Never cut E3, E5 or E7.

## 4. Data sources and models
| Source / model | Used for | Status |
|---|---|---|
| `venue-facts.json` (public venue pages, Luma) | venue list, capacity, hours | exists |
| Supabase Postgres + PostGIS + RLS | venues, trust, new access fields | exists / extend |
| Cognee Cloud + xAI Grok | Ask answers (grounded) | exists |
| Venue photos (own photos / venue's public pages, licence noted) | vision access read | new |
| Gemini API: `gemini-4-argon` or `gemini-3.8-flash` | photo + listing → access JSON + confidence; claim verification | new |
| MongoDB Atlas + Hybrid Search (if G2) | access assessments, reviews, agent log, accessible search | new |
| Treg (optional) | scrape venues' public access pages into a cached seed | new |
| Browser face detector (e.g. MediaPipe) | blur faces/plates before upload | new |
| OpenStreetMap Overpass | `wheelchair`, `toilets:wheelchair` tags | new |
| TfL Unified API | nearest step-free station, journey time | new |
| Open-Meteo | evening forecast | new |
| postcodes.io | origin geocoding | exists |
Not using now: London Datastore, Met Office, Breathe London, EA flood API. Mention them as next steps.

## 5. Demo script (3:00, real inputs, no slides)
- 0:00 Priya's problem: "Step-free claims are vague, so I phone ten venues."
- 0:15 Disclosure: "The map and chat existed before Friday. Everything you'll see next was built at Encode."
- 0:25 Ask: "step-free space for 80 next Thursday near Old Street"
- 0:40 Upload a real entrance photo: faces blur on screen before upload
- 1:00 Access read: "1 step at entrance, ramp visible, 0.8 confidence" + evidence
- 1:20 Blurry photo → "Not sure: photo unclear. Ask the venue." (honesty)
- 1:35 Verify loop: OSM `wheelchair=yes` confirms · TfL "Old Street: step-free? / 9 min" · one claim contradicted and flagged
- 1:55 Top 3 on the map with reasons + confidence chips; one data gap shown as a gap (+ "quiet step-free room like X" via Atlas, if G2)
- 2:15 Agent drafts an email asking about the unknowns → Priya edits and approves → it lands in the demo inbox; action log shown
- 2:40 Privacy: faces blurred, EXIF stripped, no personal location stored. Models + data sources. Close.
- Finale (if top 10): same beats live, 3 min, no slides.

## 6. Submission checklist
**Real World:**
- [ ] Working demo, live URL opens logged-out
- [ ] Repo public, README: what's new at Encode, setup, env vars, `.env.example`, no secrets
- [ ] 2–4 min video on real inputs (real photos, incl. blurry one), uploaded
- [ ] Note on models + data sources (copy table §4 into README)
- [ ] Responsibility section: face/plate blur, EXIF strip, no user location stored, confidence + "not sure"
- [ ] Disclosure note (§7) in README and form
**Checkpoint 2 (done Sat 18:00 BST):**
- [ ] Live demo link (placeholder OK): lumap-self.vercel.app
- [ ] GitHub link: https://github.com/francescococcia/lumap (branch `encode-london`)
- [ ] What are you building: 2 sentences from §1
- [x] Bounties at CP2: The Real World + Agents That Ship
- [ ] Problem + who: Priya, organisers needing step-free venues
- [ ] Project image: `docs/screenshot.png` or new access screenshot
**CP3 final (Sun 12:00 GMT, no late entries):**
- [ ] Demo video (3:00, works for the 2–4 min Encode rule and the 3-min sponsor rule)
- [ ] Code repo link
- [ ] Bounties: The Real World + Agents That Ship (+ MongoDB if G2, + Gemini if G1)
- [ ] Agents That Ship note: tools, steps, where the human approves
- [ ] Sponsor notes: which Gemini models and how; MongoDB features used (if entered)
- [ ] Submit by 11:40; screenshot the confirmation

## 7. Disclosure note (paste into README + form)
> Lumap's base started at an earlier hackathon on 22 Oct 2026. Before Encode kickoff (Fri 23 Oct, 17:00 BST) it already had the venue map, room search, Ask panel (Cognee + Grok), vouch-based trust (Supabase RLS) and Luma event data; the last pre-kickoff commit is `5809e2d`, tagged `encode-baseline`. Some general polish (sign-in, date picker, Ask fixes) was committed on Friday evening. Built during Encode: photo intake with face blur, AI access reading with confidence and "not sure", OSM, TfL and Open-Meteo signals, accessible top-3 ranking, and the approve-before-send request agent with an action log. See `git diff encode-baseline..encode-london`.

## 8. Risks
- [ ] **Prior work:** judges may discount the pre-built parts. Disclose up front and demo only Encode features.
- [ ] **Gemini Argon eligibility:** "anything built before kickoff" is disqualified. Enter only on a clear yes from the mentors (G1).
- [ ] **MongoDB "core functionality":** a partial Atlas layer may be judged a bolt-on. Make the accessible search and agent log depend on Atlas; confirm at the booth.
- [ ] Vision overconfidence: show evidence + confidence; never say "accessible", say "looks step-free, confirm"
- [ ] Photo rights/privacy: own or licensed photos; blur before upload; no faces in the video
- [ ] TfL/Overpass/Gemini rate limits or downtime: cache the demo venues
- [ ] Clock change Sat→Sun: set alarms in GMT; freeze 10:30, submit 12:00
- [ ] Email: demo inbox only, never real venue contacts. Never say a venue is "free"; say "open then, fits 80, confirm availability".
- [ ] Keys: no secrets in the repo or video; rotate any pasted key after the event
