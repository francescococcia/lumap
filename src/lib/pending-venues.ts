"use client";

import { LONDON_AREAS } from "@/lib/areas";

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
};

const KEY = "lumap.pendingVenues.v1";
export const VOUCHES_NEEDED = 2;
export const CHANGE_EVENT = "lumap:venues-changed";

export function listVenues(): PendingVenue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingVenue[]) : [];
  } catch {
    return [];
  }
}

function save(venues: PendingVenue[]) {
  window.localStorage.setItem(KEY, JSON.stringify(venues));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addVenue(input: { name: string; address: string; area: string; capacity: number | null; note: string }): PendingVenue {
  const base = LONDON_AREAS.find((a) => a.name === input.area) ?? LONDON_AREAS[0];
  const venue: PendingVenue = {
    ...input,
    id: `local-${Date.now().toString(36)}`,
    lat: base.lat + (Math.random() - 0.5) * 0.006,
    lng: base.lng + (Math.random() - 0.5) * 0.009,
    vouches: 0,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  save([venue, ...listVenues()]);
  return venue;
}

export function vouchVenue(id: string) {
  save(listVenues().map((v) => {
    if (v.id !== id || v.status !== "pending") return v;
    const vouches = v.vouches + 1;
    return { ...v, vouches, status: vouches >= VOUCHES_NEEDED ? "verified" : "pending" };
  }));
}

export function rejectVenue(id: string) {
  save(listVenues().map((v) => (v.id === id ? { ...v, status: "rejected" } : v)));
}

export function revokeVenue(id: string) {
  save(listVenues().map((v) => (v.id === id ? { ...v, vouches: Math.max(0, VOUCHES_NEEDED - 1), status: "pending" } : v)));
}
