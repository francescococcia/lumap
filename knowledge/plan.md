# Lumap Near Me: plan (Encode London 2026)

**One screen that tells you what's happening around a London spot right now, answers questions about it in plain English, and gets you there.**
Branch `encode-london` · Live: lumap-self.vercel.app · Event facts: `event.md` · Pitch and demo: `pitch.md`.
Effort: **S** ≤30 min · **M** 30–90 min · **L** >90 min. Saturday times BST. **Clocks go back at 02:00 Sun, so Sunday times are GMT.** Freeze **Sun 10:30 GMT** · video by 11:30 · submit **Sun 12:00 GMT** (no late entries).
Live-tested on Sat 24 Oct 2026 ~18:00 BST from Encode Hub (51.5287, -0.0838) unless marked otherwise.

## 1. Problem and user
- **Problem:** what's going on around a place is spread across a dozen sites: TfL status, roadworks, planning notices, Luma, the weather, air quality. Nobody checks them all, so people turn up to closed stations, roadworks and rain, and organisers pick venues blind.
- **Primary user (real, recommended):** Francesco, an organiser who just arrived at Encode Hub in Shoreditch. He wants to know "what's on tonight near here, and how do I get there step-free if it rains?" and, when he finds a good spot, to turn it into a Luma event.
- **Second user (example persona, invented, rename to a real person if possible):** Priya, a newcomer to Hoxton who uses a wheelchair and wants to know what's changing on her street (works, planning, step-free routes).
- [ ] Decide which named person leads the pitch (open decision D1). Judges score "a problem for a named person".

## 2. Goals and non-goals
**Goals**
- [ ] One neighbourhood view (map + briefing + Ask) from live open data, for any London point
- [ ] A helpful assistant: answers with sources, freshness and confidence; says what's missing
- [ ] "Get me there": TfL journey with step-free options, live disruptions, walk/cycle, weather advice
- [ ] Photo actions with human approval: "create an event here" on Luma, "add this place" (OSM note + Google link)
- [ ] Action log: every tool call and approval visible

**Non-goals (this weekend)**
- Not outside London (TfL and the Planning London Datahub are London only)
- No historic analytics, no accounts beyond the existing magic link, no native app
- No auto-publishing without a human click; no posting to Google (no API exists)
- No storing user locations or raw photos

## 3. The experience (one screen)
- **Map (left):** pin at "you" (browser location, or tap/postcode). Layers with toggles: Luma events + Lumap venues (existing), roadworks, planning applications, stations (step-free badge), air quality, flood alerts.
- **Briefing card (top right), 5 lines, each with source + "updated X min ago":**
  - Transport: line status for nearby lines + nearest step-free station
  - Works: roadworks within 800 m
  - Planning: new applications within 400 m (last 30 days)
  - Weather: next 6 h (rain %, wind) + air quality index
  - On tonight: Luma events nearby
- **Ask (bottom right, existing panel, text or voice):** answers with chips that open on the map.
- **Photo button:** take/upload → privacy step → "What is this?" → actions: Create Luma event here · Add this place · Ask about it.
- **Action log drawer:** tool calls, approvals, results, timestamps.

## 4. The assistant
**Example questions**
- "What's happening near me tonight?" → events + disruptions + weather, ranked by distance and time
- "Is anything being built on Pitfield Street?" → planning applications within 400 m with status and link
- "Take me to the best event tonight, step-free, I don't want to get wet" → event pick + TfL step-free journey + rain advice
- "Why is Old Street so slow?" → roadworks at Old Street/Vince St junction + bus/line status
- "Is the air OK for a run along the canal?" → LAQN index for the nearest site, with the time of the reading

**Answer style (rules for the system prompt)**
- [ ] Lead with the answer in 1–2 sentences, then up to 3 bullet facts
- [ ] Every fact has a source chip (TfL, PLD, Open-Meteo, LAQN, EA, Luma, Lumap) and its freshness
- [ ] Confidence: high (live API) · medium (cached > 30 min, or inferred from a photo) · low (guess) → say "not sure"
- [ ] **Data missing:** say which source failed or has no data and what that means ("TfL has no step-free data for Old Street Underground; Hoxton Overground, 640 m, has lift access")
- [ ] Never invent opening times, prices, step-free status or addresses

