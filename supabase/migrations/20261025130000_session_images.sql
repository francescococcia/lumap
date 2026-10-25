-- Cover images for recurring sessions: the event's own cover (Luma) or the page's og:image.
-- Null when the page has no usable image. Adds image_url (and the session key) to search_venues sessions.
alter table public.recurring_sessions add column if not exists image_url text;

update public.recurring_sessions set image_url = 'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,width=800/event-covers/js/761a02d4-9def-4fae-9c18-2dcc896635f7.png' where session_key = 'superteam-coworking-fridays' and image_url is null;
update public.recurring_sessions set image_url = 'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,width=800/uploads/0h/c5e5ad9e-93aa-446b-8cca-3affa592874d.jpg' where session_key = 'founder-cowork-club-thursdays' and image_url is null;
update public.recurring_sessions set image_url = 'https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,width=800/event-covers/ho/b32cd204-7f81-41e0-b269-48210aa8165f.png' where session_key = 'cafe-granola-coworking-sunday' and image_url is null;
update public.recurring_sessions set image_url = 'https://cdn.lu.ma/cdn-cgi/image/format=auto,fit=cover,width=800/event-covers/jg/a7ff7dd1-4bc3-4eef-9855-b523c435b4d4' where session_key = 'newspeak-ration-club' and image_url is null;
update public.recurring_sessions set image_url = 'https://newspeak.house/assets/lcpt-roundel-social-card-c0854c7b8029d576ce52f59b347cbbc86fbbfd1696a85193404bc42f481bdb89.jpg' where session_key = 'campaign-lab-hack-night' and image_url is null;
update public.recurring_sessions set image_url = 'https://static1.squarespace.com/static/62d6fb2b93f04975c050bdf3/t/65169ab26da3192bf1eaf8d5/1662285681636/social.jpg?format=750w' where session_key = 'drink-and-draw-grosvenor' and image_url is null;

CREATE OR REPLACE FUNCTION public.search_venues(lat double precision, lng double precision, radius_m integer, min_capacity integer DEFAULT NULL::integer, day_of_week text DEFAULT NULL::text, start_time time without time zone DEFAULT NULL::time without time zone, max_results integer DEFAULT 3)
 RETURNS SETOF search_venue_result
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  q_lat double precision := lat;
  q_lng double precision := lng;
  q_radius integer := radius_m;
  q_min integer := min_capacity;
  q_start time := start_time;
  q_limit integer := least(greatest(coalesce(max_results, 3), 1), 20);
  day_key text := public.normalise_day(day_of_week);
  day_label text;
