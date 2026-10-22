# Lumate (working name): the open venue DB London organisers keep together

## Pitch (one line)
Organisers who trust each other share the venues they've actually used, and any of them can ask in chat "free space for 80 next Thursday near Old Street?" and get a real answer with a drafted request in seconds.

## Why this wins Track 4
The track scores four things, and every feature below maps to one of them:
1. **Real venues entered tonight**: real organisers in the room add venues they've used, with their names shown.
2. **A trust model that stops junk**: a vouch chain enforced by Supabase row-level security (RLS), with an unvouched post blocked live.
3. **How fast a venue is found**: one chat question returns ranked venues with reasons.
4. **Would three leads post tomorrow**: those three leads are named and on screen.

## The core (the only things we build)
1. **Venue database (Supabase + PostGIS)**: name, address, lat/lng, capacity, AV, evening/weekend hours, free or paid terms, contact, notes.
2. **hosted_events**: which community ran what at which venue, seeded from the Luma London discover feed (no key needed). This is the "who hosted where" memory, so we don't need Cognee.
3. **Trust model**:
   - Root organisers are 2–3 named leads seeded at setup (listed in `config/city.json`).
   - An approved organiser can vouch for a new one. Only vouched organisers can insert or edit venues (RLS policy).
   - A vouch can be revoked, and the revoked organiser's pending edits are hidden.
   - A SQL test proves an unvouched insert fails.
4. **Ask in chat**: "free space for 80 next Thursday evening near Old Street" is parsed into capacity, date, area and needs, then answered with a PostGIS radius filter, capacity and hours, ranked by past hosts. It returns the top 3, each with a reason ("hosted Founders Club, 90 people, in Sept; free for communities; projector"), plus a drafted request email.
5. **Public feed**: one ranked London events page plus a public `.ics` feed built from Luma and hosted_events, updating live.

Chat surface: a Discord bot if it works by 20:45. Otherwise a web chat box on the same page, with the same logic either way.

## The demo script (3 minutes, matches the track's winning demo)
- 0:00 The problem: "the hardest job a London organiser has is finding a free room, and the answer lives in WhatsApp DMs."
- 0:20 Organisers A and B (real people from tonight) have already added venues, and their names are on screen.
- 0:45 Stranger C tries to post a fake venue and the database refuses it. That's the trust model.
- 1:15 Organiser D asks the chat question and gets 3 ranked venues with reasons, with the time shown on screen.
- 2:00 D sends the request to a demo inbox. The venue owner accepts, a tentative event is inserted, and the feed and `.ics` update.
- 2:30 It's open source, `git clone` plus one command with a city config, so Manchester can run it next week.
- 2:50 Close: "three London leads have already posted. They're [names]." Only say this if it's true.

## Build order to freeze (21:50)
- **19:45** Schema, RLS vouch policies, SQL test, Luma snapshot saved into the repo seed
- **19:50** Bare add-venue path is live (a plain insert form, or a shared sheet the seed script imports). The 3 organisers are pre-added as roots in `city.json`.
- **19:50–20:10** Walk the room: 3 organisers add 10–15 real venues. Get consent to show their names, and ask each one "would you post your venues here tomorrow?" so you can quote their answer.
- **20:30** Chat search with ranked reasons and a drafted request (LLM parse with a regex fallback). Decide then: Discord or web chat.
- **21:00** Vouch/revoke flow in the UI, with a readable "not vouched" error
- **21:20** Ranked events page and public `.ics`
- **21:35** Record the backup demo video
- **21:45** Push the public GitHub repo (MIT, README, one-command seed, `.env.example`, city config)

## Cut (stretch only if the core is done)
Attendee matching, pgvector, DMs, personal `.ics`, voice notes/Whisper, Cognee, Zero outreach, Overture/OSM seeding, Meetup/Devpost/BuilderBase ingestion, WhatsApp, mobile app.

## Honesty and safety rules (from the judges)
- Never say "free". Say "open then, fits 80, hosted similar events, confirm availability".
- "Send request" goes to a demo inbox or a mailto link. Never ping real venue contacts on stage.
- The feed and `.ics` update only because the venue owner accepts, which inserts a tentative event. Otherwise drop that link from the demo.
- RLS hides the contact column from unvouched users.
- Real contacts are never committed. The repo seed uses sample data, plus a script that loads the private sheet.
- Demo the junk block in the app UI, not in a SQL console. Rehearse the script twice.
- Bonus if ahead at 21:20: a communities page generated from hosted_events.

## Open questions for tonight
- Which 3 organisers in the room will add venues? (Ask at 20:00.)
- Who are the root organisers in the config?

## Decisions log
- 19:00 Chose track 4.
- 19:05 Reframed to venue-first.
- 19:16 The judge panel scored v2 at 54/100. Cut the attendee side, voice and Cognee, and rebuilt around the track's demo script and real venues entered tonight.
- 19:18 The judges re-scored it at 71/100. Fixed the data-capture order, made the demo truthful, and reduced the dependence on external services (target about 80).
