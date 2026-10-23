"use client";

// Community-hosted cowork sessions: kept in this browser until 2 organisers vouch,
// same trust pattern as pending venues. No personal contact details are stored.

import { LONDON_AREAS } from "@/lib/areas";
import type { DayKey } from "@/lib/hours";
import { VOUCHES_NEEDED } from "@/lib/pending-venues";

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
};

const KEY = "lumap.pendingSessions.v1";
export const SESSIONS_CHANGE_EVENT = "lumap:sessions-changed";
export { VOUCHES_NEEDED };

export function listSessions(): PendingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingSession[]) : [];
  } catch {
    return [];
  }
}

function save(list: PendingSession[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(SESSIONS_CHANGE_EVENT));
}

const POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

export async function addSession(input: Omit<PendingSession, "id" | "lat" | "lng" | "vouches" | "status" | "createdAt">): Promise<PendingSession> {
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
  const session: PendingSession = {
    ...input,
    url: /^https?:\/\//i.test(input.url) ? input.url : "",
    id: `host-${Date.now().toString(36)}`,
    lat,
    lng,
    vouches: 0,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  save([session, ...listSessions()]);
  return session;
}

function update(id: string, fn: (s: PendingSession) => PendingSession) {
  save(listSessions().map((s) => (s.id === id ? fn(s) : s)));
}

export function vouchSession(id: string) {
  update(id, (s) => {
    if (s.status !== "pending") return s;
    const vouches = s.vouches + 1;
    return { ...s, vouches, status: vouches >= VOUCHES_NEEDED ? "verified" : "pending" };
  });
}
export const rejectSession = (id: string) => update(id, (s) => ({ ...s, status: "rejected" }));
export const revokeSession = (id: string) => update(id, (s) => ({ ...s, vouches: Math.max(0, VOUCHES_NEEDED - 1), status: "pending" }));
