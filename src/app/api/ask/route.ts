import { askCognee } from "../../../../scripts/cognee_search";

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

  const result = await askCognee(question.trim());
  if (!result) {
    return Response.json(
      { error: "Community memory is unavailable or returned no answer.", answer: null, sources: [] },
      { status: 503 },
    );
  }

  return Response.json(splitEvidence(result));
}