**Does vs asks first**
| Does on its own (read-only) | Asks first (human approves) |
|---|---|
| Fetch any data source, plan a journey, summarise, rank | Create a Luma event (even private) |
| Read a photo (after blur + EXIF strip) | Post an OSM note |
| Draft event text, draft a place note | Upload a photo anywhere |
| Open a Google Maps link | Anything that names a person or uses a contact |

**Tools (function calls)**: `get_briefing(lat,lng)`, `plan_journey(from,to,stepFree,modes)`, `search_events(lat,lng,when)`, `planning_near(lat,lng,radius)`, `roadworks_near(lat,lng,radius)`, `weather(lat,lng)`, `air_quality(lat,lng)`, `read_photo(image)`, `propose_luma_event(...)`, `propose_osm_note(...)`. Proposals return a draft; only the approve button executes.

## 5. Data sources
| What | Endpoint | Key | Freshness | Used for | Checked |
|---|---|---|---|---|---|
| Journey planner | `GET api.tfl.gov.uk/Journey/JourneyResults/{lat,lng}/to/{lat,lng}` + `accessibilityPreference=StepFreeToVehicle\|StepFreeToPlatform\|NoSolidStairs…`, `mode=walking,cycle,…`, `journeyPreference`, `maxWalkingMinutes` | Optional app key (500 req/min default) | live | "Get me there" | 200 OK keyless |
| Line status | `GET api.tfl.gov.uk/Line/Mode/tube,overground,elizabeth-line,dlr/Status` | Optional | live | briefing, disruptions | 200 OK |
| Stations near | `GET api.tfl.gov.uk/StopPoint?lat=&lon=&stopTypes=NaptanMetroStation,NaptanRailStation&radius=` (`additionalProperties` → `AccessViaLift`) | Optional | static | nearest step-free station | 200 OK; Old Street Underground had no accessibility props, Hoxton had `AccessViaLift=Yes` |
| Arrivals | `GET api.tfl.gov.uk/StopPoint/{id}/arrivals` | Optional | live | "next train" | docs only |
| Roadworks | `GET api.tfl.gov.uk/Road/all/Disruption?categories=Works` (point geometry, filter by distance) | Optional | live, planned up to 12 months | Works layer | 200 OK, 110 items, 3 within 1.2 km |
| Planning | `POST planningdata.london.gov.uk/api-guest/applications/_search` (Elasticsearch, header `X-API-AllowRequest` from the PLD doc, `geo_distance` on `centroid`) | Public guest header | daily-ish sync (`last_synced`) | Planning layer | 200 OK, 1,258 apps within 400 m |
| Weather | `GET api.open-meteo.com/v1/forecast?latitude=&longitude=&hourly=temperature_2m,precipitation_probability,wind_speed_10m&timezone=Europe/London` | None | hourly model | weather advice | 200 OK |
| Air quality | `GET api.erg.ic.ac.uk/AirQuality/Hourly/MonitoringIndex/GroupName=London/Json` + `.../Information/MonitoringSites/GroupName=London/Json` (nearest site) | None | hourly | AQ line | 200 OK |
| Flood alerts | `GET environment.data.gov.uk/flood-monitoring/id/floods?lat=&long=&dist=5` | None | 15 min | alert line (shows "none") | 200 OK, 0 alerts |
| Events | Luma seed (`seed/luma-london.json`, 58 events) + existing `/api/calendar.ics` | None | snapshot 22 Oct | On tonight | exists |
| Venues | Supabase/PostGIS + `src/data/venue-facts.json` (44) | existing | static | venue layer | exists |
| OSM notes (read) | `GET api.openstreetmap.org/api/0.6/notes.json?bbox=` | None | live | "already reported?" check | 200 OK |
| Postcodes | postcodes.io | None | static | origin | exists |

**Rejected / later**
- planning.data.gov.uk `entity.json?dataset=planning-application`: dataset marked "incomplete and not yet ready for use", returned 0 records here.
- Met Office DataHub site-specific: needs a registered key (401 without); Open-Meteo is keyless and enough.
- Breathe London: moved to `api.breathelondon-communities.org`, needs a registered key, and the terms limit commercial use; LAQN is keyless.
- Overpass (OSM tags): returned 406 from this box, so keep it optional with a cached fallback.
- iNaturalist / GBIF: both work keyless (`api.inaturalist.org/v1/observations?lat=&lng=&radius=`, `api.gbif.org/v1/occurrence/search`); stretch "nature nearby" only.
- Street Manager (England permits): gated; TfL Works is enough for London.

