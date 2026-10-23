"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Maximize2, Sparkles, ExternalLink, Laptop, PartyPopper, Presentation, AlertCircle, CalendarDays, CheckCircle2, Lock, Mail, Clock, MapPin as MapPinIcon, Navigation, Search, ShieldCheck, Users, X } from "lucide-react";
import { FancySelect, Stepper } from "@/components/ui/fancy-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FIT_COLOR, VenueMap, type MapPin } from "@/components/venue-map";
import { LONDON_AREAS, LONDON_CENTER, SEARCH_RADIUS_M, type LondonArea } from "@/lib/areas";
import { getSupabase } from "@/lib/supabase";
import { CHANGE_EVENT, listVenues } from "@/lib/pending-venues";
import { ASK_VENUES_EVENT, FOCUS_VENUE_EVENT } from "@/components/ask-panel";
import { USE_CASES, kindScore, venueKind, type UseCaseId } from "@/lib/use-cases";
import { CoworkWeek } from "@/components/cowork-week";
import { coworkSessions, type CoworkItem } from "@/lib/cowork";
import { listSessions } from "@/lib/pending-sessions";
import { NEW_TAB, directionsUrl, sessionLink, venueSite } from "@/lib/links";
import { TYPE_LABEL, matchingSession, sessionsInSlot, sessionWhen, useCaseScore, venueSessions, venueSources, venueType, type Session, type VenueType } from "@/lib/venue-facts";
import { DAY_LABEL, WEEK, dayWindow, hoursFit, type DayKey, type Hours, type HoursFit } from "@/lib/hours";

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
  hours?: Hours;
  notes?: string | null;
  terms?: string | null;
  venue_type?: string | null;
  good_for?: string[] | null;
  source_url?: string | null;
  sessions?: Session[] | null;
};

