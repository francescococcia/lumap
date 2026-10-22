"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CheckCircle2, ShieldCheck, Undo2, Users, X } from "lucide-react";
import { CHANGE_EVENT, listVenues, rejectVenue, revokeVenue, vouchVenue, VOUCHES_NEEDED, type PendingVenue } from "@/lib/pending-venues";

export default function ReviewPage() {
  const [venues, setVenues] = useState<PendingVenue[]>([]);
  useEffect(() => {
    const load = () => setVenues(listVenues());
    load();
    window.addEventListener(CHANGE_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(CHANGE_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const pending = venues.filter((v) => v.status === "pending");
  const done = venues.filter((v) => v.status !== "pending");

  return (
    <main className="min-h-screen bg-[#fafaf7] px-4 py-6 text-[#20202a] sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <a href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[#666570] transition-colors hover:text-[#7854f6]">
          <ArrowLeft className="h-4 w-4" /> Back to the map
        </a>
        <section className="mt-6 rounded-3xl border border-[#ecebf0] bg-gradient-to-br from-[#efe9ff] via-[#f7f4ff] to-[#e8f7ef] p-6 sm:p-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8473c2]"><ShieldCheck className="h-4 w-4" /> Organiser review</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Review queue</h1>
          <p className="mt-2 max-w-xl text-[15px] leading-7 text-[#5f5d6a]">
            New venues need {VOUCHES_NEEDED} vouches from organisers who have hosted there. Once vouched, they go live on the map. Revoke a vouch and the venue drops back to pending.
          </p>
        </section>

        <h2 className="mt-8 mb-3 text-sm font-semibold text-[#45434e]">Waiting for vouches ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#e2dff0] bg-white p-6 text-center text-sm text-[#85838f]">
            Nothing to review. Use <strong>Add venue</strong> on the map to suggest a room.
          </p>
        ) : null}
        <div className="grid gap-3">
          <AnimatePresence>
            {pending.map((v) => (
              <motion.article key={v.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} className="rounded-2xl border border-[#ecebf0] bg-white p-5 shadow-[0_1px_2px_rgba(32,32,42,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{v.name}</h3>
                    <p className="mt-0.5 text-sm text-[#6f6d78]">{[v.address, v.area].filter(Boolean).join(", ")}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#85838f]"><Users className="h-3.5 w-3.5" /> Fits {v.capacity ?? "?"}</p>
                    {v.note ? <p className="mt-2 text-sm leading-6 text-[#484751]">{v.note}</p> : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-[#fff4e0] px-2.5 py-1 text-xs font-semibold text-[#a86a10]">{v.vouches} of {VOUCHES_NEEDED} vouches</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f1eff6]">
                  <motion.div className="h-full rounded-full bg-[#7854f6]" animate={{ width: `${(v.vouches / VOUCHES_NEEDED) * 100}%` }} />
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => vouchVenue(v.id)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#7854f6] text-sm font-medium text-white hover:bg-[#6842eb]">
                    <ShieldCheck className="h-4 w-4" /> Vouch, I've hosted here
                  </button>
                  <button type="button" onClick={() => rejectVenue(v.id)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e8e7ed] px-4 text-sm font-medium text-[#6f6d78] hover:bg-[#fff6f5] hover:text-[#9e4038]">
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        {done.length ? (
          <>
            <h2 className="mt-8 mb-3 text-sm font-semibold text-[#45434e]">Decided</h2>
            <div className="grid gap-2">
              {done.map((v) => (
                <motion.div key={v.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between rounded-2xl border border-[#ecebf0] bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    {v.status === "verified" ? <CheckCircle2 className="h-4 w-4 text-[#2f9e62]" /> : <X className="h-4 w-4 text-[#9e4038]" />}
                    <span className="font-medium">{v.name}</span>
                    <span className="text-[#85838f]">{v.status === "verified" ? "live on the map" : "rejected"}</span>
                  </div>
                  {v.status === "verified" ? (
                    <button type="button" onClick={() => revokeVenue(v.id)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[#6f6d78] hover:bg-[#f4f3f7]">
                      <Undo2 className="h-3.5 w-3.5" /> Revoke a vouch
                    </button>
                  ) : null}
                </motion.div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
