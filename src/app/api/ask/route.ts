import { askCognee } from "../../../../scripts/cognee_search";
import { coworkWeek, coworkSessions, isWeekly } from "../../../lib/cowork";
import { sessionLink } from "../../../lib/links";

const COWORK_Q = /co-?work|work (alongside|with|next to)|deep work|founders?|desk|laptop/i;

// If Cognee is slow or down, answer coworking questions from the bundled public sessions.
function coworkFallback(): string {
  const lines = ["**This week you can cowork with others** (from Lumap's checked public listings; Community memory didn't answer in time)", ""];
  for (const g of coworkWeek(coworkSessions())) {
    for (const s of g.sessions) {
      const link = sessionLink(s);
      lines.push(`- **${s.title}**, ${g.label}, ${s.start_time}–${s.end_time}${isWeekly(s) ? "" : ` (${s.cadence})`} at ${s.venue_name}, ${s.area}. ${[s.price, s.rsvp].filter(Boolean).join(". ")}${link ? `. [${link.label}](${link.url})` : ""}`);
    }
  }
  lines.push("", "Evidence:", ...coworkSessions().map((s) => sessionLink(s)?.url).filter((u): u is string => Boolean(u)));
  return lines.join("\n");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function splitEvidence(result: string): { answer: string; sources: string[] } {
  const evidence = /(?:^|\r?\n)Evidence\s*:?\s*(?:\r?\n)/im.exec(result);
  if (!evidence || evidence.index === undefined) {
    return { answer: result.trim(), sources: [] };
  }

  const answer = result.slice(0, evidence.index).trim();
  const sourceText = result.slice(evidence.index + evidence[0].length);
  const sources = sourceText
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+\.)\s*/, "").trim())
    .filter(Boolean);

  return { answer, sources };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a valid JSON question." }, { status: 400 });
  }

  const question = typeof body === "object" && body !== null && "question" in body
    ? (body as { question?: unknown }).question
    : undefined;
  if (typeof question !== "string" || !question.trim() || question.length > 4000) {
    return Response.json({ error: "Enter a question under 4,000 characters." }, { status: 400 });
  }

  // Statements like "I'm a founder and want to…" get small talk back from the graph,
  // so coworking questions are sent as an explicit request for venues and sessions.
  const cowork = COWORK_Q.test(question);
  const query = cowork
    ? `${question.trim()}\n\nList the specific London venues and recurring sessions that fit: name, day, time, address with postcode, price and how to register.`
    : question.trim();
  let result = await askCognee(query);
  if (cowork && (!result || result.length < 200)) result = coworkFallback();
  if (!result) {
    return Response.json(
      { error: "Community memory is unavailable or returned no answer.", answer: null, sources: [] },
      { status: 503 },
    );
  }

  // The model writes non-breaking hyphens (U+2011), which break URLs like luma.com/london-oct-23.
  return Response.json(splitEvidence(result.replace(/[\u2010\u2011]/g, "-")));
}