begin
  if q_lat is null or q_lng is null or q_radius is null then
    raise exception 'search_venues needs lat, lng and radius_m';
  end if;
  if q_radius <= 0 then
    raise exception 'radius_m must be greater than 0';
  end if;
  if q_lat < -90 or q_lat > 90 or q_lng < -180 or q_lng > 180 then
    raise exception 'lat must be between -90 and 90 and lng between -180 and 180';
  end if;

  day_label := case day_key
    when 'mon' then 'Mon'
    when 'tue' then 'Tue'
    when 'wed' then 'Wed'
    when 'thu' then 'Thu'
    when 'fri' then 'Fri'
    when 'sat' then 'Sat'
    when 'sun' then 'Sun'
    else null
  end;

  return query
  with origin as (
    select st_setsrid(st_makepoint(q_lng, q_lat), 4326)::geography as geog
  ),
  visible as (
    select v.*
    from public.venues v
    where v.status = 'verified'
      or public.is_vouched(auth.uid())
      or (v.status = 'pending' and public.is_vouched(v.created_by))
  ),
  nearby as (
    select
      v.*,
      st_distance(v.location, o.geog) as dist_m
    from visible v
    cross join origin o
    where st_dwithin(v.location, o.geog, q_radius)
      and (
        q_min is null
        or v.capacity is null
        or v.capacity >= q_min
      )
  ),
  hosted as (
    select
      h.venue_id,
      count(*)::integer as event_count,
      max(h.guest_count) filter (where h.guest_count > 0)::integer as largest
    from public.hosted_events h
    group by h.venue_id
  ),
  -- Recurring public sessions (Co-Working Fridays and so on) per venue.
  -- on_slot is true when one runs on the requested day and, if a time was
  -- given, is running at that time.
  sess as (
    select
      r.venue_id,
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'title', r.title,
          'organiser', r.organiser,
          'use_case', r.use_case,
          'day_of_week', r.day_of_week,
          'start_time', to_char(r.start_time, 'HH24:MI'),
          'end_time', to_char(r.end_time, 'HH24:MI'),
          'cadence', r.cadence,
          'price', r.price,
          'rsvp', r.rsvp,
          'url', r.url,
          'source_url', r.source_url,
          'summary', r.summary,
          'key', r.session_key,
          'image_url', r.image_url
        )
        order by r.day_of_week, r.start_time
      ) as items,
      bool_or(
        day_key is not null
        and r.day_of_week = day_key
        and (q_start is null or (q_start >= r.start_time and q_start < r.end_time))
      ) as on_slot
    from public.recurring_sessions r
    group by r.venue_id
  ),
  scored as (
    select
      n.id as venue_id,
      n.name as venue_name,
      n.address as venue_address,
      n.lat as venue_lat,
      n.lng as venue_lng,
      n.capacity as venue_capacity,
      n.has_av as venue_has_av,
      n.av_notes as venue_av_notes,
      n.terms as venue_terms,
      n.hours as venue_hours,
      n.evening_hours as venue_evening_hours,
      n.weekend_hours as venue_weekend_hours,
      n.notes as venue_notes,
      n.status as venue_status,
      n.venue_type as venue_kind,
      n.good_for as venue_good_for,
      n.source_url as venue_source_url,
      se.items as venue_sessions,
      coalesce(se.on_slot, false) as on_slot,
      n.dist_m,
      coalesce(h.event_count, 0) as event_count,
      h.largest,
      public.hours_state(n.hours, day_key, q_start) as slot,
      case
        when n.capacity is not null
          and public.hours_state(n.hours, day_key, q_start) in ('open_evening', 'open', 'skip')
          then 70
        when n.capacity is not null
          and public.hours_state(n.hours, day_key, q_start) = 'unknown'
          then 50
        when n.capacity is null
          and public.hours_state(n.hours, day_key, q_start) in ('open_evening', 'open')
          then 40
        when n.capacity is null
          and public.hours_state(n.hours, day_key, q_start) in ('skip', 'unknown')
          then 30
        when n.capacity is not null
          then 20
        else 10
      end
      + case when coalesce(se.on_slot, false) then 100 else 0 end as fit_rank
    from nearby n
    left join hosted h on h.venue_id = n.id
    left join sess se on se.venue_id = n.id
  )
  select
    s.venue_id,
    s.venue_name,
    s.venue_address,
    s.venue_lat,
    s.venue_lng,
    s.venue_capacity,
    s.venue_has_av,
    s.venue_av_notes,
    s.venue_terms,
    s.venue_hours,
    s.venue_evening_hours,
    s.venue_weekend_hours,
    s.venue_notes,
    s.venue_status,
    s.event_count,
    s.largest,
    s.dist_m,
    (
      s.fit_rank::numeric * 1000000000
      + s.event_count::numeric * 1000000
      + coalesce(s.largest, 0)::numeric * 1000
      + greatest(0::numeric, 100000::numeric - least(s.dist_m, 99999::double precision)::numeric)
    )::numeric as score,
    concat_ws(
      ' · ',
      case when s.on_slot then 'recurring session that day' end,
      case
        when s.venue_capacity is null then 'capacity unknown'
        when q_min is not null and s.venue_capacity >= q_min then 'fits ' || q_min::text
        else 'capacity ' || s.venue_capacity::text
      end,
      case s.slot
        when 'skip' then null
        when 'unknown' then 'hours unknown'
        when 'open_evening' then 'open ' || day_label || ' evenings'
        when 'open' then 'open ' || day_label || ' '
          || (s.venue_hours -> day_key ->> 'start') || '–'
          || (s.venue_hours -> day_key ->> 'end')
        else 'closed ' || day_label
          || case
            when q_start is null then ''
            else ' at ' || to_char(q_start, 'HH24:MI')
          end
      end,
      case
        when s.event_count = 0 then 'no community events yet'
        when s.largest is null then 'hosted ' || s.event_count::text
          || case when s.event_count = 1 then ' community event' else ' community events' end
        else 'hosted ' || s.event_count::text
          || case when s.event_count = 1 then ' community event' else ' community events' end
          || ', largest ' || s.largest::text
      end
    ) as reason,
    s.venue_kind,
    s.venue_good_for,
    s.venue_source_url,
    coalesce(s.venue_sessions, '[]'::jsonb)
  from scored s
  order by s.fit_rank desc, s.event_count desc, coalesce(s.largest, 0) desc, s.dist_m asc
  limit q_limit;
end;
$function$;
