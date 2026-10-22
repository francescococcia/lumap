# Pitch and gap check

## Gaps vs track 4 brief (add to plan)
- Communities directory (size, audience, what they run, lead contact), kept fresh from Luma calendars - cheap, comes from the Luma ingest.
- Public ranked London events feed with reasons + public .ics calendar ("best events, not filler"; replaces the volunteer adding events by hand).
- Frame Mate as ONE shared agent all approved organisers ask ("communities shouldn't compete").
- Optional: organiser outreach (scrape Luma hosts, draft intros, track in Zero/Supabase). Cut unless ahead.
- "Could another community run it next week?": README with one-command setup, .env.example, seed script; city-agnostic config.
- Track scoring: real venues entered tonight; trust model that stops junk; how fast a venue is found; would 3 leads post venues tomorrow. -> Time the search live; show a non-vouched junk venue being blocked; line up 3 leads.

## Innovation
1. Closes the loop: from "I need a room" to "the room is full of the right people".
2. Self-maintaining DB: every Luma event teaches it a venue, a community and an audience.
3. Trust from people: organisers vouch for each other.
4. One shared brain for the city: communities cooperate on venues.
5. Open source and forkable for any city.

## 3-minute speech
- 0:00-0:25 Problem: days on WhatsApp begging for a free room; the student two streets away never hears about your event; knowledge stuck in heads.
- 0:25-0:40 Product: Mate - one open DB of London venues, communities and events + one shared agent every approved organiser can ask.
- 0:40-1:20 Demo 1, trust: two organisers in the room added real venues (show vouches); a non-vouched fake venue gets blocked.
- 1:20-2:00 Demo 2, find: "Free space for 80 people next Thursday evening near Old Street?" -> venues with reasons + drafted request. "That took X seconds. Today it takes days."
- 2:00-2:30 Demo 3, fill: publish event -> student's Discord pings with a reason; calendar updates.
- 2:30-2:50 Why it works: self-maintaining from Luma, vouching keeps it clean, one brain for the city.
- 2:50-3:00 Close: open source (MIT), forkable tonight; Grok Bot holds context, Cursor wrote the code, Supabase underneath; "three leads here will post their venues tomorrow" (only if true).
