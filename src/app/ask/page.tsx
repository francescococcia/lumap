"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpenText, LoaderCircle, Mic, Send, Sparkles } from "lucide-react";
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

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState("");
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
    <main className="min-h-screen bg-[#fafaf7] px-4 py-6 text-[#20202a] sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <a href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[#666570] transition-colors hover:text-[#7854f6]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the map
        </a>

        <section className="mt-8 rounded-3xl border border-[#ecebf0] bg-white p-5 shadow-[0_12px_40px_rgba(35,30,65,0.06)] sm:mt-12 sm:p-9">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0ebff] text-[#7854f6]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8473c2]">Lumap community memory</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Ask the city</h1>
            </div>
          </div>

          <p className="mb-5 max-w-xl text-base leading-7 text-[#6f6d78]">
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
                rows={4}
                maxLength={1000}
                className="min-h-28 w-full resize-y bg-transparent px-2 py-1 text-base leading-7 text-[#30303a] outline-none placeholder:text-[#a3a1aa]"
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
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-[#34323d]">{response.answer}</p>
                </div>
              ) : (
                <p className="rounded-2xl bg-[#faf9ff] p-5 text-sm leading-6 text-[#6f6d78]">
                  I couldn’t find an answer in the shared community memory.
                </p>
              )}

              {response.sources.length > 0 && (
                <div className="rounded-2xl border border-[#ecebf0] p-5 sm:p-6">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#45434e]">
                    <BookOpenText className="h-4 w-4 text-[#7854f6]" aria-hidden="true" />
                    Sources
                  </h2>
                  <ul className="space-y-2">
                    {response.sources.map((source, index) => (
                      <li key={index} className="border-l-2 border-[#d9d0fb] pl-3 text-sm leading-6 text-[#6f6d78]">
                        {source}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
