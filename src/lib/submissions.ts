"use client";

// Shared review queue in Supabase (tables `submissions` and `submission_vouches`).
// Everyone sees the same queue; the database flips a submission to verified at 2 distinct
// vouches. Voters are identified by a random per-browser id, never by name or email.
// localStorage (pending-venues / pending-sessions) is only used when the database is unreachable.

import { getSupabase } from "@/lib/supabase";

export const VENUES_EVENT = "lumap:venues-changed";
export const SESSIONS_EVENT = "lumap:sessions-changed";

export type SubmissionRow = {
  id: string;
  kind: "venue" | "session";
  status: "pending" | "verified" | "rejected";
  name: string;
  organiser: string | null;
  venue_name: string | null;
  address: string | null;
  area: string | null;
  capacity: number | null;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  price: string | null;
  url: string | null;
  note: string | null;
  lat: number;
  lng: number;
  vouch_count: number;
  reject_count: number;
  created_at: string;
};

export type NewSubmission = Omit<SubmissionRow, "id" | "status" | "vouch_count" | "reject_count" | "created_at">;
export type Vote = "vouch" | "reject";
export type Result = { ok: true; id: string } | { ok: false; offline: boolean; error: string };

const VOTER_KEY = "lumap.voter.v1";
const VOTES_KEY = "lumap.myVotes.v1";
const COLUMNS =
  "id,kind,status,name,organiser,venue_name,address,area,capacity,day_of_week,start_time,end_time,price,url,note,lat,lng,vouch_count,reject_count,created_at";

let rows: SubmissionRow[] = [];
let started = false;
let inflight: Promise<void> | null = null;

function emit() {
  window.dispatchEvent(new Event(VENUES_EVENT));
  window.dispatchEvent(new Event(SESSIONS_EVENT));
}

export function voterId(): string {
  let id = window.localStorage.getItem(VOTER_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).slice(0, 64);
    window.localStorage.setItem(VOTER_KEY, id);
  }
  return id;
}

function myVotes(): Record<string, Vote> {
  try {
    return JSON.parse(window.localStorage.getItem(VOTES_KEY) ?? "{}") as Record<string, Vote>;
  } catch {
    return {};
  }
}

export function myVote(id: string): Vote | undefined {
  return typeof window === "undefined" ? undefined : myVotes()[id];
}

function rememberVote(id: string, vote: Vote) {
  window.localStorage.setItem(VOTES_KEY, JSON.stringify({ ...myVotes(), [id]: vote }));
}

/** Rows from the shared queue (newest first). Starts loading and polling on first use. */
export function sharedRows(kind: SubmissionRow["kind"]): SubmissionRow[] {
  if (typeof window === "undefined") return [];
  if (!started) {
    started = true;
    void refreshQueue();
    window.setInterval(() => void refreshQueue(), 30_000);
    window.addEventListener("focus", () => void refreshQueue());
  }
  return rows.filter((r) => r.kind === kind);
}

export function refreshQueue(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await getSupabase()
        .from("submissions")
        .select(COLUMNS)
        .neq("status", "rejected")
        .order("created_at", { ascending: false })
        .limit(300);
      if (!error && data) {
        rows = data as SubmissionRow[];
        emit();
      }
    } catch {
      /* offline: keep the last copy */
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function explain(error: { code?: string; message?: string }): string {
  if (error.code === "23505") return "That's already in the review queue.";
  if (error.code === "23514") {
    if (/contact_details/.test(error.message ?? "")) return "Please leave out emails and phone numbers.";
    if (/lat_check|lng_check/.test(error.message ?? "")) return "That address doesn't look like it's in London.";
    return error.message && !/violates check constraint/.test(error.message) ? error.message : "Some fields are too long or not valid.";
  }
  return error.message ?? "Couldn't save.";
}

const isNetwork = (e: unknown) => e instanceof TypeError || /fetch|network/i.test(String((e as Error)?.message ?? e));

export async function submitShared(input: NewSubmission): Promise<Result> {
  try {
    const { data, error } = await getSupabase()
      .from("submissions")
      .insert({ ...input, submitted_by: voterId() })
      .select("id")
      .single();
    if (error) return { ok: false, offline: isNetwork(error.message), error: explain(error) };
    await refreshQueue();
    return { ok: true, id: (data as { id: string }).id };
  } catch (e) {
    return { ok: false, offline: isNetwork(e), error: "Couldn't reach the shared queue." };
  }
}

export async function voteShared(id: string, vote: Vote): Promise<Result> {
  try {
    const { error } = await getSupabase().from("submission_vouches").insert({ submission_id: id, voter: voterId(), vote });
    if (error) {
      if (error.code === "23505") {
        rememberVote(id, vote);
        emit();
        return { ok: false, offline: false, error: "You've already voted on this one." };
      }
      return { ok: false, offline: isNetwork(error.message), error: explain(error) };
    }
    rememberVote(id, vote);
    await refreshQueue();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, offline: isNetwork(e), error: "Couldn't reach the shared queue." };
  }
}
