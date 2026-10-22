"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BookOpenText, LoaderCircle, Mic, Search, Send, Sparkles } from "lucide-react";
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

type SpeechResult = ArrayLike<{ transcript: string }>;
type SpeechEventLike = { results: ArrayLike<SpeechResult> };

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type AskResponse = { answer: string | null; sources: string[]; error?: string };

const ASK_SUGGESTIONS = ["Accessible venues near Old Street", "Who hosts community events?"];

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
  const [question, setQuestion] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [askLoading, setAskLoading] = useState(false);
  const [askResponse, setAskResponse] = useState<AskResponse | null>(null);
  const [askError, setAskError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .filter(Boolean)
        .join(" ");
      if (transcript) setQuestion((current) => [current, transcript].filter(Boolean).join(" "));
    };
    recognition.onerror = () => {
      setListening(false);
      setAskError("Voice input stopped. You can still type your question.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setAskError("");
    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }
    try {
      recognition.start();
      setListening(true);
    } catch {
      setAskError("Voice input could not start. Please type your question instead.");
    }
  }

  async function askCity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || askLoading) return;

    setAskLoading(true);
    setAskError("");
    setAskResponse(null);
    try {
      const result = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt }),
      });
      const data = (await result.json()) as AskResponse;
      if (!result.ok) setAskError(data.error ?? "Lumap could not answer just now. Please try again.");
      else setAskResponse(data);
    } catch {
      setAskError("Could not reach Lumap. Check your connection and try again.");
    } finally {
      setAskLoading(false);
    }
  }

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
        <section className="rounded-2xl border border-[#ece8fb] bg-[#faf9ff] p-3.5" aria-labelledby="ask-city-title">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f0ebff] text-[#7854f6]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="ask-city-title" className="text-sm font-semibold text-[#30303a]">Ask the city</h2>
              <p className="text-xs text-[#777580]">Get answers from local community knowledge.</p>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {ASK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                className="rounded-full border border-[#e8e7ed] bg-white px-2.5 py-1 text-left text-[11px] leading-4 text-[#686673] transition-colors hover:border-[#cfc3f8] hover:text-[#7854f6]"
                onClick={() => {
                  setQuestion(suggestion);
                  setAskResponse(null);
                  setAskError("");
                }}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <form onSubmit={askCity}>
            <label className="sr-only" htmlFor="city-question">Your question</label>
            <textarea
              id="city-question"
              className="min-h-16 w-full resize-y rounded-xl border border-[#e8e7ed] bg-white px-3 py-2 text-sm leading-5 text-[#30303a] outline-none placeholder:text-[#a3a1aa] focus:border-[#b9a7fb] focus:ring-2 focus:ring-[#7854f6]/10"
              maxLength={1000}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about spaces, events, or organisers…"
              rows={2}
              value={question}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#92909b]">Grounded in shared local context</span>
              <div className="flex items-center gap-1.5">
                {speechSupported ? (
                  <Button
                    aria-label={listening ? "Stop voice input" : "Start voice input"}
                    aria-pressed={listening}
                    className={listening ? "h-9 w-9 rounded-lg border-[#e8e7ed] bg-[#f0ebff] text-[#7854f6]" : "h-9 w-9 rounded-lg border-[#e8e7ed] bg-white text-[#6f6d78]"}
                    onClick={toggleListening}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Mic className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : null}
                <Button className="h-9 gap-1.5 rounded-lg bg-[#7854f6] px-3 text-white hover:bg-[#6842eb]" disabled={!question.trim() || askLoading} type="submit">
                  {askLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                  {askLoading ? "Asking…" : "Ask"}
                </Button>
              </div>
            </div>
          </form>
          {askError ? <p role="alert" className="mt-2 rounded-lg bg-[#fff4f4] px-3 py-2 text-xs leading-5 text-[#9b2c2c]">{askError}</p> : null}
          {askResponse ? (
            <div aria-live="polite" className="mt-3 rounded-xl border border-[#ecebf0] bg-white p-3">
              {askResponse.answer ? <p className="whitespace-pre-wrap text-sm leading-5 text-[#45434e]">{askResponse.answer}</p> : <p className="text-sm leading-5 text-[#777580]">I couldn’t find an answer in the shared community memory.</p>}
              {askResponse.sources.length ? (
                <div className="mt-3 border-t border-[#efedf2] pt-2">
                  <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#45434e]"><BookOpenText className="h-3.5 w-3.5 text-[#7854f6]" aria-hidden="true" />Sources</h3>
                  <ul className="grid gap-1">
                    {askResponse.sources.map((source, index) => <li className="border-l-2 border-[#d9d0fb] pl-2 text-xs leading-4 text-[#777580]" key={`${index}-${source}`}>{source}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
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
