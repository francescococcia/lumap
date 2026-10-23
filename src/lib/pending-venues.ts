"use client";

// Suggested venues. The shared queue lives in Supabase (see submissions.ts); this
// browser's localStorage is only a fallback for when the database can't be reached.

import { LONDON_AREAS } from "@/lib/areas";
import { VENUES_EVENT, myVote, sharedRows, submitShared, voteShared, type Result, type SubmissionRow, type Vote } from "@/lib/submissions";

export type PendingVenue = {
  id: string;
  name: string;
  address: string;
  area: string;
  capacity: number | null;
  note: string;
  lat: number;
  lng: number;
  vouches: number;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
  /** true when stored in the shared Supabase queue, false for this-browser-only fallback items */
  shared?: boolean;
  myVote?: Vote;
};

const KEY = "lumap.pendingVenues.v1";
export const VOUCHES_NEEDED = 2;
export const CHANGE_EVENT = VENUES_EVENT;

function localVenues(): PendingVenue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingVenue[]) : [];
  } catch {
    return [];
  }
}

const fromRow = (r: SubmissionRow): PendingVenue => ({
  id: r.id,
  name: r.name,
  address: r.address ?? "",
  area: r.area ?? "",
  capacity: r.capacity,
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
export function listVenues(): PendingVenue[] {
  return [...sharedRows("venue").map(fromRow), ...localVenues()];
}

function save(venues: PendingVenue[]) {
  window.localStorage.setItem(KEY, JSON.stringify(venues));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export async function addVenue(input: { name: string; address: string; area: string; capacity: number | null; note: string }): Promise<Result & { local?: boolean }> {
  const base = LONDON_AREAS.find((a) => a.name === input.area) ?? LONDON_AREAS[0];
  const lat = base.lat + (Math.random() - 0.5) * 0.006;
  const lng = base.lng + (Math.random() - 0.5) * 0.009;
  const res = await submitShared({
    kind: "venue",
    name: input.name,
    organiser: null,
    venue_name: null,
    address: input.address || null,
    area: input.area,
    capacity: input.capacity,
    day_of_week: null,
    start_time: null,
    end_time: null,
    price: null,
    url: null,
    note: input.note || null,
    lat,
    lng,
  });
  if (res.ok || !res.offline) return res;
  const id = `local-${Date.now().toString(36)}`;
  save([{ ...input, id, lat, lng, vouches: 0, status: "pending", createdAt: new Date().toISOString(), shared: false }, ...localVenues()]);
  return { ok: true, id, local: true };
}

export async function vouchVenue(id: string): Promise<Result | void> {
  if (!id.startsWith("local-")) return voteShared(id, "vouch");
  save(localVenues().map((v) => {
    if (v.id !== id || v.status !== "pending") return v;
    const vouches = v.vouches + 1;
    return { ...v, vouches, status: vouches >= VOUCHES_NEEDED ? "verified" : "pending" };
  }));
}

export async function rejectVenue(id: string): Promise<Result | void> {
  if (!id.startsWith("local-")) return voteShared(id, "reject");
  save(localVenues().map((v) => (v.id === id ? { ...v, status: "rejected" } : v)));
}

/** Only for this-device items; shared decisions can't be undone from the browser. */
export function revokeVenue(id: string) {
  save(localVenues().map((v) => (v.id === id ? { ...v, vouches: Math.max(0, VOUCHES_NEEDED - 1), status: "pending" } : v)));
}
