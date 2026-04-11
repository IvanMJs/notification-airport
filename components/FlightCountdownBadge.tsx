"use client";

import { useState, useEffect, useRef } from "react";
import { Plane } from "lucide-react";
import { TripFlight } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

interface FlightCountdownBadgeProps {
  flight: TripFlight;
  locale: "es" | "en";
}

/**
 * Converts a local departure time (HH:MM in the airport's timezone) to a UTC Date.
 * Reuses the same Intl-based offset trick from lib/connectionRisk.ts.
 */
function localToUTCDate(isoDate: string, timeHHMM: string, timezone: string): Date | null {
  if (!timeHHMM) return null;
  const parts = timeHHMM.split(":").map(Number);
  if (parts.length < 2) return null;
  const [h, m] = parts;

  try {
    // Treat the local time as UTC to get a reference Date
    const refMs = Date.UTC(
      parseInt(isoDate.slice(0, 4)),
      parseInt(isoDate.slice(5, 7)) - 1,
      parseInt(isoDate.slice(8, 10)),
      h, m, 0,
    );

    // Find what that UTC moment looks like in the target timezone
    const tzParts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
      hour12: false,
    }).formatToParts(new Date(refMs));

    const get = (type: string) =>
      parseInt(tzParts.find((p) => p.type === type)?.value ?? "0");

    const tzHour = get("hour") % 24;
    const tzMin  = get("minute");
    const offsetMin = (h * 60 + m) - (tzHour * 60 + tzMin);

    const midnightUTC = Date.UTC(
      parseInt(isoDate.slice(0, 4)),
      parseInt(isoDate.slice(5, 7)) - 1,
      parseInt(isoDate.slice(8, 10)),
    );

    return new Date(midnightUTC + (h * 60 + m + offsetMin) * 60000);
  } catch {
    // Fallback: treat time as UTC
    const midnightUTC = Date.UTC(
      parseInt(isoDate.slice(0, 4)),
      parseInt(isoDate.slice(5, 7)) - 1,
      parseInt(isoDate.slice(8, 10)),
    );
    return new Date(midnightUTC + (h * 60 + m) * 60000);
  }
}

export function FlightCountdownBadge({ flight, locale }: FlightCountdownBadgeProps) {
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const [flashing, setFlashing] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => {
    const timezone = AIRPORTS[flight.originCode]?.timezone ?? "UTC";
    const departureDate = localToUTCDate(flight.isoDate, flight.departureTime, timezone);
    if (!departureDate) return;

    function tick() {
      if (!departureDate) return;
      const remaining = departureDate.getTime() - Date.now();
      setMsLeft(remaining);
      if (remaining <= 0 && !celebratedRef.current) {
        celebratedRef.current = true;
        setFlashing(true);
        setTimeout(() => setFlashing(false), 2200);
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [flight.isoDate, flight.departureTime, flight.originCode]);

  if (msLeft === null) return null;

  const totalMinutes = Math.floor(msLeft / 60000);

  // Don't render if already departed or more than 24h away
  if (totalMinutes < 0) return null;
  if (totalMinutes > 24 * 60) return null;

  const isUrgent = totalMinutes <= 60;

  let label: string;
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins  = totalMinutes % 60;
    label = locale === "es"
      ? (mins === 0 ? `Sale en ${hours}h` : `Sale en ${hours}h ${mins}min`)
      : (mins === 0 ? `Departs in ${hours}h` : `Departs in ${hours}h ${mins}min`);
  } else {
    label = locale === "es"
      ? `Sale en ${totalMinutes}min`
      : `Departs in ${totalMinutes}min`;
  }

  const totalDuration = 24 * 60; // 24h window in minutes
  const elapsed = Math.max(0, totalDuration - totalMinutes);
  const progress = Math.min(100, (elapsed / totalDuration) * 100);

  return (
    <div
      className={[
        "w-full rounded-xl overflow-hidden border",
        isUrgent
          ? "bg-amber-950/40 border-amber-700/40"
          : "bg-violet-950/40 border-violet-700/40",
        flashing ? "animate-success-flash" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Plane className={`h-4 w-4 shrink-0 ${isUrgent ? "text-amber-400" : "text-violet-400"}`} />
          <div className="min-w-0">
            <p className={`text-xs font-bold ${isUrgent ? "text-amber-300" : "text-violet-300"}`}>
              {label}
            </p>
            <p className={`text-[11px] truncate ${isUrgent ? "text-amber-400/60" : "text-violet-400/60"}`}>
              {flight.flightCode} · {flight.originCode} → {flight.destinationCode} · {flight.departureTime}
            </p>
          </div>
        </div>
        {isUrgent && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-900/50 border border-amber-700/40 rounded-full px-2 py-0.5 shrink-0 animate-pulse">
            {locale === "es" ? "Hoy" : "Today"}
          </span>
        )}
      </div>

      {/* Progress bar with airplane */}
      <div className="px-4 pb-3">
        <div className="relative h-2 rounded-full overflow-visible">
          {/* Track */}
          <div className={`absolute inset-0 rounded-full ${isUrgent ? "bg-amber-900/50" : "bg-violet-900/50"}`} />
          {/* Fill */}
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${isUrgent ? "bg-amber-500/70" : "bg-violet-500/70"}`}
            style={{ width: `${progress}%` }}
          />
          {/* Airplane indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-1000"
            style={{ left: `clamp(6px, ${progress}%, calc(100% - 6px))` }}
          >
            <Plane className={`h-3.5 w-3.5 drop-shadow-lg ${isUrgent ? "text-amber-300" : "text-violet-300"}`} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-[10px] ${isUrgent ? "text-amber-500/50" : "text-violet-500/50"}`}>
            {locale === "es" ? "24h antes" : "24h before"}
          </span>
          <span className={`text-[10px] font-bold tabular-nums ${isUrgent ? "text-amber-300" : "text-violet-300"}`}>
            {Math.round(progress)}%
          </span>
          <span className={`text-[10px] ${isUrgent ? "text-amber-500/50" : "text-violet-500/50"}`}>
            {locale === "es" ? "Salida" : "Departure"}
          </span>
        </div>
      </div>
    </div>
  );
}