**Attribution in the footer:** "Powered by TfL Open Data" (+ OS/Geomni statements per TfL terms) · Planning London Datahub (GLA) · Open-Meteo (CC BY 4.0) · LAQN / Imperial College London · Environment Agency (OGL v3) · © OpenStreetMap contributors · Luma.

## 6. Actions (all need human approval, all have a fallback)
**A. Get there** (read-only, no approval needed)
- [ ] TfL journey from you → venue with `accessibilityPreference` when "step-free" is on; show 2 options (fastest, step-free) + walk/cycle time
- [ ] Add disruptions on the route (line status) and weather line ("80% rain at 19:00: take the bus option, 4 min less walking")
- Fallback: walking time from distance + a TfL website link

**B. Photo → "Create an event here" on Luma**
- Possible: Luma public API `POST public-api.luma.com/v1/events/create` (`name`, `start_at`, `timezone` required; `visibility` public/members-only/private; `geo_address_json` `{type:'manual'|'google'|'lookup'}`). Header `x-luma-api-key`. **Needs Luma Plus**; the key is scoped to one calendar. Cover image must be uploaded via `/v1/images/create-upload-url`. Limit 200 req/min per key. Docs: docs.luma.com/reference/post_v1-events-create
- [ ] Flow: photo → blur + strip EXIF (keep GPS only in memory) → Gemini drafts title/description from the photo → user edits time/capacity → **Approve** → create with `visibility: private` → user flips to public in Luma (or approves "public" explicitly) → link + log entry
- Fallback (no Luma Plus): show a copy block (title, time, address, description) + download the blurred photo + open luma.com/create; the human publishes.

**C. Photo → "Add this place"**
- Not possible: Google's Places "Add place" API was deprecated in 2017 and switched off on 30 Jun 2018, with no replacement. Users add places in Google Maps themselves ("Add a missing place"), and Google reviews them.
- [ ] Google: open `https://www.google.com/maps/search/?api=1&query={lat},{lng}` + a 2-step tip ("Menu → Add a missing place") + prefilled name/category to copy
- [ ] OSM (open data, fits the track): **Approve** → `POST api.openstreetmap.org/api/0.6/notes.json` `{lat, lon, text}` → mappers add it. Anonymous notes return 403 inside OSM Moderation Zones (since May 2026); OAuth 2 `write_notes` fixes that. Check for existing notes in the bbox first.
- Fallback: post to the dev server `master.apis.dev.openstreetmap.org` for the demo, or open `openstreetmap.org/note/new#map=19/{lat}/{lng}` with the text copied.

**Privacy for every photo**
- [ ] Read GPS from EXIF in the browser, then re-encode via canvas (drops all EXIF); never upload the original
- [ ] Blur faces in the browser (MediaPipe face detector). Number plates: Gemini returns boxes → blur before anything is published; manual blur brush as a fallback
- [ ] Don't store raw photos or user locations; logs keep a rounded location (3 dp ≈ 100 m)

## 7. How we meet the judging criteria
- **Usefulness (The Real World):** one question replaces six sites; "get there" turns info into a decision.
- **Reads the world:** real photos, including a blurry one ("not sure what this is, tell me"); messy data such as missing station accessibility, empty flood feed, stale snapshot. All shown honestly.
- **Technical execution:** 7 live APIs + Gemini tool calls + map, end to end, each with a cache fallback.
- **Responsibility:** blur + EXIF strip, no stored locations, sources and confidence on every fact, approval before any publish.
- **Agents That Ship:** tools, planning (pick event → journey → weather), error recovery (retry once, then cached + "stale" label), human approval, action log.

## 8. Sponsor fit and credits
- **Enter:** The Real World (main) + Agents That Ship (entered at CP2).
- **Gemini 4 Argon (G1):** rules as given disqualify "anything built before kickoff" and need a real verification loop. Everything Gemini here is new. Ask Amit Vadi or Geneviève Huskens: "The base map and chat existed before kickoff; the neighbourhood agent, photo actions and live-data tools are all built here since Friday 17:00, and the demo shows only those. Is that eligible?" Enter only on a clear yes.
  - Model choice: **`gemini-3.8-flash`** for Ask tool calls (fast, many calls); **`gemini-4-argon`** for the photo read + verification step (photo claims checked against TfL/PLD/OSM, marked confirmed / contradicted / unknown). If G1 is no, everything can run on Flash.