const USE_CASE_ICON: Record<UseCaseId, React.ReactNode> = {
  meetup: <Users className="h-4 w-4" />,
  cowork: <Laptop className="h-4 w-4" />,
  party: <PartyPopper className="h-4 w-4" />,
  workshop: <Presentation className="h-4 w-4" />,
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

const ANY_AREA = "__any__";

export function VenueHome() {
  const [useCaseId, setUseCaseId] = useState<UseCaseId>("meetup");
  const useCase = USE_CASES.find((u) => u.id === useCaseId) ?? USE_CASES[0];
  const searchAfterPick = useRef(false);
  const [areaName, setAreaName] = useState(LONDON_AREAS[0].name);
  const [capacity, setCapacity] = useState("80");
  const [day, setDay] = useState("thu");
  const [time, setTime] = useState("19:00");
  const [endTime, setEndTime] = useState("22:00");
  const [confirmedOnly, setConfirmedOnly] = useState(false);

  function pickUseCase(id: UseCaseId) {
    const next = USE_CASES.find((u) => u.id === id);
    if (!next || id === useCaseId) return;
    setUseCaseId(id);
    setDay(next.day);
    setTime(next.start);
    setEndTime(next.end);
    setCapacity(next.capacity);
    searchAfterPick.current = true;
  }
  useEffect(() => {
    if (!searchAfterPick.current) return;
    searchAfterPick.current = false;
    void onSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCaseId, day, time, endTime, capacity]);
  // "Show on map" from the cowork-with-others list: set the slot, search the area, then select the venue.
  const showSearch = useRef<string | null>(null);
  const showTarget = useRef<string | null>(null);
  const showSawLoading = useRef(false);
  const [showTick, setShowTick] = useState(0);
  function showOnMap(s: CoworkItem) {
    showTarget.current = s.venue_name ?? null;
    showSearch.current = s.area;
    setUseCaseId("cowork");
    setAreaName(s.area);
    setDay(s.day_of_week);
    setTime(s.start_time);
    setEndTime(s.end_time);
    setShowTick((t) => t + 1);
  }
  useEffect(() => {
    const area = showSearch.current;
    if (!area) return;
    showSearch.current = null;
    void onSubmit(undefined, area);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTick]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("session");
    if (key) {
      const hosted = listSessions().filter((s) => s.status === "verified").map((s) => ({ ...s, key: s.id }));
      const hit = [...coworkSessions(), ...hosted].find((s) => s.key === key);
      if (hit) return showOnMap(hit as CoworkItem);
    }
    if (params.get("for") === "cowork") pickUseCase("cowork");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [center, setCenter] = useState(LONDON_CENTER);
  const [results, setResults] = useState<VenueHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const [vouched, setVouched] = useState<Record<string, boolean>>({});
  const [requested, setRequested] = useState<Record<string, boolean>>({});

  const [areaSuggestions, setAreaSuggestions] = useState<{ name: string; count: number; vouched: number; maxCap: number | null; sessions: number }[]>([]);

  async function onSubmit(event?: React.FormEvent, overrideArea?: string) {
    event?.preventDefault();
    const chosen = overrideArea ?? areaName;
    if (chosen === ANY_AREA) return suggestAreas();
    setAreaSuggestions([]);
    const area = LONDON_AREAS.find((item) => item.name === chosen) as LondonArea;
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
        max_results: 20,
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

  async function suggestAreas() {
    const minCapacity = capacity.trim() === "" ? null : Number(capacity);
    setLoading(true);
    setError(null);
    setSelectedId(null);
    try {
      const supabase = getSupabase();
      const perArea = await Promise.all(
        LONDON_AREAS.map(async (area) => {
          const { data } = await supabase.rpc("search_venues", {
            lat: area.lat,
            lng: area.lng,
            radius_m: SEARCH_RADIUS_M,
            min_capacity: minCapacity,
            day_of_week: day || null,
            start_time: time || null,
            max_results: 20,
          });
          const hits = ((data ?? []) as VenueHit[]).filter((v) => {
            if (matchingSession(v, useCaseId, day as DayKey, time, endTime)) return true;
            const f = hoursFit(v.hours, day as DayKey, time, endTime);
            return f.state === "covers" || (f.state === "unknown" && !confirmedOnly);
          });
          return { area, hits };
        }),
      );
      const local = listVenues().filter((v) => v.status === "verified" && (minCapacity == null || (v.capacity ?? 0) >= minCapacity));
      const stats = perArea
        .map(({ area, hits }) => {
          const extra = local.filter((v) => v.area === area.name).length;
          const caps = hits.map((h) => h.capacity ?? 0);
          return { name: area.name, count: hits.length + extra, vouched: hits.filter((x) => x.status !== "pending").length + extra, maxCap: caps.length ? Math.max(...caps) : null };
        })
        .filter((s) => s.count > 0)
        .map((s) => ({ ...s, sessions: perArea.find((p) => p.area.name === s.name)!.hits.filter((v) => matchingSession(v, useCaseId, day as DayKey, time, endTime)).length }))
        .sort((a, b) => b.sessions - a.sessions || b.vouched - a.vouched || b.count - a.count || (b.maxCap ?? 0) - (a.maxCap ?? 0));
      setAreaSuggestions(stats);
      const seen = new Set<string>();
      const ordered = [...perArea]
        .sort((a, b) => stats.findIndex((s) => s.name === a.area.name) - stats.findIndex((s) => s.name === b.area.name))
        .flatMap((p) => p.hits)
        .filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
      setResults(ordered);
      const top = LONDON_AREAS.find((a) => a.name === stats[0]?.name);
      setCenter(top ?? LONDON_CENTER);
      setSearched(true);
    } catch (caught) {
      setResults([]);
      setError(caught instanceof Error ? caught.message : "Search failed.");
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  const [localVenues, setLocalVenues] = useState<VenueHit[]>([]);
  useEffect(() => {
    const load = () =>
      setLocalVenues(
        listVenues()
          .filter((v) => v.status === "verified")
          .map((v) => ({
            id: v.id,
            name: v.name,
            address: [v.address, v.area].filter(Boolean).join(", "),
            lat: v.lat,
            lng: v.lng,
            capacity: v.capacity,
            status: "verified",
            reason: v.note ? `New: vouched by 2 organisers · ${v.note}` : "New: vouched by 2 organisers",
            distance_m: null,
          })),
      );
    load();
    window.addEventListener(CHANGE_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(CHANGE_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);
  const [askVenues, setAskVenues] = useState<VenueHit[]>([]);
  const [askOpen, setAskOpen] = useState(false);
  useEffect(() => {
    const onOpen = (e: Event) => setAskOpen(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("lumap:ask-open", onOpen);
    return () => window.removeEventListener("lumap:ask-open", onOpen);
  }, []);
  useEffect(() => {
    const onVenues = (e: Event) => setAskVenues((e as CustomEvent<VenueHit[]>).detail ?? []);
    const onFocus = (e: Event) => setSelectedId((e as CustomEvent<string>).detail);
    window.addEventListener(ASK_VENUES_EVENT, onVenues);
    window.addEventListener(FOCUS_VENUE_EVENT, onFocus);
    return () => {
      window.removeEventListener(ASK_VENUES_EVENT, onVenues);
      window.removeEventListener(FOCUS_VENUE_EVENT, onFocus);
    };
  }, []);
  const allResults = useMemo(() => {
    const seen = new Set<string>();
    const need = Number(capacity) || 0;
    const fits = (v: VenueHit) => v.capacity == null || v.capacity >= need;
    return [...askVenues, ...localVenues.filter(fits), ...results.filter(fits)].filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
  }, [askVenues, localVenues, results, capacity]);

  const fitById = useMemo(() => {
    const map: Record<string, HoursFit> = {};
    for (const v of allResults) map[v.id] = hoursFit(v.hours, day as DayKey, time, endTime);
    return map;
  }, [allResults, day, time, endTime]);
  const askIds = useMemo(() => new Set(askVenues.map((v) => v.id)), [askVenues]);
  const sessionById = useMemo(() => {
    const map: Record<string, Session> = {};
    for (const v of allResults) {
      const s = matchingSession(v, useCaseId, day as DayKey, time, endTime);
      if (s) map[v.id] = s;
    }
    return map;
  }, [allResults, useCaseId, day, time, endTime]);
  const hiddenByHours = allResults.filter((v) => !askIds.has(v.id) && !sessionById[v.id] && (fitById[v.id]?.state === "short" || fitById[v.id]?.state === "closed"));
  const visibleResults = useMemo(() => {
    const rank = (v: VenueHit) =>
      (askIds.has(v.id) ? 1000 : sessionById[v.id] ? 500 : fitById[v.id]?.state === "covers" ? 200 : 100) +
      (useCaseScore(v, useCaseId) ? 60 : kindScore(venueKind(v), useCase) * 5) +
      (v.status === "verified" ? 5 : 0) +
      (v.capacity != null ? 2 : 0);
    return allResults
      .filter((v) => {
        if (askIds.has(v.id) || sessionById[v.id]) return true;
        const st = fitById[v.id]?.state;
        return st === "covers" || (st === "unknown" && !confirmedOnly);
      })
      .map((v, i) => ({ v, i }))
      .sort((a, b) => rank(b.v) - rank(a.v) || a.i - b.i)
      .map(({ v }) => v);
  }, [allResults, fitById, askIds, sessionById, confirmedOnly, useCase, useCaseId]);

  useEffect(() => {
    const target = showTarget.current;
    if (!target) return;
    if (loading) {
      showSawLoading.current = true;
      return;
    }
    if (!showSawLoading.current || !searched) return;
    showSawLoading.current = false;
    const n = (x: string) => x.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
    const hit = visibleResults.find((v) => n(v.name) === n(target) || n(v.name).startsWith(n(target)) || n(target).startsWith(n(v.name)));
    showTarget.current = null;
    if (hit) setSelectedId(hit.id);
  }, [visibleResults, loading, searched]);

  // Sessions in this slot that the current area does not cover, so a
  // "coworking on Friday" search can point at Somerset House from anywhere.
  const elsewhere = useMemo(() => {
    if (!searched) return [];
    const shown = new Set(visibleResults.map((v) => v.name.toLowerCase()));
    return sessionsInSlot(useCaseId, day as DayKey, time, endTime)
      .filter((s) => !shown.has((s.venue_name ?? "").toLowerCase()))
      .map((s) => {
        const near = [...LONDON_AREAS].sort((a, b) => Math.hypot(a.lat - s.lat, (a.lng - s.lng) * 0.62) - Math.hypot(b.lat - s.lat, (b.lng - s.lng) * 0.62))[0];
        return { session: s, area: near };
      });
  }, [searched, visibleResults, useCaseId, day, time, endTime]);

  const autoSearched = useRef(false);
  useEffect(() => {
    if (autoSearched.current) return;
    autoSearched.current = true;
    const timer = setTimeout(() => void onSubmit(), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pins: MapPin[] = useMemo(
    () =>
      visibleResults.flatMap((venue) => {
        const lat = Number(venue.lat);
        const lng = Number(venue.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
        const fit = askIds.has(venue.id) ? ("ask" as const) : fitById[venue.id]?.state === "covers" ? ("covers" as const) : ("unknown" as const);
        const session = sessionById[venue.id];
        return [{ id: venue.id, name: venue.name, lat, lng, status: venue.status, fit, kind: TYPE_LABEL[venueType(venue)], note: session ? `${session.title}, ${sessionWhen(session)}` : fitById[venue.id]?.label, session: Boolean(session) }];
      }),
    [visibleResults, askIds, fitById, sessionById],
  );
  const selected = allResults.find((venue) => venue.id === selectedId) ?? null;
  // Some rows were pasted through a Windows code page, so undo the common mojibake.
  const clean = (text: string | null) => (text ?? "").replace(/\u00e2\u20ac\u201c/g, "–").replace(/\u00e2\u20ac\u2122/g, "’").replace(/\u00c2/g, "");

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[560px]">
      <VenueMap pins={pins} center={center} selectedId={selectedId} onSelect={setSelectedId} hoveredId={hoveredId} onHover={setHoveredId} fitKey={fitKey} />
      <AnimatePresence>
        {pins.length ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#ecebf0] bg-white/95 py-1.5 pr-1.5 pl-4 text-xs font-medium text-[#484751] shadow-[0_8px_24px_rgba(32,32,42,0.1)] backdrop-blur-sm max-md:hidden"
          >
            {[
              { c: FIT_COLOR.covers, t: `Open ${DAY_LABEL[day as DayKey] ?? ""} ${time}–${endTime}` },
              { c: FIT_COLOR.unknown, t: "Hours not listed" },
              ...(askVenues.length ? [{ c: FIT_COLOR.ask, t: "From Ask" }] : []),
            ].map((item) => (
              <span key={item.t} className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full ring-2 ring-white" style={{ background: item.c, boxShadow: "0 0 0 1px #e4e2ea" }} />
                {item.t}
              </span>
            ))}
            {pins.some((p) => p.session) ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#b4235e]">
                <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[#e0457b] text-[8px] leading-none text-white">★</span> Session that day
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 text-[#6f6d78]">
              <span className="h-3 w-3 rounded-full border-2 border-dashed border-[#b8b5c2]" /> Pending vouches
            </span>
            <button type="button" onClick={() => setFitKey((k) => k + 1)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#f0ebff] px-3 font-semibold text-[#5a3fd6] transition-colors hover:bg-[#e6defe]">
              <Maximize2 className="h-3.5 w-3.5" /> Fit {pins.length} {pins.length === 1 ? "venue" : "venues"}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <section className="absolute top-4 left-4 z-10 flex max-h-[calc(100%-2rem)] w-[min(100%-2rem,380px)] flex-col gap-3 overflow-auto rounded-[20px] [scrollbar-width:thin] [scrollbar-color:#d9d4ea_transparent] border border-[#ecebf0] bg-white/95 p-4 shadow-[0_12px_40px_rgba(32,32,42,0.08)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Find a room</h1>
          <nav className="flex gap-3 text-sm font-medium" aria-label="More">
            <a className="!text-[#7854f6] hover:underline" href="/events">
              Events feed
            </a>
            <a className="!text-[#7854f6] hover:underline" href="/ask">
              Ask
            </a>
          </nav>
        </div>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid gap-1.5 text-sm font-medium text-[#30303a]">
            <span>What&apos;s it for?</span>
            <div role="radiogroup" aria-label="What's it for" className="grid grid-cols-2 gap-1.5">
              {USE_CASES.map((u) => {
                const active = u.id === useCaseId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pickUseCase(u.id)}
                    className={`relative flex h-10 items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold ring-1 transition-colors ${active ? "text-[#4b2fd0] ring-[#cfc4fb]" : "bg-white text-[#5f5d68] ring-[#ecebf0] hover:bg-[#faf9ff]"}`}
                  >
                    {active ? <motion.span layoutId="usecase-pill" className="absolute inset-0 rounded-xl bg-[#f0ebff]" transition={{ type: "spring", stiffness: 420, damping: 32 }} /> : null}
                    <span className="relative">{USE_CASE_ICON[u.id]}</span>
                    <span className="relative">{u.label}</span>
                  </button>
                );
              })}
            </div>
            <AnimatePresence mode="wait">
              <motion.p key={useCase.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs font-normal text-[#777580]">
                {useCase.tip}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="grid gap-1.5 text-sm font-medium text-[#30303a]">
            <span>Area</span>
            <FancySelect label="Area" icon={<MapPinIcon className="h-4 w-4" />} value={areaName} onChange={setAreaName} options={[{ value: ANY_AREA, label: "Anywhere, suggest an area" }, ...LONDON_AREAS.map((area) => ({ value: area.name, label: area.name }))]} />
          </div>
          <div className="grid gap-1.5 text-sm font-medium text-[#30303a]">
            <span>Capacity</span>
            <Stepper label="Capacity" value={capacity} onChange={setCapacity} />
            <button type="button" onClick={() => setCapacity(capacity === "" ? "60" : "")} className="mt-1.5 text-xs font-medium text-[#7854f6] hover:underline">
              {capacity === "" ? "Set a headcount" : "Not sure yet? Show any size"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid gap-1.5 text-sm font-medium text-[#30303a]">
              <span>Day</span>
              <div role="radiogroup" aria-label="Day" className="grid grid-cols-7 gap-1 rounded-xl bg-[#f4f3f8] p-1">
                {DAYS.map((item) => {
                  const active = item.value === day;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={item.label}
                      onClick={() => setDay(item.value)}
                      className={`relative h-9 rounded-lg text-xs font-semibold transition-colors ${active ? "text-white" : "text-[#6f6d78] hover:text-[#20202a]"}`}
                    >
                      {active ? (
                        <motion.span layoutId="day-pill" className="absolute inset-0 rounded-lg bg-[#7854f6] shadow-[0_4px_12px_rgba(120,84,246,0.3)]" transition={{ type: "spring", stiffness: 420, damping: 32 }} />
                      ) : null}
                      <span className="relative">{item.label.slice(0, 3)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-[#30303a]">
              Starts
              <input aria-label="Start time" className={fieldClass} type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-[#30303a]">
              Ends
              <input aria-label="End time" className={fieldClass} type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </label>
            <label className="col-span-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-[#6f6d78]">
              <input type="checkbox" className="h-4 w-4 accent-[#7854f6]" checked={confirmedOnly} onChange={(e) => setConfirmedOnly(e.target.checked)} />
              Only venues with confirmed opening hours
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
          {areaSuggestions.length ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#e4ddfc] bg-[#faf9ff] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8473c2]">Suggested areas</p>
              <div className="flex flex-wrap gap-1.5">
                {areaSuggestions.map((s, i) => (
                  <button key={s.name} type="button" onClick={() => { setAreaName(s.name); void onSubmit(undefined, s.name); }} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${i === 0 ? "bg-[#7854f6] !text-white" : "bg-white text-[#5a3fd6] ring-1 ring-[#e4ddfc] hover:bg-[#f0ebff]"}`}>
                    {i === 0 ? "Best: " : ""}{s.name} · {s.count} {s.count === 1 ? "room" : "rooms"}{s.sessions ? `, ${s.sessions} ${s.sessions === 1 ? "session" : "sessions"}` : s.vouched ? `, ${s.vouched} vouched` : ""}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
          {useCaseId === "cowork" ? <CoworkWeek onShow={showOnMap} highlightDay={day} compact /> : null}
          {!loading && elsewhere.length ? (
            <div className="rounded-2xl border border-[#f3c1d4] bg-[#fff7fa] p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#b4235e]">
                <Sparkles className="h-3.5 w-3.5" /> {DAY_LABEL[day as DayKey]} sessions in other areas
              </p>
              <div className="grid gap-1.5">
                {elsewhere.map(({ session, area }) => (
                  <button
                    key={session.title}
                    type="button"
                    onClick={() => {
                      setAreaName(area.name);
                      void onSubmit(undefined, area.name);
                    }}
                    className="rounded-xl bg-white px-3 py-2 text-left text-xs text-[#7a1d45] ring-1 ring-[#f3c1d4] transition-colors hover:bg-[#fff0f5]"
                  >
                    <span className="block font-semibold">{session.title}</span>
                    <span className="block text-[#9b3a62]">{session.venue_name} · {sessionWhen(session)} · show {area.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {visibleResults.map((venue, index) => (
            <motion.div
              role="button"
              tabIndex={0}
              key={venue.id}
              onClick={() => setSelectedId(venue.id)}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setSelectedId(venue.id);
                }
              }}
              onMouseEnter={() => setHoveredId(venue.id)}
              onMouseLeave={() => setHoveredId(null)}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 26, delay: index * 0.1 }}
              className="cursor-pointer rounded-xl text-left outline-none focus-visible:ring-4 focus-visible:ring-[#7854f6]/20"
            >
              <Card className={`transition-shadow ${sessionById[venue.id] && selectedId !== venue.id ? "border-[#f3c1d4] " : ""}${selectedId === venue.id ? "border-[#7854f6] shadow-[0_0_0_3px_rgba(120,84,246,0.15)]" : hoveredId === venue.id ? "border-[#cfc4fb] shadow-md" : "hover:shadow-md"}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: pins.find((p) => p.id === venue.id)?.fit ? FIT_COLOR[pins.find((p) => p.id === venue.id)!.fit!] : "#7854f6" }}>{index + 1}</span>
                    {venue.name}
                  </CardTitle>
                  <CardDescription>{clean(venue.address) || "London"}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-1.5 text-[#484751]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <FitBadge fit={fitById[venue.id]} day={day as DayKey} />
                    <KindChip type={venueType(venue)} good={useCaseScore(venue, useCaseId) > 0} short={useCase.short} />
                  </div>
                  {sessionById[venue.id] ? <HappeningHere session={sessionById[venue.id]} /> : null}
                  <p>{clean(venue.reason)}</p>
                  <p className="text-xs text-[#777580]">
                    {venue.capacity ? `Fits ${venue.capacity}` : "Capacity unknown"}
                    {venue.distance_m != null ? ` · ${Math.round(venue.distance_m)} m` : ""}
                    {venue.status ? ` · ${venue.status}` : ""}
                  </p>
                  <VenueLinks venue={venue} compact />
                </CardContent>
              </Card>
            </motion.div>
          ))}
          </AnimatePresence>
          {searched && !error && !loading && visibleResults.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#e4ddfc] bg-[#faf9ff] px-3 py-2.5 text-sm text-[#6f6d78]">{useCase.empty}</p>
          ) : null}
          {searched && !loading && hiddenByHours.length ? (
            <p className="rounded-xl bg-[#f7f6fa] px-3 py-2 text-xs text-[#6f6d78]">
              {hiddenByHours.length} hidden because they are not open {DAY_LABEL[day as DayKey]} {time}–{endTime}: {hiddenByHours.map((v) => `${clean(v.name).replace(/^EXAMPLE · /, "")} (${fitById[v.id]?.label})`).join(", ")}.
            </p>
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
            className={`absolute top-4 bottom-4 z-20 flex w-[min(100%-2rem,360px)] flex-col overflow-auto rounded-[24px] border border-[#ecebf0] bg-white/95 shadow-[0_20px_60px_rgba(32,32,42,0.14)] backdrop-blur-md transition-[right] duration-300 ${askOpen ? "right-[470px]" : "right-14"}`}
          >
            <div className="relative h-28 shrink-0 bg-gradient-to-br from-[#efe9ff] via-[#f6f2ff] to-[#e6f7ef]">
              <button onClick={() => setSelectedId(null)} aria-label="Close venue panel" className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 text-[#6f6d78] shadow-sm hover:text-[#20202a]">
                <X className="h-4 w-4" />
              </button>
              <span className={`absolute bottom-3 left-5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${selected.status === "pending" ? "bg-[#fff4e0] text-[#a86a10]" : selected.status === "suggested" ? "bg-[#f0ebff] text-[#5a3fd6]" : "bg-[#e6f7ef] text-[#1f7a52]"}`}>
                <ShieldCheck className="h-3.5 w-3.5" /> {selected.status === "pending" ? "Pending vouches" : selected.status === "suggested" ? "Suggested by Ask Lumap" : "Vouched by organisers"}
              </span>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#20202a]">{selected.name}</h2>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-[#6f6d78]"><MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />{clean(selected.address) || "London"}</p>
              </div>
              <VenueLinks venue={selected} />
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-[#faf9ff] p-3"><p className="text-xs text-[#8a8894]">Capacity</p><p className="mt-0.5 flex items-center gap-1.5 font-semibold"><Users className="h-4 w-4 text-[#7854f6]" />{selected.capacity ?? "?"}</p></div>
                <div className="rounded-2xl bg-[#faf9ff] p-3"><p className="text-xs text-[#8a8894]">Distance</p><p className="mt-0.5 flex items-center gap-1.5 font-semibold"><Navigation className="h-4 w-4 text-[#7854f6]" />{selected.distance_m != null ? `${Math.round(selected.distance_m)} m` : "?"}</p></div>
              </div>
              {sessionById[selected.id] ? <HappeningHere session={sessionById[selected.id]} large /> : null}
              {venueSessions(selected).filter((s) => s !== sessionById[selected.id] && s.title !== sessionById[selected.id]?.title).length ? (
                <div className="rounded-2xl border border-[#ecebf0] p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#8473c2]"><CalendarDays className="h-3.5 w-3.5" /> {sessionById[selected.id] ? "Also regular here" : "Regular here"}</p>
                  <ul className="grid gap-2 text-sm text-[#484751]">
                    {venueSessions(selected)
                      .filter((s) => s.title !== sessionById[selected.id]?.title)
                      .map((s) => (
                        <li key={s.title}>
                          <span className="font-medium text-[#30303a]">{s.title}</span>
                          <span className="block text-xs text-[#777580]">{sessionWhen(s)}{s.cadence ? `, ${s.cadence}` : ""}{s.price ? ` · ${s.price}` : ""}</span>
                          {sessionLink(s) ? (
                            <a href={sessionLink(s)!.url} {...NEW_TAB} className="inline-flex items-center gap-1 text-xs font-semibold !text-[#7854f6] hover:underline">
                              {sessionLink(s)!.label} <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
              <div className="rounded-2xl border border-[#ecebf0] p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#8473c2]"><Clock className="h-3.5 w-3.5" /> Opening hours</p>
                <FitBadge fit={fitById[selected.id]} day={day as DayKey} />
                {dayWindow(selected.hours, "mon") !== undefined ? (
                  <ul className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px]">
                    {WEEK.map((d) => {
                      const w = dayWindow(selected.hours, d);
                      return (
                        <li key={d} className={`rounded-lg px-0.5 py-1.5 ${d === day ? "bg-[#f0ebff] font-semibold text-[#5a3fd6] ring-1 ring-[#d9cffd]" : "bg-[#faf9ff] text-[#6f6d78]"}`}>
                          <span className="block">{DAY_LABEL[d]}</span>
                          <span className="block leading-4">{w ? <>{w.start}<br />{w.end}</> : "shut"}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[#777580]">No hours listed yet. Check with the host before you book.</p>
                )}
              </div>
              <div className="rounded-2xl border border-[#ecebf0] p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8473c2]">Why it matches</p>
                <p className="text-sm leading-6 text-[#484751]">{clean(selected.reason)}</p>
                <div className="mt-2"><KindChip type={venueType(selected)} good={useCaseScore(selected, useCaseId) > 0} short={useCase.short} /></div>
                {selected.notes ? <p className="mt-2 text-xs leading-5 whitespace-pre-line text-[#6f6d78]">{clean(selected.notes)}</p> : null}
                {venueSources(selected).length ? (
                  <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[#8a8894]">
                    Public sources:
                    {venueSources(selected).map((u) => (
                      <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="!text-[#7854f6] hover:underline">{new URL(u).hostname.replace(/^www\./, "")}</a>
                    ))}
                  </p>
                ) : null}
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
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function FitBadge({ fit, day }: { fit?: HoursFit; day: DayKey }) {
  if (!fit) return null;
  const tone =
    fit.state === "covers"
      ? "bg-[#e6f7ef] text-[#1f7a52]"
      : fit.state === "unknown"
        ? "bg-[#fff6e6] text-[#9a6412]"
        : "bg-[#fdeeee] text-[#a33a3a]";
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      <Clock className="h-3 w-3" />
      {fit.state === "covers" && fit.open ? `${DAY_LABEL[day]}: ` : ""}
      {fit.label}
    </span>
  );
}

function KindChip({ type, good, short }: { type: VenueType; good: boolean; short: string }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${good ? "bg-[#f0ebff] text-[#5a3fd6]" : "bg-[#f4f3f8] text-[#6f6d78]"}`}>
      {TYPE_LABEL[type]}{good ? ` · good for ${short.toLowerCase()}` : ""}
    </span>
  );
}

function VenueLinks({ venue, compact }: { venue: VenueHit; compact?: boolean }) {
  const site = venueSite(venue);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  if (compact) {
    return (
      <p className="flex flex-wrap items-center gap-1.5 pt-1">
        <a href={directionsUrl(venue)} {...NEW_TAB} onClick={stop} className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#e8e7ed] bg-white px-2.5 text-xs font-medium !text-[#30303a] hover:border-[#cfc4fb] hover:text-[#5a3fd6]">
          <Navigation className="h-3 w-3" /> Directions
        </a>
        {site ? (
          <a href={site.url} {...NEW_TAB} onClick={stop} className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#e8e7ed] bg-white px-2.5 text-xs font-medium !text-[#30303a] hover:border-[#cfc4fb] hover:text-[#5a3fd6]">
            <ExternalLink className="h-3 w-3" /> {site.label}
          </a>
        ) : null}
      </p>
    );
  }
  return (
    <div className={`grid gap-2 ${site ? "grid-cols-2" : ""}`}>
      <a href={directionsUrl(venue)} {...NEW_TAB} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e8e7ed] text-sm font-medium !text-[#30303a] hover:bg-[#faf9ff]">
        <Navigation className="h-4 w-4" /> Directions
      </a>
      {site ? (
        <a href={site.url} {...NEW_TAB} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e8e7ed] text-sm font-medium !text-[#30303a] hover:bg-[#faf9ff]">
          <ExternalLink className="h-4 w-4" /> {site.label}
        </a>
      ) : null}
    </div>
  );
}

function HappeningHere({ session, large }: { session: Session; large?: boolean }) {
  const link = sessionLink(session);
  return (
    <div className={`rounded-xl border border-[#f3c1d4] bg-gradient-to-r from-[#fff0f5] to-[#fff7fa] text-[#7a1d45] ${large ? "p-4" : "px-3 py-2"}`}>
      <p className={`flex items-center gap-1.5 font-semibold ${large ? "text-sm" : "text-xs"}`}>
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#e0457b]" />
        Happening here: {session.title}
      </p>
      <p className="mt-0.5 text-xs text-[#9b3a62]">
        {sessionWhen(session)}
        {session.cadence ? `, ${session.cadence}` : ""}
        {session.price ? ` · ${session.price}` : ""}
      </p>
      {large ? (
        <>
          {session.summary ? <p className="mt-2 text-sm leading-6 text-[#5f2a40]">{session.summary}</p> : null}
          {session.rsvp ? <p className="mt-1 text-xs text-[#9b3a62]">{session.rsvp}</p> : null}
          {link ? (
            <a href={link.url} {...NEW_TAB} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#e0457b] px-3 text-xs font-semibold !text-white hover:bg-[#c83a6b]">
              <ExternalLink className="h-3.5 w-3.5" /> {link.label}
            </a>
          ) : null}
        </>
      ) : (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[#9b3a62]">
          {session.rsvp ? <span>{session.rsvp}</span> : null}
          {link ? (
            <a href={link.url} {...NEW_TAB} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 font-semibold text-[#c2185b] underline-offset-2 hover:underline">
              {link.label} <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </p>
      )}
    </div>
  );
}
