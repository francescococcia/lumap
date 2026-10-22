"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CalendarDays, CheckCircle2, Lock, Mail, Clock, MapPin as MapPinIcon, Navigation, Search, ShieldCheck, Users, X } from "lucide-react";
import { FancySelect, Stepper } from "@/components/ui/fancy-select";
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
  "h-11 w-full rounded-xl border border-[#e8e7ed] bg-white px-3 text-sm font-medium text-[#20202a] shadow-[0_1px_2px_rgba(32,32,42,0.04)] outline-none transition-all hover:border-[#cfc4fb] focus:border-[#b9a7fb] focus:ring-4 focus:ring-[#7854f6]/10";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vouched, setVouched] = useState<Record<string, boolean>>({});
  const [requested, setRequested] = useState<Record<string, boolean>>({});

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
    setSelectedId(null);
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

  const pins: MapPin[] = useMemo(
    () =>
      results.flatMap((venue) => {
        const lat = Number(venue.lat);
        const lng = Number(venue.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
        return [{ id: venue.id, name: venue.name, lat, lng, status: venue.status }];
      }),
    [results],
  );
  const selected = results.find((venue) => venue.id === selectedId) ?? null;
  const clean = (text: string | null) => (text ?? "").replace(/\u00c2/g, "");

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[560px]">
      <VenueMap pins={pins} center={center} selectedId={selectedId} onSelect={setSelectedId} />
      <section className="absolute top-4 left-4 z-10 flex max-h-[calc(100%-2rem)] w-[min(100%-2rem,380px)] flex-col gap-3 overflow-auto rounded-[20px] border border-[#ecebf0] bg-white/95 p-4 shadow-[0_12px_40px_rgba(32,32,42,0.08)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Find a room</h1>
          <nav className="flex gap-3 text-sm font-medium" aria-label="More">
            <a className="text-[#7854f6] hover:underline" href="/events">
              Events feed
            </a>
          </nav>
        </div>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid gap-1.5 text-sm font-medium text-[#30303a]">
            <span>Area</span>
            <FancySelect label="Area" icon={<MapPinIcon className="h-4 w-4" />} value={areaName} onChange={setAreaName} options={LONDON_AREAS.map((area) => ({ value: area.name, label: area.name }))} />
          </div>
          <div className="grid gap-1.5 text-sm font-medium text-[#30303a]">
            <span>Capacity</span>
            <Stepper label="Capacity" value={capacity} onChange={setCapacity} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5 text-sm font-medium text-[#30303a]">
              <span>Day</span>
              <FancySelect label="Day" icon={<CalendarDays className="h-4 w-4" />} value={day} onChange={setDay} options={DAYS} />
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-[#30303a]">
              Time
              <input className={fieldClass} type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
          </div>
          <Button className="h-11 rounded-xl bg-[#7854f6] shadow-[0_8px_20px_rgba(120,84,246,0.25)] transition-transform active:scale-[0.98] text-white hover:bg-[#6842eb]" disabled={loading} type="submit">
            <Search className="mr-2 h-4 w-4" />
            {loading ? "Searching…" : "Search venues"}
          </Button>
        </form>
        {error ? <p className="rounded-xl bg-[#fff4f4] px-3 py-2 text-sm text-[#9b2c2c]">{error}</p> : null}
        <div className="grid gap-3">
          {loading
            ? [0, 1, 2].map((i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  className="h-[108px] rounded-2xl bg-gradient-to-r from-[#f3f1f8] via-[#ebe6fb] to-[#f3f1f8] bg-[length:200%_100%]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, backgroundPosition: ["100% 0%", "-100% 0%"] }}
                  transition={{ opacity: { delay: i * 0.08 }, backgroundPosition: { duration: 1.2, repeat: Infinity, ease: "linear" } }}
                />
              ))
            : null}
          <AnimatePresence>
          {results.map((venue, index) => (
            <motion.button
              type="button"
              key={venue.id}
              onClick={() => setSelectedId(venue.id)}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 26, delay: index * 0.1 }}
              className="text-left"
            >
              <Card className={`transition-shadow ${selectedId === venue.id ? "border-[#7854f6] shadow-[0_0_0_3px_rgba(120,84,246,0.15)]" : "hover:shadow-md"}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#7854f6] text-xs font-semibold text-white">{index + 1}</span>
                    {venue.name}
                  </CardTitle>
                  <CardDescription>{clean(venue.address) || "London"}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-1 text-[#484751]">
                  <p>{clean(venue.reason)}</p>
                  <p className="text-xs text-[#777580]">
                    {venue.capacity ? `Fits ${venue.capacity}` : "Capacity unknown"}
                    {venue.distance_m != null ? ` · ${Math.round(venue.distance_m)} m` : ""}
                    {venue.status ? ` · ${venue.status}` : ""}
                  </p>
                </CardContent>
              </Card>
            </motion.button>
          ))}
          </AnimatePresence>
          {searched && !error && results.length === 0 ? (
            <p className="text-sm text-[#777580]">No venues in that search.</p>
          ) : null}
        </div>
      </section>

      <AnimatePresence>
        {selected ? (
          <motion.aside
            key={selected.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="absolute top-4 right-14 bottom-4 z-20 flex w-[min(100%-2rem,360px)] flex-col overflow-auto rounded-[24px] border border-[#ecebf0] bg-white/95 shadow-[0_20px_60px_rgba(32,32,42,0.14)] backdrop-blur-md"
          >
            <div className="relative h-28 shrink-0 bg-gradient-to-br from-[#efe9ff] via-[#f6f2ff] to-[#e6f7ef]">
              <button onClick={() => setSelectedId(null)} aria-label="Close venue panel" className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 text-[#6f6d78] shadow-sm hover:text-[#20202a]">
                <X className="h-4 w-4" />
              </button>
              <span className={`absolute bottom-3 left-5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${selected.status === "pending" ? "bg-[#fff4e0] text-[#a86a10]" : "bg-[#e6f7ef] text-[#1f7a52]"}`}>
                <ShieldCheck className="h-3.5 w-3.5" /> {selected.status === "pending" ? "Pending vouches" : "Vouched by organisers"}
              </span>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#20202a]">{selected.name}</h2>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-[#6f6d78]"><MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />{clean(selected.address) || "London"}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-[#faf9ff] p-3"><p className="text-xs text-[#8a8894]">Capacity</p><p className="mt-0.5 flex items-center gap-1.5 font-semibold"><Users className="h-4 w-4 text-[#7854f6]" />{selected.capacity ?? "?"}</p></div>
                <div className="rounded-2xl bg-[#faf9ff] p-3"><p className="text-xs text-[#8a8894]">Distance</p><p className="mt-0.5 flex items-center gap-1.5 font-semibold"><Navigation className="h-4 w-4 text-[#7854f6]" />{selected.distance_m != null ? `${Math.round(selected.distance_m)} m` : "?"}</p></div>
              </div>
              <div className="rounded-2xl border border-[#ecebf0] p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8473c2]">Why it matches</p>
                <p className="text-sm leading-6 text-[#484751]">{clean(selected.reason)}</p>
              </div>
              <div className="rounded-2xl border border-[#f3e3c3] bg-[#fffaf0] p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#a86a10]">
                  <AlertCircle className="h-3.5 w-3.5" /> Still missing for organisers
                </p>
                <ul className="grid gap-1.5 text-sm text-[#5f5640]">
                  <li className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-[#a86a10]" /> Booking contact, shared only with vouched organisers</li>
                  <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#e3b25a]" /> Price per evening</li>
                  <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#e3b25a]" /> Step-free access and toilets</li>
                  <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#e3b25a]" /> Projector, mics and wifi</li>
                </ul>
                <button
                  type="button"
                  onClick={() => setRequested((r) => ({ ...r, [selected.id]: true }))}
                  disabled={requested[selected.id]}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#ecd7ad] bg-white text-sm font-medium text-[#6b4a0c] transition-colors hover:bg-[#fff4de] disabled:cursor-default disabled:border-[#cfe9db] disabled:bg-[#f3fbf6] disabled:text-[#1f7a52]"
                >
                  {requested[selected.id] ? <><CheckCircle2 className="h-4 w-4" /> Asked the vouching organisers</> : <><Mail className="h-4 w-4" /> Request contact and details</>}
                </button>
              </div>
              <Button
                onClick={() => setVouched((v) => ({ ...v, [selected.id]: !v[selected.id] }))}
                className={`h-11 rounded-xl ${vouched[selected.id] ? "bg-[#e6f7ef] text-[#1f7a52] hover:bg-[#d9f2e6]" : "bg-[#7854f6] text-white hover:bg-[#6842eb]"}`}
              >
                {vouched[selected.id] ? <><CheckCircle2 className="mr-2 h-4 w-4" />You vouched for this venue</> : <><ShieldCheck className="mr-2 h-4 w-4" />I've hosted here, vouch</>}
              </Button>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e8e7ed] text-sm font-medium text-[#30303a] hover:bg-[#faf9ff]"
              >
                <Navigation className="h-4 w-4" /> Directions
              </a>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
