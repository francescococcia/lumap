"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpenText, LoaderCircle, MapPin, Mic, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface AskResponse {
  answer: string | null;
  sources: string[];
  error?: string;
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i} className="font-semibold text-[#20202a]">{part.slice(2, -2)}</strong> : part.replace(/[*_`]/g, ""),
  );
}

function Answer({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-3 text-[16px] leading-[1.8] text-[#34323d]">
      {lines.map((line, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.06, 0.9), duration: 0.35, ease: "easeOut" }}>
          {renderLine(line, i)}
        </motion.div>
      ))}
    </div>
  );
}

function renderLine(line: string, i: number) {
        const heading = /^#{1,6}\s+/.exec(line);
        if (heading) return <p key={i} className="pt-1 font-semibold text-[#20202a]">{inline(line.slice(heading[0].length))}</p>;
        const bullet = /^(?:[-*\u2022]|\d+[.)])\s+/.exec(line);
        if (bullet) return <p key={i} className="flex gap-2 pl-1"><span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7854f6]" />{<span>{inline(line.slice(bullet[0].length))}</span>}</p>;
        return <p key={i}>{inline(line)}</p>;
}

function cleanSources(sources: string[]) {
  const labels = sources.map((s) => {
    const doc = /document\s+([\w.-]+)/i.exec(s)?.[1] ?? "";
    const venue = /^venue-(-?\d+\.\d+)_(-?\d+\.\d+)/.exec(doc);
    if (venue) return `Venue record near ${Number(venue[1]).toFixed(3)}, ${Number(venue[2]).toFixed(3)}`;
    if (/^event/i.test(doc)) return "Community event record";
    if (doc) return doc.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return s.replace(/\(.*?\)/g, "").replace(/\b[0-9a-f-]{20,}\b/gi, "").replace(/[*_`#]/g, "").trim();
  });
  return Array.from(new Set(labels.filter((s) => s.length > 3))).slice(0, 6);
}

export type AskVenue = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number | null;
  status: string;
  reason: string;
  distance_m: null;
};

type Turn = { q: string; answer: string | null; sources: string[]; error?: string; venues: AskVenue[] };

const POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;

