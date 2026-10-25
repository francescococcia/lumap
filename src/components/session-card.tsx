"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, Clock, ExternalLink, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { NEW_TAB, sessionLink } from "@/lib/links";
import { sessionWhen, type Session } from "@/lib/venue-facts";
import { cn } from "@/lib/utils";

/** The event's cover image. Lazy, cropped to fill, with a soft placeholder when there is no image or it fails to load. */
export function SessionCover({ src, title, className }: { src?: string | null; title: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;
  return (
    <div className={cn("relative aspect-[1.9/1] w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#efe9ff] via-[#f8f5ff] to-[#ffeef5]", className)}>
      {show ? (
        // Plain <img>: covers come from several hosts (Luma, Squarespace, organiser sites).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Cover image for ${title}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center" aria-hidden="true">
          <CalendarDays className="h-7 w-7 text-[#b7a8f3]" />
        </div>
      )}
    </div>
  );
}

type CardSession = Pick<Session, "title" | "day_of_week" | "start_time" | "end_time" | "url" | "source_url" | "source_urls" | "image_url" | "venue_name" | "cadence" | "price">;

/** A session as a card: cover on top, then title, day and time, venue and the event link. */
export function SessionCard({
  session,
  when,
  venue,
  onShow,
  extra,
  className,
  compact,
}: {
  session: CardSession;
  when?: string;
  venue?: string | null;
  onShow?: () => void;
  extra?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const link = sessionLink(session);
  const place = venue ?? session.venue_name;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className={className}>
      <Card className="h-full gap-0 overflow-hidden p-0">
        <SessionCover src={session.image_url} title={session.title} className="rounded-none" />
        <div className={cn("flex flex-1 flex-col gap-1", compact ? "p-3" : "p-4")}>
          <h3 className="text-sm font-semibold leading-snug text-[#20202a]">{session.title}</h3>
          <p className="flex items-center gap-1 text-xs text-[#5f5d6a]">
            <Clock className="h-3 w-3 shrink-0" /> {when ?? sessionWhen(session as Session)}
            {session.cadence && !compact ? `, ${session.cadence}` : ""}
          </p>
          {place ? (
            <p className="flex items-center gap-1 text-xs text-[#5f5d6a]">
              <MapPin className="h-3 w-3 shrink-0" /> {place}
            </p>
          ) : null}
          {extra}
          {link || onShow ? (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
              {link ? (
                <a href={link.url} {...NEW_TAB} onClick={(e) => e.stopPropagation()} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#7854f6] px-2.5 text-xs font-semibold !text-white hover:bg-[#6842eb]">
                  <ExternalLink className="h-3 w-3" /> {link.label}
                </a>
              ) : null}
              {onShow ? (
                <button type="button" onClick={(e) => { e.stopPropagation(); onShow(); }} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e2dcf7] bg-white px-2.5 text-xs font-medium text-[#5a3fd6] hover:bg-[#faf9ff]">
                  <MapPin className="h-3 w-3" /> Show on map
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>
    </motion.div>
  );
}
