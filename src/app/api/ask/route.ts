import { askCognee } from "../../../../scripts/cognee_search";
import { intentOf, localAnswer, placesIn, venueDirectory, type VenueRow } from "../../../lib/ask-local";
import { dateLabel, londonToday } from "../../../lib/dates";
import type { When } from "../../../lib/when";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Keeps answers to what the stored documents say: no guessed capacities, addresses or prices.
const GROUNDING =
  "Only state facts written in the context. If an important detail such as a capacity, address, price or time is not there, say it's not listed; never estimate it (for example a capacity from past attendance) and don't list empty fields. Don't invent venues, addresses or numbers.";

function systemPrompt(today: string, when: When | null) {
  return [
    `You are Lumap, a friendly London local who organises community events and knows the city's venues. Today is ${dateLabel(today)} ${today.slice(0, 4)} in London.`,
    when
      ? `They mean ${when.phrase} (${when.label}). Only suggest sessions and venues that fit those dates, and put the actual date next to each pick, e.g. "${dateLabel(when.from)}". A weekly session runs on that weekday's date within the range.`
      : "",
    "Answer using only the provided context, the way you'd reply to a friend, in British English:",
    "- one short, warm opening sentence (no heading);",
    "- then 2 to 4 picks as a bulleted list, each written as '**Venue name**: one line on why it fits', with the day or date, time and price when given, and the registration link if there is one;",
    "- end with one natural follow-up question, like 'Want something closer to Shoreditch?'.",
    "Keep it under 130 words. No tables, no headings. Never mention memory, databases, documents, records, listings, sources or 'the context'.",
    GROUNDING,
  ]
    .filter(Boolean)
    .join("\n");
}

function splitEvidence(result: string): { answer: string; sources: string[] } {
  const evidence = /(?:^|\r?\n)\**(?:Evidence|Sources?|References?)\**\s*:?\s*(?:\r?\n)/im.exec(result);
  if (!evidence || evidence.index === undefined) {
    return { answer: result.trim(), sources: [] };
  }
  const answer = result.slice(0, evidence.index).trim();
  const sources = result
    .slice(evidence.index + evidence[0].length)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+\.)\s*/, "").trim())
    .filter(Boolean);
  return { answer, sources };
}

type Hit = Omit<VenueRow, "guest_count_lower_bound"> & { reason: string | null; distance_m: number | null; sessions?: unknown };

/** The same row shape the map search uses (with sessions and reason), so the venue panel opens fully. */
async function toHits(rows: VenueRow[]): Promise<Hit[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Promise.all(
    rows.slice(0, 8).map(async (row) => {
      const plain: Hit = { ...row, reason: null, distance_m: null };
      if (!url || !key) return plain;
      try {
        const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/search_venues`, {
          method: "POST",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ lat: row.lat, lng: row.lng, radius_m: 80, max_results: 20 }),
          signal: AbortSignal.timeout(3000),
          cache: "no-store",
        });
        const list = res.ok ? ((await res.json()) as Hit[]) : [];
        const hit = Array.isArray(list) ? list.find((h) => h.id === row.id) : undefined;
        return hit ? { ...hit, distance_m: null } : plain;
      } catch {
        return plain;
      }
    }),
  );
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Send a valid JSON question." }, { status: 400 });
  }
  const question = str(body?.question);
  if (!question.trim() || question.length > 4000) {
    return Response.json({ error: "Enter a question under 4,000 characters." }, { status: 400 });
  }
  // "quick": instant answer from data we hold. "memory": community memory only. Default: memory, then quick.
  const mode = str(body.mode) || "auto";
  const latest = str(body.latest) || question;
  const previous = Array.isArray(body.previous) ? body.previous.filter((p): p is string => typeof p === "string").slice(-4) : [];
  const today = londonToday();
  const intent = intentOf(latest, previous, today);
  const rowsPromise = venueDirectory();

  const quick = async () => {
    const rows = await rowsPromise;
    const local = localAnswer(intent, rows, today);
    if (!local) return null;
    return { answer: local.answer, sources: [] as string[], places: await toHits(placesIn(local.answer, rows)), when: intent.when, from: "quick" };
  };

  if (mode === "quick") return Response.json((await quick()) ?? { answer: null, sources: [], places: [], when: intent.when, from: "quick" });

  const dated = intent.when ? `${question.trim()}\n\n(Dates they mean: ${intent.when.label}.)` : question.trim();
  const query = intent.occasion === "cowork" ? `${dated}\n\nWhich London coworking sessions or spaces fit? Include the venue, date, time, price and how to register.` : dated;
  const raw = await askCognee(query, { systemPrompt: systemPrompt(today, intent.when), timeoutMs: 22000 });
  if (raw && raw.length > 80) {
    // The model writes non-breaking hyphens (U+2011), which break URLs like luma.com/london-oct-23.
    const { answer, sources } = splitEvidence(raw.replace(/[\u2010\u2011]/g, "-"));
    const rows = await rowsPromise;
    return Response.json({ answer, sources, places: await toHits(placesIn(answer, rows)), when: intent.when, from: "memory" });
  }
  if (mode !== "memory") {
    const local = await quick();
    if (local) return Response.json(local);
  }
  return Response.json({ error: "I couldn't come up with an answer just now. Try asking in a different way?", answer: null, sources: [], places: [] }, { status: 503 });
}
