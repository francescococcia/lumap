# Idea: "Mate" (working name)

- **Track:** 4 - Open Venue & Events DB (see `track-open-venue-db.md`)
- **One-line pitch:** One open database and one chat mate that finds organisers a free venue in seconds, then fills the room by pinging the people whose interests match the event.
- **Whose pain, today:**
  - Organisers: finding a free evening/weekend venue is the hardest job; the knowledge lives in people's heads and WhatsApp asks.
  - Attendees (students, people interested in X): scroll Luma, Meetup, Devpost and many groups and still miss the right events.
- **The 10x:** venue search from days of asking around to seconds in chat with a drafted request; event promotion from posting everywhere to automatically reaching matched people.
- **Demo moment:** (1) two organisers in the room add real venues; (2) a third asks "free space for 80 people next Thursday evening near Old Street?", gets ranked venues with reasons and sends the drafted request; (3) they publish the event and a student's Discord pings "AI agents night Thursday, 10 min from you" and their calendar updates.
- **Where Grok Bot holds context:** shared organiser/venue/community knowledge and the reasoning behind each venue pick and attendee match.
- **What Cursor builds:** schema, venue seed + ingest, venue search chat, organiser flow, matching, Discord bot, .ics feed.
- **Sponsor tech used:** Supabase (DB, auth, RLS, PostGIS, pgvector), Cognee (optional memory for the shared agent), Zero (optional organiser outreach), Notion (optional public view).

## Part 1 - Organiser side (track core, build first)
- Venue DB: name, address, geo (PostGIS), capacity, AV, evening_ok, weekend_ok, terms (free/paid), contact, communities that hosted there.
- Trust model: only approved organisers write; organisers vouch for each other (Supabase RLS).
- Seed: venues from past London Luma events (geo_address_info) + OpenStreetMap/Overture; enrich by organisers live.
- Venue search chat: natural-language ask -> filters (capacity, date/time, area) + PostGIS distance -> ranked venues with reasons + drafted booking request.

## Part 2 - Attendee side (fills the room)
- Events ingested from Luma discover feed (+ Devpost/BuilderBase/MLH if time), linked to community and venue.
- Profiles: interests in a sentence (+ area, availability), embedding.
- Matching: embedding similarity + time/location -> reason line; Discord DM via official API + personal .ics feed. New event -> notify matched people.

## Schema sketch (Supabase)
- `organisers` (user_id, name, community_id, approved, vouched_by[])
- `communities` (id, name, luma_calendar_id, description, size, audience, contact)
- `venues` (id, name, address, geo, capacity, av, evening_ok, weekend_ok, terms, contact, added_by, verified)
- `venue_hosts` (venue_id, community_id, event_id)
- `events` (id, source, source_id, title, description, start_at, end_at, url, community_id, venue_id, guest_count, embedding)
- `profiles` (id, display_name, interests_text, embedding, area_geo, availability, discord_user_id, ics_token)
- `matches` (profile_id, event_id, score, reason, notified_at)

## Build order (code freeze 21:50)
- [ ] By 19:40 - Supabase schema + venue seed from Luma event addresses
- [ ] By 20:30 - venue search chat (near me, capacity, time) with reasons + drafted request
- [ ] By 21:00 - organiser add-venue + vouch flow
- [ ] By 21:30 - attendee interests + matching + Discord ping (cut first if behind)
- [ ] By 21:50 - backup demo video, push public GitHub repo (MIT licence in place)

## Cut list
- No WhatsApp (unofficial libs break ToS). No Meetup scraping unless time. No mobile app.

## Risks
- Need real venues entered tonight: line up 2-3 leads in the room to add theirs live.
- Luma discover API is undocumented: cache results, keep a saved snapshot for the demo.

## Decisions log
- 19:00 - Chose track 4 with an attendee-first "Mate" angle (Francesco).
- 19:05 - Reframed: organiser venue finder is the core, attendee matching closes the loop (Francesco).
