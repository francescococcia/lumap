# Sponsor fit and credit plan (Sat 24 Oct, 18:00 BST)

Product: Lumap, an **accessible venue finder** for London organisers (see `encode-london.md`).
Effort: **S** ≤30 min · **M** 30–90 min · **L** >90 min. Freeze **Sun 10:30 GMT**, submit **Sun 12:00 GMT**.

## Recommendation
- **Enter:** The Real World (main) + Agents That Ship (stack-on). Both were entered at CP2.
- **Add MongoDB Atlas only if** the access layer runs on Atlas with search by **Sun 09:00 GMT** (gate G2). Three of the 13 judges are from MongoDB.
- **Gemini 4 Argon:** use the Gemini credits regardless. Enter the bounty **only if** Amit or Geneviève says yes to the question below (gate G1).
- **Skip:** Saint (closed), Arc/Circle (no bounty seen, no fit).

## 1. The Real World (Encode): main track
- **Criteria:** real-world usefulness · reads the world well (accuracy, messy inputs: blurry photos, background noise, data gaps) · technical execution (end to end, AI + real data) · responsibility (faces, number plates, locations; honest about uncertainty)
- **Submit:** working demo · repo with README + setup · 2–4 min video on real inputs · note on models + data sources
- **Fit today:** medium. The map, search, PostGIS, public venue data and Ask exist, but **nothing reads the physical world yet**.
- **Change:** photo + listing access read with confidence and "not sure"; OSM `wheelchair` tags; TfL step-free station; Open-Meteo line; top 3 with reasons; face blur + EXIF strip; no personal location stored.
- **Effort:** L in total (E2–E7 in `encode-london.md`)
- **Points:** covers all 4 criteria. Their own idea list includes an "accessibility guide from photos (step-free, entrances, signage, seating, noise)".
- **Risk:** vision overconfidence → always show evidence + confidence, and say "looks step-free, confirm", never "accessible". Prior work → disclosure line.

## 2. Agents That Ship (Encode): stack-on
- **Criteria:** does the job · reliability (edge cases, knows when to ask) · usefulness · technical depth (tools, memory, planning, evaluation) · safety & control (permissions, approvals, clear record of what the agent did)
- **Submit:** demo · repo + README/setup · 2–4 min video · short description of tools, steps and where a human approves
- **Fit today:** low. Ask answers questions but takes no actions.
- **Change:** an agent that, for the top 3, runs tools (photo read → OSM → TfL → weather), turns the "not sure" fields into a **drafted request email**, waits for **human approval**, sends to a **demo inbox only**, and writes every step to an **action log** shown in the UI. Retry once on tool error, then mark the field "unknown" (no crash).
- **Effort:** M (E8) on top of the Real World work
- **Points:** "knows when to ask" = the "not sure → ask the venue" email; approval + log = safety & control.
- **Risk:** never email real venue contacts; demo inbox only.

## 3. Google DeepMind: Gemini 4 Argon
- **Rules (as given):** must use `gemini-4-argon` (companion models allowed). **Disqualified:** a basic chat wrapper, a static page, "anything built before kickoff"; the demo must only show code written during the hackathon.
- **Judging:** live demo with real inputs under 3 min + a **real verification loop** 50% · a problem for a named person 25% · originality / needs Argon (1M context, long decode, agentic video analysis, multi-agent) and keeps people in control 15% · pitch without slides 10%
- **Submit:** GitHub repo, 3-min video + live demo, which Gemini models/agents are used and how
- **Fit today:** none. No Gemini code yet, and the base predates kickoff.
- **Change if entered:** the access read runs on `gemini-4-argon`; a **verification loop** checks each claim ("step-free entrance") against OSM tags and TfL data, then marks it confirmed / contradicted / unknown; the human approves before anything is sent. The demo shows only Encode-built screens.
- **Effort:** S extra, if the access read (E3) is built on Argon from the start
- **Points:** the verification loop is 50% of the score and is also our Real World honesty story.
- **Risk:** **eligibility.** Options: (a) skip the bounty and just use the credits, or (b) ask the mentors onsite. Question to ask Amit Vadi or Geneviève Huskens:
  > "Lumap's base map and chat were built at an earlier hackathon on 22 Oct; everything Gemini-powered (photo access reading and the verification loop) is built here since Friday 17:00 and the demo shows only that. Is that eligible for the Argon bounty?"
- **Default if no clear yes:** don't enter.

