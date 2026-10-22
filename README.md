# Lumap

**Pitch:** London organisers share venue knowledge and discover ranked community events in one place.

## Screenshot

<!-- Replace this placeholder with a screenshot of the running app. -->
[Screenshot placeholder — add an image at docs/screenshot.png.]

## Stack

- TypeScript and Next.js App Router for server-side routes, including the calendar feed.
- Tailwind CSS, shadcn/ui, Motion, and lucide-react for the interface.
- Supabase Postgres with PostGIS and row-level security for shared venue data and location search.
- Cognee for community memory; the included loader and search helper use the Cognee API.

## Vouch trust model

The city starts with a small set of trusted root organisers. An approved organiser can vouch for another organiser. Only vouched organisers should be able to add or edit venue records; Supabase row-level security enforces those writes. Unvouched users do not see venue contact details. If a vouch is revoked, edits from that organiser can be hidden from the shared venue list.

The root organiser list and database policies are the intended trust boundary. The RLS schema and policies are not yet included on this branch, so treat this description as the design rather than a claim that venue posting is already protected.

## Fork for another city

The current event snapshot is London-specific. To start a city fork:

1. Add `config/city.json` with the city name, slug, map centre, and trusted root organiser IDs.
2. Replace the London event and venue seeds with data for that city.
3. Seed the root organisers, then apply the city's Supabase schema and RLS policies.
4. Keep service credentials on the server and use only public, consented contact data.

Example starting point:

```json
{
  "name": "Manchester",
  "slug": "manchester",
  "center": { "lat": 53.4808, "lng": -2.2426 },
  "root_organisers": []
}
```

This repository does not yet contain `config/city.json` or a config loader; the example shows the city settings a fork will need.

## Environment variables

Set these names in a local `.env` file. Never commit secret values.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server/seed only)
- `LLM_API_KEY`
- `COGNEE_API_KEY`
- `COGNEE_BASE_URL`
- `COGNEE_TENANT_ID`
- `COGNEE_DATASET` (optional; defaults to `lumap_london`)

## Current scope

This branch includes the ranked London event snapshot reader, the `.ics` generator and the `/api/calendar.ics` route, plus Cognee seed and search helpers. A complete local app setup command and the Supabase schema are still to be added.
