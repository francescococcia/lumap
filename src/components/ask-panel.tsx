"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpenText, LoaderCircle, Mic, Send, Sparkles, X } from "lucide-react";
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
  const id = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
  return Array.from(new Set(sources
    .map((s) => s.replace(id, "").replace(/\b(chunk|id|node)[_ ]?(id)?\s*[:=]\s*\S*/gi, "").replace(/[*_`#\[\]()]/g, "").replace(/\s{2,}/g, " ").replace(/^[\s,:;\u00b7-]+|[\s,:;\u00b7-]+$/g, "").trim())
    .filter((s) => s.length > 3 && /[a-z]{3}/i.test(s)))).slice(0, 6);
}

export function AskPanel() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sources = useMemo(() => cleanSources(response?.sources ?? []), [response]);

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
    setResponse(null);
    try {
      const result = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt }),
      });
      const data = (await result.json()) as AskResponse;
      if (!result.ok) {
        setError(data.error ?? "Lumap could not answer just now. Please try again.");
      } else {
        setResponse(data);
      }
    } catch {
      setError("Could not reach Lumap. Check your connection and try again.");
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

          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0ebff] text-[#7854f6]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8473c2]">Lumap community memory</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Ask the city</h2>
            </div>
          </div>

          <p className="mb-4 text-sm leading-6 text-[#6f6d78]">
            Ask about the venues, communities, and events organisers have shared.
          </p>

          <form onSubmit={submitQuestion} className="space-y-3">
            <label htmlFor="question" className="sr-only">Your question</label>
            <div className="rounded-2xl border border-[#e7e5ed] bg-[#fdfdfc] p-3 transition-colors focus-within:border-[#b9a7fb] focus-within:ring-2 focus-within:ring-[#7854f6]/10">
              <textarea
                id="question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Who has hosted events near Old Street?"
                rows={3}
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
                    <span>{loading ? "Asking…" : "Ask Lumap"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </form>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-[#f2d6d3] bg-[#fff8f7] px-4 py-3 text-sm text-[#9e4038]">
              {error}
            </p>
          )}

          {response && (
            <section aria-live="polite" className="mt-7 space-y-5">
              {response.answer ? (
                <div className="rounded-2xl bg-[#faf9ff] p-5 sm:p-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8473c2]">Answer</p>
                  <Answer text={response.answer} />
                </div>
              ) : (
                <p className="rounded-2xl bg-[#faf9ff] p-5 text-sm leading-6 text-[#6f6d78]">
                  I couldn’t find an answer in the shared community memory.
                </p>
              )}

              {sources.length > 0 ? (
                <div className="rounded-2xl border border-[#ecebf0] p-5 sm:p-6">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#45434e]">
                    <BookOpenText className="h-4 w-4 text-[#7854f6]" aria-hidden="true" />
                    Sources
                  </h2>
                  <ul className="flex flex-wrap gap-2">
                    {sources.map((source, index) => (
                      <li key={index} className="rounded-full border border-[#e4ddfc] bg-[#faf9ff] px-3 py-1.5 text-[13px] leading-5 text-[#5f5d6a]">
                        {source}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          )}
        
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
