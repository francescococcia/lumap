"use client";

// Community-hosted cowork sessions. The shared queue lives in Supabase (see submissions.ts):
// a session goes live once 2 different organisers vouch. localStorage is only a fallback
// for when the database can't be reached. No personal contact details are stored.

import { LONDON_AREAS } from "@/lib/areas";
import type { DayKey } from "@/lib/hours";
import { VOUCHES_NEEDED } from "@/lib/pending-venues";
import { SESSIONS_EVENT, myVote, sharedRows, submitShared, voteShared, type Result, type SubmissionRow, type Vote } from "@/lib/submissions";

export type PendingSession = {
  id: string;
  title: string;
  organiser: string;
  venue_name: string;
  address: string;
  area: string;
  day_of_week: DayKey;
  start_time: string;
  end_time: string;
  price: string;
  url: string;
  note: string;
  lat: number;
  lng: number;
  vouches: number;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
  shared?: boolean;
  myVote?: Vote;
};

const KEY = "lumap.pendingSessions.v1";
export const SESSIONS_CHANGE_EVENT = SESSIONS_EVENT;
export { VOUCHES_NEEDED };

function localSessions(): PendingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingSession[]) : [];
  } catch {
    return [];
  }
}

const hhmm = (t: string | null) => (t ?? "").slice(0, 5);

const fromRow = (r: SubmissionRow): PendingSession => ({
  id: r.id,
  title: r.name,
  organiser: r.organiser ?? "",
  venue_name: r.venue_name ?? "",
  address: r.address ?? "",
  area: r.area ?? "",
  day_of_week: (r.day_of_week ?? "mon") as DayKey,
  start_time: hhmm(r.start_time),
  end_time: hhmm(r.end_time),
  price: r.price ?? "",
  url: r.url ?? "",
  note: r.note ?? "",
  lat: r.lat,
  lng: r.lng,
  vouches: r.vouch_count,
  status: r.status,
  createdAt: r.created_at,
  shared: true,
  myVote: myVote(r.id),
});

/** Shared queue first, then anything saved only on this device while offline. */
export function listSessions(): PendingSession[] {
  return [...sharedRows("session").map(fromRow), ...localSessions()];
}

function save(list: PendingSession[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(SESSIONS_CHANGE_EVENT));
}

const POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

type SessionInput = Omit<PendingSession, "id" | "lat" | "lng" | "vouches" | "status" | "createdAt" | "shared" | "myVote">;

export async function addSession(input: SessionInput): Promise<Result & { local?: boolean }> {
  const base = LONDON_AREAS.find((a) => a.name === input.area) ?? LONDON_AREAS[0];
  let lat = base.lat;
  let lng = base.lng;
  const pc = POSTCODE.exec(input.address)?.[0];
  if (pc) {
    try {
      const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc.replace(/\s+/g, ""))}`);
      const j = (await r.json()) as { result?: { latitude: number; longitude: number } };
      if (j.result) ({ latitude: lat, longitude: lng } = j.result);
    } catch {
      /* fall back to the area centre */
    }
  }
  const url = /^https?:\/\//i.test(input.url) ? input.url : "";
  const res = await submitShared({
    kind: "session",
    name: input.title,
    organiser: input.organiser || null,
    venue_name: input.venue_name || null,
    address: input.address || null,
    area: input.area,
    capacity: null,
    day_of_week: input.day_of_week,
    start_time: input.start_time,
    end_time: input.end_time,
    price: input.price || null,
    url: url || null,
    note: input.note || null,
    lat,
    lng,
  });
  if (res.ok || !res.offline) return res;
  const id = `host-${Date.now().toString(36)}`;
  save([{ ...input, url, id, lat, lng, vouches: 0, status: "pending", createdAt: new Date().toISOString(), shared: false }, ...localSessions()]);
  return { ok: true, id, local: true };
}

function update(id: string, fn: (s: PendingSession) => PendingSession) {
  save(localSessions().map((s) => (s.id === id ? fn(s) : s)));
}

const isLocal = (id: string) => id.startsWith("host-");

export async function vouchSession(id: string): Promise<Result | void> {
  if (!isLocal(id)) return voteShared(id, "vouch");
  update(id, (s) => {
    if (s.status !== "pending") return s;
    const vouches = s.vouches + 1;
    return { ...s, vouches, status: vouches >= VOUCHES_NEEDED ? "verified" : "pending" };
  });
}
export async function rejectSession(id: string): Promise<Result | void> {
  if (!isLocal(id)) return voteShared(id, "reject");
  update(id, (s) => ({ ...s, status: "rejected" }));
}
/** Only for this-device items; shared decisions can't be undone from the browser. */
export const revokeSession = (id: string) => update(id, (s) => ({ ...s, vouches: Math.max(0, VOUCHES_NEEDED - 1), status: "pending" }));