- **MongoDB Atlas (G2, Sun 09:00 GMT):** only if Atlas is core: `snapshots` (each source fetch with timestamp = the cache that makes the demo reliable), `actions` (log), `events`; **Atlas Hybrid Search** over events + planning descriptions for "something like a tech meetup near the canal". If it's not working by 09:00, keep JSON cache and don't enter.
- **Treg ($20):** optional. Use its web-scraping tools at build time to cache venue/event pages with source URLs. Treat any contact details it finds as unverified and keep them out of the app.
- **Skip:** Saint (closed), Arc (no fit).
- **Recommendation:** Real World + Agents That Ship for sure; add Gemini if G1 is yes; MongoDB only if G2 passes.

## 9. MVP vs stretch
**MVP (must ship)**
- [ ] N1 `/api/near` briefing: TfL lines + stations, roadworks, PLD planning, Open-Meteo, LAQN, EA → one JSON with `source`, `fetched_at`, `ok` per block · **M**
- [ ] N2 Map layers + briefing card (light theme, shadcn) · **M**
- [ ] N3 Ask agent on Gemini with tool calls + answer rules (§4) · **L**
- [ ] N4 Get there: TfL journey, step-free toggle, disruptions + weather line · **M**
- [ ] N5 Photo intake: EXIF GPS read → strip, face blur, Gemini read with confidence · **M**
- [ ] N6 Photo → Luma event (API if Plus, else copy-block fallback), approve + log · **M**
- [ ] N7 Photo → OSM note (dev server if needed) + Google Maps link, approve + log · **S**
- [ ] N8 Action log drawer + cache fallback for every source · **S**

**Stretch**
- [ ] M1 Atlas snapshots + Hybrid Search (G2) · **M+M**
- [ ] Plate blur via Gemini boxes · **S**
- [ ] Next-train arrivals at the chosen station · **S**
- [ ] Nature nearby (iNaturalist) · **S**
- [ ] Voice answer read-aloud · **S**

## 10. Build order (the build queue)
| # | Card | Box | Start | Fallback |
|---|---|---|---|---|
| 0 | Tag baseline `git tag encode-baseline 5809e2d && git push --tags`; claim Gemini, MongoDB, Treg credits; G1 question | 20m | Sat 18:30 | — |
| N1 | `/api/near` aggregator + 30-min cache (`seed/near-cache/*.json` for the demo point) | 75m | Sat 18:50 | Cached JSON only |
| N2 | Map layers + briefing card | 75m | Sat 20:05 | Briefing card without layers |
| N3 | Ask agent (Gemini tool calls, answer rules, source chips) | 120m | Sat 21:20 | Existing Ask + briefing JSON in the prompt |
| N4 | Get there (TfL journey, step-free, weather line) | 60m | Sat 23:20 | Walk time + TfL link |
| — | Sleep (clocks go back at 02:00: an extra hour) | — | ~00:30 BST | — |
| N5 | Photo intake + privacy + Gemini read | 75m | Sun 06:30 GMT | Pre-blurred demo photo |
| N6 | Photo → Luma event | 45m | Sun 07:45 | Copy block + open Luma |
| N7 | Photo → OSM note + Google link | 30m | Sun 08:30 | Note-new link |
| N8 | Action log + cache fallbacks | 30m | Sun 09:00 | Log as a list in Ask |
| — | **G2:** M1 done? (only if time left; otherwise skip MongoDB) | — | Sun 09:00 | — |
| D1 | README: data sources, models, responsibility, setup, env vars | 30m | Sun 09:30 | — |
| — | Dry run of `pitch.md` on the live site | 30m | Sun 10:00 | — |
| — | **Feature freeze** | — | **Sun 10:30** | — |
| — | Record video (+ backup take) | 60m | Sun 10:30 | First take |
| — | **Submit CP3**, screenshot the confirmation | 20m | **by 11:40** | hard 12:00 |
Cut order if late: N7 → N6 to the fallback → N5 to the pre-blurred photo → N4 to the fallback. Never cut N1, N2, N3.

