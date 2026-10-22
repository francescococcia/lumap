# Lumap seed: Luma London snapshot

- Source: Luma London discover feed (public, no key, undocumented): https://api.lu.ma/discover/get-paginated-events?discover_place_api_id=discplace-QCcNk3HXowOR97j . Fetched 2026-10-22, 2 pages, 59 upcoming events (22 Oct to 26 Nov 2026).
- `luma-london.json`: all in-person events (name, dates, url, guest_count, calendar, address, lat/lng). `address_hidden: true` means Luma hides the address until RSVP and the coordinates are fuzzed.
- `venues-candidates.json`: candidate venues grouped by coordinates (4 dp), sorted by events_count. Status is `pending`: they are not verified. `max_guest_count_lower_bound` is the largest RSVP count seen, a lower bound and not a capacity. There are no claims about AV, terms or availability. Events with hidden addresses are excluded.
- `hosted_events.json`: who hosted where (venue_key, community = Luma calendar name, event, date, guest_count). This is the "past hosts" memory.
- "Personal" as a community means the event was posted from a host's personal Luma calendar, not a community calendar.
- This is a frozen snapshot, so the demo never depends on the live endpoint. Re-fetch politely (max 1 request every 2 s).
- No personal contact info is included: no host names, emails, LinkedIn/X/Instagram handles. Venue business addresses only.
