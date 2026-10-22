"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, CalendarPlus, Check, Copy, ExternalLink, Rss, Sparkles } from "lucide-react";

export type FeedEvent = {
  id: string;
  title: string;
  url: string | null;
  start_at: string;
  end_at: string | null;
  reasons: string[];
  score: number;
};

function gcalDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function googleAddLink(event: FeedEvent) {
  const start = gcalDate(event.start_at);
  const end = gcalDate(event.end_at ?? new Date(Date.parse(event.start_at) + 2 * 3600_000).toISOString());
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: [event.reasons.join(" · "), event.url ?? ""].filter(Boolean).join("\n"),
    location: "London",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/London" });
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "Europe/London" });
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Europe/London" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export function EventsFeed({ events }: { events: FeedEvent[] }) {
  const [host, setHost] = useState("lumap-self.vercel.app");
  const [copied, setCopied] = useState(false);
  useEffect(() => setHost(window.location.host), []);

  const feedHttps = `https://${host}/api/calendar.ics`;
  const feedWebcal = `webcal://${host}/api/calendar.ics`;
  const googleSubscribe = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feedWebcal)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(feedHttps);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <main className="min-h-screen bg-[#fafaf7] px-4 py-6 text-[#20202a] sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <a href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[#666570] transition-colors hover:text-[#7854f6]">
          <ArrowLeft className="h-4 w-4" /> Back to the map
        </a>

        <motion.section
          id="subscribe"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-6 overflow-hidden rounded-3xl border border-[#ecebf0] bg-white shadow-[0_12px_40px_rgba(35,30,65,0.06)]"
        >
          <div className="bg-gradient-to-br from-[#efe9ff] via-[#f7f4ff] to-[#e8f7ef] p-6 sm:p-8">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8473c2]">
              <Sparkles className="h-4 w-4" /> Ranked London community events
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Events feed</h1>
            <p className="mt-2 max-w-xl text-[15px] leading-7 text-[#5f5d6a]">
              Subscribe once and the best upcoming community events land in your calendar automatically. The feed updates itself, so there's nothing to download or re-import.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={googleSubscribe} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7854f6] px-4 text-sm font-medium !text-white shadow-[0_8px_20px_rgba(120,84,246,0.25)] transition-transform hover:bg-[#6842eb] active:scale-[0.98]">
                <Rss className="h-4 w-4" /> Subscribe in Google Calendar
              </a>
              <a href={feedWebcal} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#e2dcf7] bg-white px-4 text-sm font-medium text-[#30303a] transition-colors hover:bg-[#faf9ff]">
                <CalendarPlus className="h-4 w-4 text-[#7854f6]" /> Apple or Outlook
              </a>
              <button type="button" onClick={copy} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#e2dcf7] bg-white px-4 text-sm font-medium text-[#30303a] transition-colors hover:bg-[#faf9ff]">
                {copied ? <Check className="h-4 w-4 text-[#2f9e62]" /> : <Copy className="h-4 w-4 text-[#7854f6]" />}
                {copied ? "Link copied" : "Copy feed link"}
              </button>
            </div>
          </div>
        </motion.section>

        <div className="mt-6 grid gap-3">
          {events.length === 0 ? <p className="text-sm text-[#777580]">No upcoming events right now.</p> : null}
          {events.map((event, index) => {
            const start = new Date(event.start_at);
            return (
              <motion.article
                key={event.id || index}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 28, delay: Math.min(index * 0.04, 0.8) }}
                className="flex items-center gap-4 rounded-2xl border border-[#ecebf0] bg-white p-4 shadow-[0_1px_2px_rgba(32,32,42,0.04)] hover:shadow-md"
              >
                <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-[#f4f0ff] py-2 text-center">
                  <span className="text-[11px] font-semibold uppercase text-[#8473c2]">{dayFmt.format(start)}</span>
                  <span className="text-xl font-semibold leading-tight text-[#20202a]">{dateFmt.format(start)}</span>
                  <span className="text-[11px] text-[#8a8894]">{monthFmt.format(start)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-[#20202a]">{event.title}</h2>
                  <p className="mt-0.5 text-sm text-[#6f6d78]">{timeFmt.format(start)} · London</p>
                  {event.reasons.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {event.reasons.map((reason) => (
                        <span key={reason} className="rounded-full bg-[#faf9ff] px-2.5 py-0.5 text-xs text-[#5f5d6a] ring-1 ring-[#ece7fd]">{reason}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <a href={googleAddLink(event)} target="_blank" rel="noreferrer" aria-label={`Add ${event.title} to Google Calendar`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#7854f6] px-3 text-xs font-medium !text-white hover:bg-[#6842eb]">
                    <CalendarPlus className="h-3.5 w-3.5" /> Add
                  </a>
                  {event.url ? (
                    <a href={event.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e8e7ed] px-3 text-xs font-medium text-[#30303a] hover:bg-[#faf9ff]">
                      <ExternalLink className="h-3.5 w-3.5" /> Details
                    </a>
                  ) : null}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
