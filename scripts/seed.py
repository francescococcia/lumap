#!/usr/bin/env python3
"""Write supabase/seed.sql from config/city.json and the Luma snapshot.

The snapshot capacity field is max_guest_count_lower_bound. It is stored as
guest_count_lower_bound and the venue capacity is left null. Four EXAMPLE
verified venues near Old Street are appended so search works before anyone
enters a real venue. Contacts on those rows are @demo.lumap.invalid placeholders.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CITY_PATH = ROOT / "config" / "city.json"
VENUES_PATH = ROOT / "seed" / "venues-candidates.json"
EVENTS_PATH = ROOT / "seed" / "hosted_events.json"
OUT_PATH = ROOT / "supabase" / "seed.sql"

NS = uuid.UUID("6f0c2c2e-0b1a-4f3a-9c1d-1a2b3c4d5e6f")

WEEKNIGHTS = ("mon", "tue", "wed", "thu", "fri")
THU_FRI = ("thu", "fri")
WEEKEND = ("sat", "sun")

EXAMPLES = [
    {
        "seed_key": "example-old-street-community-room",
        "name": "EXAMPLE · Old Street Community Room",
        "address": "EXAMPLE only, near Old Street roundabout, London",
        "lat": 51.5263,
        "lng": -0.0889,
        "capacity": 100,
        "has_av": True,
        "av_notes": "projector",
        "days": WEEKNIGHTS,
        "start": "18:00",
        "end": "22:00",
        "evening_hours": "Mon–Fri 18:00–22:00",
        "weekend_hours": None,
        "terms": "community rate, confirm availability",
        "contact": "example-old-street-room@demo.lumap.invalid",
        "notes": "EXAMPLE venue for the demo. Not a real place. Do not email this address.",
    },
    {
        "seed_key": "example-hoxton-works-hall",
        "name": "EXAMPLE · Hoxton Works Hall",
        "address": "EXAMPLE only, Hoxton Square side of Old Street, London",
        "lat": 51.5282,
        "lng": -0.0816,
        "capacity": 80,
        "has_av": True,
        "av_notes": "projector and a mic",
        "days": THU_FRI,
        "start": "18:00",
        "end": "22:00",
        "evening_hours": "Thu–Fri 18:00–22:00",
        "weekend_hours": None,
        "terms": "paid hire, confirm availability",
        "contact": "example-hoxton-works@demo.lumap.invalid",
        "notes": "EXAMPLE venue for the demo. Not a real place. Do not email this address.",
    },
    {
        "seed_key": "example-scrutton-street-loft",
        "name": "EXAMPLE · Scrutton Street Loft",
        "address": "EXAMPLE only, Scrutton Street, London",
        "lat": 51.5236,
        "lng": -0.0842,
        "capacity": None,
        "has_av": None,
        "av_notes": None,
        "days": THU_FRI,
        "start": "18:00",
        "end": "22:00",
        "evening_hours": "Thu–Fri 18:00–22:00",
        "weekend_hours": None,
        "terms": None,
        "contact": "example-scrutton-loft@demo.lumap.invalid",
        "notes": "EXAMPLE venue for the demo. Capacity is unknown on purpose. Not a real place.",
    },
    {
        "seed_key": "example-whitecross-weekend-room",
        "name": "EXAMPLE · Whitecross Weekend Room",
        "address": "EXAMPLE only, Whitecross Street, London",
        "lat": 51.5240,
        "lng": -0.0938,
        "capacity": 160,
        "has_av": True,
        "av_notes": "projector",
        "days": WEEKEND,
        "start": "10:00",
        "end": "18:00",
        "evening_hours": None,
        "weekend_hours": "Sat–Sun 10:00–18:00",
        "terms": "community rate, confirm availability",
        "contact": "example-whitecross@demo.lumap.invalid",
        "notes": "EXAMPLE venue for the demo. Open at the weekend, not on Thursday evening. Not a real place.",
    },
]

EXAMPLE_EVENTS = [
    {
        "external_id": "example-evt-old-street-1",
        "seed_key": "example-old-street-community-room",
        "event_name": "EXAMPLE community night",
        "event_date": "2026-09-17T18:30:00+00:00",
        "guest_count": 90,
    },
    {
        "external_id": "example-evt-old-street-2",
        "seed_key": "example-old-street-community-room",
        "event_name": "EXAMPLE Thursday meetup",
        "event_date": "2026-10-01T18:30:00+00:00",
        "guest_count": 60,
    },
    {
        "external_id": "example-evt-hoxton-1",
        "seed_key": "example-hoxton-works-hall",
        "event_name": "EXAMPLE paid-hire rehearsal",
        "event_date": "2026-09-24T18:30:00+00:00",
        "guest_count": 40,
    },
]


def sql_text(value: str | None) -> str:
    if value is None:
        return "null"
    tag = "$lumap$"
    if tag in value:
        tag = "$lumap2$"
    return f"{tag}{value}{tag}"


def sql_int(value: int | None) -> str:
    if value is None:
        return "null"
    return str(int(value))


def sql_bool(value: bool | None) -> str:
    if value is None:
        return "null"
    return "true" if value else "false"


def sql_uuid(value: str) -> str:
    uuid.UUID(value)
    return f"'{value}'::uuid"


def hours_json(days: tuple[str, ...], start: str, end: str) -> str:
    payload = {day: {"start": start, "end": end} for day in days}
    return sql_text(json.dumps(payload, separators=(",", ":"))) + "::jsonb"


def main() -> None:
    city = json.loads(CITY_PATH.read_text())
    venues_doc = json.loads(VENUES_PATH.read_text())
    events = json.loads(EVENTS_PATH.read_text())
    roots = city["roots"]
    if len(roots) < 2:
        raise SystemExit("config/city.json needs at least two roots")

    root_id = roots[0]["id"]
    lines: list[str] = [
        "-- Generated by scripts/seed.py. Do not edit by hand.",
        "-- Reload after changing config/city.json or the files in seed/.",
        "-- Candidate venues stay status pending with capacity null.",
        "-- max_guest_count_lower_bound is stored as guest_count_lower_bound.",
        "-- EXAMPLE venues are fictional and sit near Old Street for the demo.",
        "-- No real contact details.",
        "",
        "begin;",
        "",
        "-- Roots from config/city.json. auth_user_id is filled when that email signs up.",
    ]

    for root in roots:
        email = root["email"].strip().lower()
        if not email.endswith("@demo.lumap.invalid") and "@" not in email:
            raise SystemExit(f"root email looks wrong: {email}")
        lines.append(
            "insert into public.root_emails (email, display_name) values ("
            f"{sql_text(email)}, {sql_text(root['display_name'])}) "
            "on conflict (email) do update set display_name = excluded.display_name;"
        )
        lines.append(
            "insert into public.organisers (id, email, display_name, is_root) values ("
            f"{sql_uuid(root['id'])}, {sql_text(email)}, {sql_text(root['display_name'])}, true) "
            "on conflict (id) do update set "
            "email = excluded.email, display_name = excluded.display_name, is_root = true;"
        )

    lines += [
        "",
        "delete from public.hosted_events where source in ('luma', 'example');",
        "delete from public.venues where source in ('luma', 'example');",
        "",
    ]

    communities: dict[str, dict] = {}
    for event in events:
        name = event["community"]
        cal = event.get("community_api_id")
        row = communities.get(name)
        if row is None:
            communities[name] = {
                "id": str(uuid.uuid5(NS, "community:" + name)),
                "name": name,
                "luma_calendar_id": None if name == "Personal" else cal,
                "notes": (
                    "Posted from a personal Luma calendar. No host name is stored."
                    if name == "Personal"
                    else "Luma calendar from the 22 Oct 2026 London snapshot."
                ),
            }
        elif name != "Personal" and row["luma_calendar_id"] not in (None, cal):
            raise SystemExit(f"community {name} has two calendar ids")

    example_community_id = str(uuid.uuid5(NS, "community:EXAMPLE Community"))
    communities["EXAMPLE Community"] = {
        "id": example_community_id,
        "name": "EXAMPLE Community",
        "luma_calendar_id": None,
        "notes": "Fictional community used only by the EXAMPLE venues.",
    }

    lines.append("-- Communities named in the snapshot. Personal is one row, with no host.")
    for name in sorted(communities):
        row = communities[name]
        lines.append(
            "insert into public.communities (id, name, luma_calendar_id, notes) values ("
            f"{sql_uuid(row['id'])}, {sql_text(row['name'])}, "
            f"{sql_text(row['luma_calendar_id'])}, {sql_text(row['notes'])}) "
            "on conflict (name) do update set "
            "luma_calendar_id = coalesce(public.communities.luma_calendar_id, excluded.luma_calendar_id), "
            "notes = excluded.notes;"
        )

    lines += ["", "-- Luma candidate venues. capacity stays null."]
    venue_ids: dict[str, str] = {}
    for venue in venues_doc["venues"]:
        key = venue["key"]
        venue_id = str(uuid.uuid5(NS, "venue:" + key))
        venue_ids[key] = venue_id
        lower = venue.get("max_guest_count_lower_bound") or 0
        lower_sql = "null" if lower <= 0 else str(int(lower))
        lines.append(
            "insert into public.venues ("
            "id, name, address, lat, lng, capacity, guest_count_lower_bound, "
            "hours, status, created_by, source, seed_key"
            ") values ("
            f"{sql_uuid(venue_id)}, {sql_text(venue['name'])}, {sql_text(venue['address'])}, "
            f"{venue['lat']}, {venue['lng']}, null, {lower_sql}, "
            f"'{{}}'::jsonb, 'pending', {sql_uuid(root_id)}, 'luma', {sql_text(key)}"
            ") on conflict (seed_key) do update set "
            "name = excluded.name, address = excluded.address, lat = excluded.lat, "
            "lng = excluded.lng, guest_count_lower_bound = excluded.guest_count_lower_bound, "
            "status = 'pending', source = 'luma', capacity = null;"
        )

    lines += ["", "-- EXAMPLE verified venues near Old Street. Fictional."]
    for venue in EXAMPLES:
        venue_id = str(uuid.uuid5(NS, "venue:" + venue["seed_key"]))
        venue_ids[venue["seed_key"]] = venue_id
        lines.append(
            "insert into public.venues ("
            "id, name, address, lat, lng, capacity, has_av, av_notes, hours, "
            "evening_hours, weekend_hours, terms, contact, notes, status, created_by, source, seed_key"
            ") values ("
            f"{sql_uuid(venue_id)}, {sql_text(venue['name'])}, {sql_text(venue['address'])}, "
            f"{venue['lat']}, {venue['lng']}, {sql_int(venue['capacity'])}, "
            f"{sql_bool(venue['has_av'])}, {sql_text(venue['av_notes'])}, "
            f"{hours_json(venue['days'], venue['start'], venue['end'])}, "
            f"{sql_text(venue['evening_hours'])}, {sql_text(venue['weekend_hours'])}, "
            f"{sql_text(venue['terms'])}, {sql_text(venue['contact'])}, {sql_text(venue['notes'])}, "
            f"'verified', {sql_uuid(root_id)}, 'example', {sql_text(venue['seed_key'])}"
            ") on conflict (seed_key) do update set "
            "name = excluded.name, address = excluded.address, lat = excluded.lat, "
            "lng = excluded.lng, capacity = excluded.capacity, has_av = excluded.has_av, "
            "av_notes = excluded.av_notes, hours = excluded.hours, "
            "evening_hours = excluded.evening_hours, weekend_hours = excluded.weekend_hours, "
            "terms = excluded.terms, contact = excluded.contact, notes = excluded.notes, "
            "status = 'verified', source = 'example';"
        )

    lines += ["", "-- Who hosted where. guest_count 0 is kept and means the count was not shown."]
    for event in events:
        venue_id = venue_ids.get(event["venue_key"])
        if venue_id is None:
            raise SystemExit(f"hosted event missing venue {event['venue_key']}")
        community = communities[event["community"]]
        lines.append(
            "insert into public.hosted_events ("
            "id, venue_id, community_id, community_name, event_name, event_date, "
            "guest_count, source, url, external_id"
            ") values ("
            f"{sql_uuid(str(uuid.uuid5(NS, 'event:' + event['event_api_id'])))}, "
            f"{sql_uuid(venue_id)}, {sql_uuid(community['id'])}, "
            f"{sql_text(event['community'])}, {sql_text(event['event_name'])}, "
            f"{sql_text(event['date'])}::timestamptz, {sql_int(event['guest_count'])}, "
            f"'luma', {sql_text(event.get('url'))}, {sql_text(event['event_api_id'])}"
            ") on conflict (external_id) do update set "
            "venue_id = excluded.venue_id, community_id = excluded.community_id, "
            "community_name = excluded.community_name, event_name = excluded.event_name, "
            "event_date = excluded.event_date, guest_count = excluded.guest_count, "
            "url = excluded.url, source = 'luma';"
        )

    for event in EXAMPLE_EVENTS:
        lines.append(
            "insert into public.hosted_events ("
            "id, venue_id, community_id, community_name, event_name, event_date, "
            "guest_count, source, external_id"
            ") values ("
            f"{sql_uuid(str(uuid.uuid5(NS, 'event:' + event['external_id'])))}, "
            f"{sql_uuid(venue_ids[event['seed_key']])}, {sql_uuid(example_community_id)}, "
            f"{sql_text('EXAMPLE Community')}, {sql_text(event['event_name'])}, "
            f"{sql_text(event['event_date'])}::timestamptz, {sql_int(event['guest_count'])}, "
            f"'example', {sql_text(event['external_id'])}"
            ") on conflict (external_id) do update set "
            "venue_id = excluded.venue_id, community_id = excluded.community_id, "
            "event_name = excluded.event_name, event_date = excluded.event_date, "
            "guest_count = excluded.guest_count, source = 'example';"
        )

    lines += [
        "",
        "-- Re-link roots if schema.sql was pasted again after people had signed up.",
        "update public.organisers o",
        "set auth_user_id = u.id",
        "from auth.users u",
        "where o.auth_user_id is null",
        "  and u.email is not null",
        "  and lower(u.email) = lower(o.email);",
        "",
        "commit;",
        "",
    ]
    OUT_PATH.write_text("\n".join(lines))
    print(f"wrote {OUT_PATH} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