function stripMd(s: string) {
  return s.replace(/^#{1,6}\s+/, "").replace(/^(?:[-*\u2022]|\d+[.)])\s+/, "").replace(/[*_`]/g, "").trim();
}

async function extractVenues(answer: string): Promise<AskVenue[]> {
  const lines = answer.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const found: { name: string; address: string; postcode: string; details: string[] }[] = [];
  lines.forEach((raw, i) => {
    const line = stripMd(raw);
    const pc = POSTCODE.exec(line);
    if (!pc) return;
    const parts = line.split(/\s+[\u2013\u2014-]\s+|:\s+/);
    let name = parts.length > 1 ? parts[0] : line.split(",")[0];
    let address = parts.length > 1 ? parts.slice(1).join(", ") : line;
    if (POSTCODE.test(name) && i > 0) {
      address = line;
      name = stripMd(lines[i - 1]).split(/[\u2013\u2014:]/)[0];
    }
    const details: string[] = [];
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      const next = stripMd(lines[j]);
      if (POSTCODE.test(next)) break;
      details.push(next);
    }
    name = name.replace(/\s*\(.*$/, "").trim();
    if (!name || name.length > 40 || name.split(/\s+/).length > 6 || /\b(is|are|the nearer|lies)\b/i.test(name)) return;
    if (!found.some((f) => f.name === name)) found.push({ name: name.trim(), address: address.trim(), postcode: pc[1].toUpperCase(), details });
  });
  const geo = await Promise.all(
    found.slice(0, 8).map(async (v) => {
      try {
        const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(v.postcode.replace(/\s+/g, ""))}`);
        const j = (await r.json()) as { result?: { latitude: number; longitude: number } };
        if (!j.result) return null;
        const detail = v.details.join(" · ");
        const cap = /capacity[^\d]*(\d+)/i.exec(detail) ?? /(\d+)\s*(?:attendees|people|guests)/i.exec(detail);
        return {
          id: `ask-${v.postcode.replace(/\s+/g, "")}-${v.name.slice(0, 12)}`,
          name: v.name,
          address: v.address,
          lat: j.result.latitude,
          lng: j.result.longitude,
          capacity: cap ? Number(cap[1]) : null,
          status: "suggested",
          reason: detail ? `Suggested by Ask Lumap · ${detail}` : "Suggested by Ask Lumap from community memory",
          distance_m: null,
        } satisfies AskVenue;
      } catch {
        return null;
      }
    }),
  );
  return geo.filter((v): v is AskVenue => v !== null);
}

export const ASK_VENUES_EVENT = "lumap:ask-venues";
export const FOCUS_VENUE_EVENT = "lumap:focus-venue";

function showOnMap(venues: AskVenue[], focusId?: string) {
  window.dispatchEvent(new CustomEvent(ASK_VENUES_EVENT, { detail: venues }));
  const id = focusId ?? venues[0]?.id;
  if (id) setTimeout(() => window.dispatchEvent(new CustomEvent(FOCUS_VENUE_EVENT, { detail: id })), 50);
}

export function AskPanel() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("lumap:ask-open", { detail: open }));
  }, [open]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, loading]);

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
      setError("Voice input stopped. You can still type your question.");
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

    setError("");
    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }

    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Voice input could not start. Please try typing instead.");
    }
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || loading) return;

    setLoading(true);
    setError("");
    setQuestion("");
    const history = turns
      .filter((t) => t.answer)
      .slice(-2)
      .map((t) => `Q: ${t.q}\nA: ${(t.answer ?? "").slice(0, 700)}`)
      .join("\n\n");
    const full = history ? `Earlier in this conversation:\n${history}\n\nFollow-up question: ${prompt}` : prompt;
    try {
      let result = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: full }),
      });
      if (result.status === 503) {
        result = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: full }) });
      }
      const data = (await result.json()) as AskResponse;
      if (!result.ok) {
        setTurns((t) => [...t, { q: prompt, answer: null, sources: [], venues: [], error: data.error ?? "Lumap could not answer just now. Please try again." }]);
      } else {
        let venues = data.answer ? await extractVenues(data.answer) : [];
        const earlier = turns.flatMap((t) => t.venues);
        const mentioned = earlier.filter((v) => (data.answer ?? "").toLowerCase().includes(v.name.toLowerCase()));
        if (!venues.length && mentioned.length) venues = mentioned;
        setTurns((t) => [...t, { q: prompt, answer: data.answer, sources: data.sources ?? [], venues }]);
        if (venues.length) {
          const all = [...venues, ...earlier.filter((e) => !venues.some((v) => v.id === e.id))];
          showOnMap(all, (mentioned[0] ?? venues[0]).id);
        }
      }
    } catch {
      setTurns((t) => [...t, { q: prompt, answer: null, sources: [], venues: [], error: "Could not reach Lumap. Check your connection and try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {!open ? (
          <motion.button
            key="ask-fab"
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            className="fixed right-6 bottom-10 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#7854f6] px-5 font-medium text-white shadow-[0_12px_30px_rgba(120,84,246,0.35)]"
          >
            <Sparkles className="h-4 w-4" /> Ask Lumap
          </motion.button>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {open ? (
          <motion.aside
            key="ask-panel"
            role="dialog"
            aria-label="Ask Lumap"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed right-4 bottom-8 z-40 flex max-h-[calc(100vh-7rem)] w-[min(100vw-2rem,440px)] flex-col overflow-auto rounded-[24px] border border-[#ecebf0] bg-white/95 p-5 text-[#20202a] shadow-[0_24px_60px_rgba(35,30,65,0.18)] backdrop-blur-md"
          >
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Ask" className="absolute top-4 right-4 rounded-full p-1.5 text-[#85838f] hover:bg-[#f4f3f7] hover:text-[#20202a]">
              <X className="h-4 w-4" />
            </button>

          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0ebff] text-[#7854f6]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8473c2]">Lumap community memory</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Ask the city</h2>
            </div>
          </div>

          {turns.length === 0 ? (
            <p className="mb-4 text-sm leading-6 text-[#6f6d78]">
              Ask about the venues, communities, and events organisers have shared. Venues in the answer drop onto the map, and you can keep asking follow-ups.
            </p>
          ) : (
            <button type="button" onClick={() => { setTurns([]); setError(""); }} className="mb-3 self-start text-xs font-medium text-[#7854f6] hover:underline">New conversation</button>
          )}

          <div aria-live="polite" className="space-y-5">
            {turns.map((turn, ti) => (
              <motion.div key={ti} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#7854f6] px-4 py-2.5 text-[15px] leading-6 text-white">{turn.q}</div>
                {turn.error ? (
                  <p role="alert" className="rounded-xl border border-[#f2d6d3] bg-[#fff8f7] px-4 py-3 text-sm text-[#9e4038]">{turn.error}</p>
                ) : turn.answer ? (
                  <div className="rounded-2xl rounded-bl-md bg-[#faf9ff] p-5">
                    <Answer text={turn.answer} />
                  </div>
                ) : (
                  <p className="rounded-2xl bg-[#faf9ff] p-5 text-sm leading-6 text-[#6f6d78]">I couldn’t find an answer in the shared community memory.</p>
                )}
                {turn.venues.length ? (
                  <div className="rounded-2xl border border-[#e4ddfc] p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#8473c2]"><MapPin className="h-3.5 w-3.5" /> On the map</p>
                    <div className="flex flex-wrap gap-2">
                      {turn.venues.map((v) => (
                        <button key={v.id} type="button" onClick={() => showOnMap(turn.venues, v.id)} className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f0ff] px-3 py-1.5 text-[13px] font-medium text-[#5a3fd6] transition-colors hover:bg-[#7854f6] hover:!text-white">
                          <MapPin className="h-3.5 w-3.5" /> {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {cleanSources(turn.sources).length ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <BookOpenText className="h-3.5 w-3.5 text-[#9a98a3]" aria-hidden="true" />
                    {cleanSources(turn.sources).map((s, i) => (
                      <span key={i} className="rounded-full border border-[#ecebf0] px-2.5 py-1 text-xs text-[#6f6d78]">{s}</span>
                    ))}
                  </div>
                ) : null}
              </motion.div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 rounded-2xl bg-[#faf9ff] p-4 text-sm text-[#6f6d78]">
                <LoaderCircle className="h-4 w-4 animate-spin text-[#7854f6]" /> Searching community memory…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-[#f2d6d3] bg-[#fff8f7] px-4 py-3 text-sm text-[#9e4038]">
              {error}
            </p>
          )}

          <form onSubmit={submitQuestion} className="sticky bottom-0 -mx-5 -mb-5 mt-5 space-y-3 bg-gradient-to-t from-white via-white to-white/80 px-5 pt-3 pb-5">
            <label htmlFor="question" className="sr-only">Your question</label>
            <div className="rounded-2xl border border-[#e7e5ed] bg-[#fdfdfc] p-3 transition-colors focus-within:border-[#b9a7fb] focus-within:ring-2 focus-within:ring-[#7854f6]/10">
              <textarea
                id="question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={turns.length ? "Ask a follow-up, e.g. which is closest to Liverpool Street?" : "I need a room for 80 people on Saturday near Old Street"}
                rows={turns.length ? 2 : 3}
                maxLength={1000}
                className="min-h-20 w-full resize-y bg-transparent px-2 py-1 text-base leading-7 text-[#30303a] outline-none placeholder:text-[#a3a1aa]"
              />
              <div className="flex items-center justify-between border-t border-[#efedf2] pt-3">
                <span className="px-2 text-xs text-[#92909b]">Answers are grounded in shared community context.</span>
                <div className="flex items-center gap-2">
                  {speechSupported && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={listening ? "Stop voice input" : "Start voice input"}
                      aria-pressed={listening}
                      onClick={toggleListening}
                      className={listening ? "h-11 w-11 rounded-xl border-[#e8e7ed] bg-[#f0ebff] text-[#7854f6]" : "h-11 w-11 rounded-xl border-[#e8e7ed] bg-white text-[#6f6d78]"}
                    >
                      <Mic className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={!question.trim() || loading}
                    className="h-11 gap-2 rounded-xl bg-[#7854f6] px-4 text-white hover:bg-[#6842eb]"
                  >
                    {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                    <span>{loading ? "Asking…" : turns.length ? "Follow up" : "Ask Lumap"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </form>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
