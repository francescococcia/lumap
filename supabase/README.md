# Lumap database

Paste these files into the Supabase SQL editor, in order, on a project that already has PostGIS. `schema.sql` drops and recreates the Lumap tables.

1. `schema.sql`
2. `policies.sql`
3. `search.sql`
4. `seed.sql`

`scripts/seed.py` rewrites `seed.sql` from `config/city.json`, `seed/venues-candidates.json` and `seed/hosted_events.json`. Replace the placeholder root emails in `config/city.json` with the real leads, run the script, and paste `seed.sql` again.

Trust: an organiser is vouched if they are a root, or an unrevoked vouch chain reaches them from a root. `is_vouched(uid)` reads that live, so setting `vouches.revoked_at` takes effect on the next call. Only a vouched organiser can insert or update a venue, or create a vouch.

## What the app calls

| Call | Who | Notes |
|---|---|---|
| `venues_public` | anyone | Map and list. No `contact`. Pending rows disappear when their creator is no longer vouched. |
| `venues` insert / update | signed-in | Send `lat` and `lng`, not `location`. `created_by` can be omitted. |
| `venues_organiser` | vouched | Same rows plus `contact`. Empty for everyone else. |
| `venue_contact(venue_id)` | vouched | One contact. Others get an error. |
| `is_vouched(uid)` | anyone | `uid` is an auth user id or an organiser id. |
| `search_venues(...)` | anyone | Does not return `contact`. |
| `vouches` | vouched write | Insert `{voucher, vouchee}`. Revoke with `update {revoked_at}`. |
| `organisers` | anyone read | `id`, `display_name`, `is_root`. Signed-in users can also read `auth_user_id` to find their row. Email stays off the API. |
| `hosted_events`, `communities` | anyone read | `event_date` is the event time. |

Unvouched venue insert and update fail with this exact message (`error.message`):

```text
Only vouched organisers can post. Ask an organiser to vouch for you.
```

Unvouched vouch insert:

```text
Only vouched organisers can vouch. Ask an organiser to vouch for you.
```

`search_venues(lat, lng, radius_m, min_capacity, day_of_week, start_time)` and optional `max_results` (default 3, max 20). `day_of_week` is `thu`, `Thursday`, or `0`–`6` with Sunday as `0`. `start_time` is `19:00`. Null `min_capacity` or a null day skips that part of the fit. Unknown `capacity` is kept and ranked below a known fit. The reason looks like `fits 80 · open Thu evenings · hosted 2 community events, largest 90`.

Old Street demo:

```sql
select name, status, distance_m, reason
from search_venues(51.5258, -0.0877, 2000, 80, 'thu', '19:00');
```

Hours on a venue are a jsonb object keyed `sun` … `sat`, each value `{"start": "18:00", "end": "22:00"}`. `{}` means the hours are unknown. Luma rows are `status = 'pending'` with `capacity` null; `guest_count_lower_bound` is the largest RSVP count, not a capacity. The four `EXAMPLE ·` venues are fictional, verified, and near Old Street.