## 4. MongoDB Atlas
- **Rules (as given):** the app must **rely on Atlas for core functionality**. More points for more of: Atlas Search, Vector Search, Hybrid Search, Automated Embedding, Stream Processing, Voyage AI models. Submit: repo + 3-min video showing MongoDB in use.
- **Fit today:** none (Supabase/PostGIS only).
- **Change (partial layer, not a migration):** put **all new Encode data** in Atlas: `access_assessments` (photo reads, per-field value + confidence + evidence + source), `venue_reviews` and `agent_actions` (the action log). Use **Hybrid Search** (text + vector, with Automated Embedding if available on our tier, otherwise Voyage embeddings) so "quiet step-free room like Somerset House" ranks the top 3. Venues, auth and vouching stay in Supabase.
- **Does a partial layer qualify?** Plausibly yes, **if** the Encode headline feature (accessible search + agent log) cannot work without Atlas. It's weak if Atlas only mirrors data. Confirm at the booth with Robin or Ricardo: "Venues and auth stay in Postgres, but all access assessments, reviews, the agent log and the accessible hybrid search run on Atlas. Does that count as core?"
- **Effort:** M if E1 is built on Atlas instead of Supabase (a swap, not extra), plus M for Hybrid Search. Check Automated Embedding setup in the docs or at the booth; don't assume it.
- **Points:** a new prize pool + 3 judges. Hybrid Search + Vector + (Automated Embedding or Voyage) = 3 of the 6 listed features.
- **Risk:** two databases to set up solo, and the Atlas search index build time. Fallback: keep the JSON file and don't enter the bounty.

## 5. Saint
- Not available (10 teams, sign-up closed Fri 18:00).

## 6. Arc (Circle)
- Listed as a partner. No bounty or criteria seen. No natural fit for a venue finder → skip.

## Credits: how to use each one
- [ ] **Gemini API credits** (claim now via the QR form): the Gemini key goes in `.env` as `GEMINI_API_KEY`.
  - Access read (photo + listing → JSON `{field, value, confidence, evidence}`): `gemini-4-argon` (keeps the bounty open) or `gemini-3.8-flash` if speed matters
  - Verification loop: the same call re-checks each claim against the OSM/TfL facts passed in context
  - Optional: `gemini-3.8-flash` for the email draft. **Skip** `gemini-3.8-live` voice: it would replace a working Web Speech mic for no judge points (L, high risk).
- [ ] **MongoDB $100 Atlas credit** (booth, ground floor): one cluster for the access layer + search indexes. Claim it even if the gate fails; it costs nothing.
- [ ] **Treg $20** (sign up at treg.to, same email). Facts from treg.to/llms.txt: a catalog of 4,000+ agent tools across 114 providers (web scraping, web search/SERP, enrichment, image/video/voice generation), one token, server-side credentials, pay per call from a prepaid balance, plus an MCP server and a CLI.
  - Use 1 (build time, S): our coding agent uses Treg web scraping/search to collect each demo venue's **public access statement page** into a cached seed, with source URLs.
  - Use 2 (runtime, M, optional): the agent's "read listing" tool calls Treg scraping for a venue URL, with the cost shown in the action log.
  - No Treg bounty seen. Don't put a found email or phone into the app (llms.txt: found contacts are unverified).

## Judges → sponsor
- DeepMind ×2: Amit Vadi, Geneviève Huskens (both Gemini mentors too)
- MongoDB ×3: Robin Varghese, Ricardo Villanueva, Maja Brlek
- Others ×8: Daniil Mazepin, Alex Saunders, Efe Erciyaz, Sohum Patel, Samuel Videau, Timo Beckmann, Amgad Al-Zamkan, Miles Emami

## Prioritised change list (highest judge weight first, all before Sun 10:30 GMT)
1. [ ] **E3 Access read + "not sure"** on Gemini (Argon or Flash): reading the world, messy inputs, verification. **M–L**
2. [ ] **E4/E5 OSM + TfL signals + verify claims** (confirmed / contradicted / unknown): real data + verification loop. **M**
3. [ ] **E7 Top 3 with reasons, confidence and sources** on the map: usefulness, end to end. **M**
4. [ ] **E2 Privacy:** face blur + EXIF strip in the browser, no user location stored: responsibility. **M** (fallback: pre-blurred photos, S)
5. [ ] **E8 Approve-before-send agent + action log:** Agents That Ship. **M**
6. [ ] **E1 on Atlas + Hybrid Search** (gate G2, Sun 09:00): MongoDB. **M+M**
7. [ ] **E6 Open-Meteo line.** **S**
8. [ ] **Models & data sources + responsibility notes** in the README. **S**

## Gates
- **G1 (ask by Sat 20:00 BST):** Gemini mentors' answer → enter Argon or not
- **G2 (Sun 09:00 GMT):** Atlas hybrid search returns the demo query → enter MongoDB, otherwise drop it from the bounties
- **G3 (Sun 10:30 GMT):** feature freeze, whatever state it's in
