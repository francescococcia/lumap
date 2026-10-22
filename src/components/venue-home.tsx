"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VenueMap, type MapPin } from "@/components/venue-map";
import { LONDON_AREAS, LONDON_CENTER, SEARCH_RADIUS_M, type LondonArea } from "@/lib/areas";
import { getSupabase } from "@/lib/supabase";

export type VenueHit = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  capacity: number | null;
  status: string | null;
  reason: string | null;
  distance_m: number | null;
};

const DAYS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

const fieldClass =
  "h-10 w-full rounded-xl border border-[#e8e7ed] bg-white px-3 text-sm text-[#20202a] outline-none focus:ring-2 focus:ring-[#7854f6]";

export function VenueHome() {
  const [areaName, setAreaName] = useState(LONDON_AREAS[0].name);
  const [capacity, setCapacity] = useState("80");
  const [day, setDay] = useState("thu");
  const [time, setTime] = useState("19:00");
  const [center, setCenter] = useState(LONDON_CENTER);
  const [results, setResults] = useState<VenueHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const area = LONDON_AREAS.find((item) => item.name === areaName) as LondonArea;
    const minCapacity = capacity.trim() === "" ? null : Number(capacity);
    if (minCapacity !== null && (!Number.isFinite(minCapacity) || minCapacity < 0)) {
      setError("Capacity needs to be a number.");
      return;
    }

    setLoading(true);
    setError(null);
    setCenter(area);
    try {
      const supabase = getSupabase();
      const { data, error: rpcError } = await supabase.rpc("search_venues", {
        lat: area.lat,
        lng: area.lng,
        radius_m: SEARCH_RADIUS_M,
        min_capacity: minCapacity,
        day_of_week: day || null,
        start_time: time || null,
        max_results: 3,
      });
      if (rpcError) {
        setResults([]);
        setError(rpcError.message);
      } else {
        setResults((data ?? []) as VenueHit[]);
      }
      setSearched(true);
    } catch (caught) {
      setResults([]);
      setError(caught instanceof Error ? caught.message : "Search failed.");
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  const pins: MapPin[] = results
    .filter((venue) => Number.isFinite(venue.lat) && Number.isFinite(venue.lng))
    .map((venue) => ({
      id: venue.id,
      name: venue.name,
      lat: venue.lat,
      lng: venue.lng,
      status: venue.status,
    }));

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[560px]">
      <VenueMap pins={pins} center={center} />
      <section className="absolute top-4 left-4 z-10 flex max-h-[calc(100%-2rem)] w-[min(100%-2rem,380px)] flex-col gap-3 overflow-auto rounded-[20px] border border-[#ecebf0] bg-white/95 p-4 shadow-[0_12px_40px_rgba(32,32,42,0.08)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Find a room</h1>
          <nav className="flex gap-3 text-sm font-medium" aria-label="More">
            <a className="text-[#7854f6] hover:underline" href="/events">
              Events feed
            </a>
            <a className="text-[#7854f6] hover:underline" href="/ask">
              Ask
            </a>
          </nav>
        </div>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm font-medium text-[#30303a]">
            Area
            <select className={fieldClass} value={areaName} onChange={(event) => setAreaName(event.target.value)}>
              {LONDON_AREAS.map((area) => (
                <option key={area.name} value={area.name}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-[#30303a]">
            Capacity
            <input
              className={fieldClass}
              inputMode="numeric"
              min={0}
              name="capacity"
              type="number"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-medium text-[#30303a]">
              Day
              <select className={fieldClass} value={day} onChange={(event) => setDay(event.target.value)}>
                {DAYS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-[#30303a]">
              Time
              <input className={fieldClass} type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
          </div>
          <Button className="h-10 rounded-xl bg-[#7854f6] text-white hover:bg-[#6842eb]" disabled={loading} type="submit">
            <Search className="mr-2 h-4 w-4" />
            {loading ? "Searching…" : "Search venues"}
          </Button>
        </form>
        {error ? <p className="rounded-xl bg-[#fff4f4] px-3 py-2 text-sm text-[#9b2c2c]">{error}</p> : null}
        <div className="grid gap-3">
          {results.map((venue, index) => (
            <motion.div
              key={venue.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>{venue.name}</CardTitle>
                  <CardDescription>{venue.address || "London"}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-1 text-[#484751]">
                  <p>{venue.reason}</p>
                  <p className="text-xs text-[#777580]">
                    {venue.capacity ? `Fits ${venue.capacity}` : "Capacity unknown"}
                    {venue.distance_m != null ? ` · ${Math.round(venue.distance_m)} m` : ""}
                    {venue.status ? ` · ${venue.status}` : ""}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {searched && !error && results.length === 0 ? (
            <p className="text-sm text-[#777580]">No venues in that search.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