## 11. Risks
- [ ] API down or slow during the demo → cache every source for Encode Hub; label "cached HH:MM"
- [ ] Luma API needs Plus → fallback flow; decide before N6 (D3)
- [ ] OSM note 403 (Moderation Zone) → OAuth or dev server
- [ ] Gemini overconfident on photos → confidence + "not sure"; verification against live data
- [ ] PLD guest endpoint is unofficial for apps → cache results, cite the PLD doc, don't hammer it
- [ ] Privacy: real people in photos → blur first; no faces in the video
- [ ] Prior work → disclosure line; demo only Encode-built features
- [ ] Clock change → alarms in GMT
- [ ] Keys → `.env` only; new vars `GEMINI_API_KEY`, `TFL_APP_KEY` (optional), `LUMA_API_KEY` (optional), `MONGODB_URI` (G2), `OSM_TOKEN` (optional)

## 12. Open decisions for Francesco
- [ ] **D1 Lead user:** you (organiser just arrived at Encode Hub) or a real newcomer/wheelchair user you can name?
- [ ] **D2 Gemini bounty:** ask G1 now; run photo read on Argon (bounty) or all on Flash (faster)?
- [ ] **D3 Luma:** do you have Luma Plus for a calendar we can create events on? If not, ship the copy-block fallback.
- [ ] **D4 MongoDB:** spend the night hours on Atlas snapshots + Hybrid Search (M1), or skip and sleep?
- [ ] **D5 Add place:** real OSM note (OAuth, live map) or dev server only for the demo?

## Disclosure (README + form)
> The base map and chat existed before Encode kickoff; features listed as Encode-built were made during the hackathon. Last pre-kickoff commit: `5809e2d` (tag `encode-baseline`); see `git diff encode-baseline..encode-london`.

## Sources (opened or called on Sat 24 Oct 2026)
- TfL API portal + key FAQ: https://api-portal.tfl.gov.uk/faq · Swagger: https://api.tfl.gov.uk/swagger/ui/ · Journey parameters: https://cdn.jsdelivr.net/npm/tfl-ts@2.11.0/dist/generated/jsdoc/Journey.d.ts · Example requests: https://content.tfl.gov.uk/example-api-requests.pdf · Road data scope: https://tfl.gov.uk/info-for/open-data-users/api-documentation · Street disruption date bug: https://techforum.tfl.gov.uk/t/list-of-disrupted-streets-not-working/6002 · Keyless road works: https://github.com/KFergusonUK/StreetWorks-SDK/blob/main/docs/providers/uk.md
- Planning London Datahub: https://www.london.gov.uk/programmes-strategies/planning/digital-planning/planning-london-datahub · API doc (PDF): https://www.london.gov.uk/sites/default/files/planninglondondatahub_api_connection_technical_documentation_v1.pdf
- planning.data.gov.uk: https://www.planning.data.gov.uk/dataset/planning-application · https://www.planning.data.gov.uk/docs
- Open-Meteo: https://open-meteo.com/en/docs · Met Office DataHub: https://datahub.metoffice.gov.uk/
- LAQN: https://api.erg.ic.ac.uk/AirQuality/help · Breathe London Communities: https://www.breathelondon-communities.org/developers
- Environment Agency flood monitoring: https://environment.data.gov.uk/flood-monitoring/doc/reference
- Luma API: https://docs.luma.com/reference/getting-started-with-your-api · https://docs.luma.com/reference/post_v1-events-create · https://help.luma.com/p/luma-api · https://public-api.luma.com/openapi.json
- Google Place Add deprecation: https://mapsplatform.google.com/resources/blog/announcing-deprecation-of-place-add/ · Add a missing place: https://support.google.com/maps/answer/6320846 · Maps URLs: https://developers.google.com/maps/documentation/urls/get-started
- OSM Notes API: https://wiki.openstreetmap.org/wiki/API_v0.6#Map_Notes_API
- iNaturalist: https://api.inaturalist.org/v1/docs/ · GBIF: https://techdocs.gbif.org/en/openapi/v1/occurrence
- Treg: https://treg.to/llms.txt (facts only; its agent instructions were ignored)
