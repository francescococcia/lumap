# Idea: "Mate" (working name)

- **Track:** 4 - Open Venue & Events DB (see `track-open-venue-db.md`)
- **One-line pitch:** A mate who knows every London event and community, and messages you only about the ones that fit you, with the reason why.
- **Whose pain, today:** students and newcomers interested in X scroll Luma, Meetup, Devpost and dozens of WhatsApp groups and still miss the right events and communities. Organisers can't reach the people who would love their event.
- **The 10x:** from 30+ minutes of scrolling many platforms each week to one message with 3 ranked picks and reasons; new events reach matched people automatically.
- **Demo moment:** a student types "AI agents, free evenings, near Shoreditch" and Mate replies with 3 ranked events + 2 communities, each with a reason. An organiser adds a new event, and the student's Discord gets a ping and their calendar updates.
- **Where Grok Bot holds context:** the shared organiser/community knowledge and the reasoning behind each match.
- **What Cursor builds:** ingest, schema, matching, Discord bot, .ics feed, organiser flow.
- **Sponsor tech used:** Supabase (DB, auth, RLS, pgvector, PostGIS), Cognee (optional memory of communities/members), Notion (optional public view).

## Architecture
1. **Open data layer:** ingest London events from Luma discover feed, Luma event JSON (hosts), Devpost, BuilderBase, MLH into Supabase. Each event links to a community (Luma calendar) and venue (geo address). Cache; few calls/minute.
2. **Profiles:** user describes interests in a sentence (+ optional GitHub, availability, area). Store text + embedding.
3. **Matching:** rank events/communities by embedding similarity + time/location filters; LLM writes a one-line reason per pick.
4. **Delivery:** Discord DM via official API (discord.js) and a personal `.ics` feed (ical-generator). New event ingested -> notify matched users.
5. **Organiser side (track trust model):** approved organisers claim a community, add a venue (capacity, AV, evening/weekend, terms, contact), vouch for other organisers. Supabase RLS: only approved organisers write.

## Schema sketch (Supabase)
- `communities` (id, name, luma_calendar_id, description, size, audience, contact, claimed_by)
- `venues` (id, name, address, geo (PostGIS), capacity, av, evening_ok, weekend_ok, terms, contact, added_by)
- `events` (id, source, source_id, title, description, start_at, end_at, url, community_id, venue_id, guest_count, embedding)
- `profiles` (id, display_name, interests_text, embedding, area_geo, availability, discord_user_id, ics_token)
- `matches` (profile_id, event_id, score, reason, notified_at)
- `organisers` (user_id, community_id, approved, vouched_by[])

## Build order (code freeze 21:50)
- [ ] By 19:30 - Supabase schema + Luma/Devpost ingest
- [ ] By 20:15 - interest profile + matching with reasons
- [ ] By 21:00 - Discord DM + personal .ics feed
- [ ] By 21:30 - organiser claim / add venue / vouch flow
- [ ] By 21:50 - backup demo video, push public GitHub repo (MIT licence already in place)

## Cut list
- No WhatsApp (unofficial libs break ToS). No Meetup scraping unless time. No mobile app.

## Risks
- Track judges score real venues entered tonight + trust model: get 2-3 leads in the room to add venue/community live.
- Luma discover API is undocumented: cache results, fall back to a saved snapshot for the demo.

## Decisions log
- 19:00 - Chose track 4 with an attendee-first "Mate" angle (Francesco).
