"use client";

import { Plane, Hotel, Clock, AlertTriangle, CalendarDays } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TripFlight, Accommodation, AirportStatusMap } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { ConnectionAnalysis } from "@/lib/connectionRisk";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Minimal flight shape accepted by TripTimeline (TripFlight satisfies this). */
export interface TimelineFlight {
  id?: string;
  originCode: string;
  destinationCode: string;
  isoDate: string;
  flightCode: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
}

interface TripTimelineProps {
  flights: TimelineFlight[];
  accommodations?: Accommodation[];
  statusMap: AirportStatusMap;
  /** Map from "flightA.id→flightB.id" to ConnectionAnalysis */
  connectionMap?: Map<string, ConnectionAnalysis>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate + "T00:00:00");
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatLayoverDuration(minutes: number, locale: "es" | "en"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "es") {
    return h > 0 && m > 0 ? `${h}h ${m}m escala` : h > 0 ? `${h}h escala` : `${m}m escala`;
  }
  return h > 0 && m > 0 ? `${h}h ${m}m layover` : h > 0 ? `${h}h layover` : `${m}m layover`;
}

// ── Risk colors (vertical line + dot) ─────────────────────────────────────────

const RISK_LINE: Record<string, string> = {
  safe:    "bg-white/10",
  tight:   "bg-yellow-500/50",
  at_risk: "bg-orange-500/60",
  missed:  "bg-red-500/70",
};

const RISK_DOT: Record<string, string> = {
  safe:    "bg-blue-400 ring-blue-400/30",
  tight:   "bg-yellow-400 ring-yellow-400/30",
  at_risk: "bg-orange-400 ring-orange-400/30",
  missed:  "bg-red-400 ring-red-400/30",
};

const RISK_PILL: Record<string, string> = {
  safe:    "bg-emerald-900/50 text-emerald-400 border-emerald-700/40",
  tight:   "bg-yellow-900/50 text-yellow-400 border-yellow-700/40",
  at_risk: "bg-orange-900/60 text-orange-400 border-orange-700/50",
  missed:  "bg-red-900/60 text-red-400 border-red-700/50",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function RailLine({ risk }: { risk: string }) {
  return (
    <div
      className={`w-px flex-1 min-h-[2rem] mx-auto transition-colors ${RISK_LINE[risk] ?? RISK_LINE.safe}`}
    />
  );
}

function RailDot({
  isToday,
  isPast,
  hasIssue,
  risk,
}: {
  isToday: boolean;
  isPast: boolean;
  hasIssue: boolean;
  risk: string;
}) {
  if (isToday) {
    return (
      <div className="relative flex items-center justify-center w-4 h-4 mx-auto">
        <span className="absolute inline-flex h-4 w-4 rounded-full bg-sky-400/30 animate-ping" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-400 ring-2 ring-sky-400/40 ring-offset-1"
          style={{ "--tw-ring-offset-color": "#0a0a0f" } as React.CSSProperties} />
      </div>
    );
  }
  if (isPast) {
    return (
      <div className="w-3 h-3 rounded-full mx-auto bg-white/20 ring-2 ring-white/10 ring-offset-1"
        style={{ "--tw-ring-offset-color": "#0a0a0f" } as React.CSSProperties} />
    );
  }
  const dotClass = hasIssue
    ? "bg-orange-500 ring-orange-500/30"
    : (RISK_DOT[risk] ?? RISK_DOT.safe);
  return (
    <div
      className={`w-3.5 h-3.5 rounded-full mx-auto ring-2 ring-offset-1 transition-colors ${dotClass}`}
      style={{ "--tw-ring-offset-color": "#0a0a0f" } as React.CSSProperties}
    />
  );
}

function AccommodationBlock({
  acc,
  locale,
}: {
  acc: Accommodation;
  locale: "es" | "en";
}) {
  return (
    <div className="flex gap-3 py-2">
      {/* Rail column */}
      <div className="flex flex-col items-center w-6 shrink-0">
        <RailLine risk="safe" />
        <div className="w-5 h-5 rounded-md bg-purple-900/60 border border-purple-700/40 flex items-center justify-center shrink-0">
          <Hotel className="w-2.5 h-2.5 text-purple-400" />
        </div>
        <RailLine risk="safe" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 bg-purple-950/30 border border-purple-800/20 rounded-lg px-3 py-2 my-1">
        <p className="text-xs font-semibold text-purple-300 truncate">{acc.name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {acc.checkInDate && (
            <span className="text-[11px] text-gray-400">
              {locale === "en" ? "In:" : "Entrada:"}{" "}
              <span className="text-gray-300">{formatShortDate(acc.checkInDate, locale)}</span>
              {acc.checkInTime && <span className="text-gray-400"> {acc.checkInTime}</span>}
            </span>
          )}
          {acc.checkOutDate && (
            <span className="text-[11px] text-gray-400">
              {locale === "en" ? "Out:" : "Salida:"}{" "}
              <span className="text-gray-300">{formatShortDate(acc.checkOutDate, locale)}</span>
              {acc.checkOutTime && <span className="text-gray-400"> {acc.checkOutTime}</span>}
            </span>
          )}
          {acc.confirmationCode && (
            <span className="text-[11px] text-gray-500">#{acc.confirmationCode}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TripTimeline({
  flights,
  accommodations = [],
  statusMap,
  connectionMap,
}: TripTimelineProps) {
  const { locale } = useLanguage();

  if (flights.length === 0) return null;

  const sorted = [...flights].sort((a, b) => {
    const d = a.isoDate.localeCompare(b.isoDate);
    return d !== 0 ? d : (a.departureTime ?? "").localeCompare(b.departureTime ?? "");
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="rounded-xl border border-white/6 px-4 pt-4 pb-3 animate-fade-in-up"
      style={{ background: "linear-gradient(135deg, rgba(15,15,23,0.9) 0%, rgba(10,10,18,0.95) 100%)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
        {locale === "en" ? "Trip timeline" : "Cronograma del viaje"}
      </p>

      <div className="space-y-0">
        {sorted.map((flight, idx) => {
          const isFirst  = idx === 0;
          const isLast   = idx === sorted.length - 1;
          const daysUntil = getDaysUntil(flight.isoDate);
          const isToday  = flight.isoDate === todayIso;
          const isPast   = daysUntil < 0;

          const hasOriginIssue = statusMap[flight.originCode]?.status !== "ok" &&
            statusMap[flight.originCode]?.status !== undefined;
          const hasDestIssue   = statusMap[flight.destinationCode]?.status !== "ok" &&
            statusMap[flight.destinationCode]?.status !== undefined;

          // Connection analysis from this flight to the next
          const nextFlight = sorted[idx + 1];
          const connKey = flight.id && nextFlight?.id ? `${flight.id}→${nextFlight.id}` : null;
          const conn = connKey && connectionMap ? connectionMap.get(connKey) : null;
          const connRisk = conn?.risk ?? "safe";

          // Accommodations linked to this flight
          const flightAccs = accommodations.filter((a) => a.flightId === flight.id);

          return (
            <div key={flight.id ?? idx}>
              {/* ── Flight row ── */}
              <div className="flex gap-3">
                {/* Rail column */}
                <div className="flex flex-col items-center w-6 shrink-0">
                  {!isFirst && <RailLine risk={connRisk} />}
                  <RailDot
                    isToday={isToday}
                    isPast={isPast}
                    hasIssue={hasOriginIssue}
                    risk={connRisk}
                  />
                  {isLast ? null : <RailLine risk={connRisk} />}
                </div>

                {/* Flight card */}
                <div className={`flex-1 min-w-0 rounded-lg border px-3 py-2 mb-1 transition-colors ${
                  isPast
                    ? "border-white/5 bg-white/[0.02]"
                    : isToday
                    ? "border-sky-700/30 bg-sky-950/20"
                    : "border-white/8 bg-white/[0.03]"
                }`}>
                  {/* Date row */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <CalendarDays className={`w-3 h-3 shrink-0 ${isPast ? "text-gray-600" : isToday ? "text-sky-400" : "text-gray-500"}`} />
                    <span className={`text-[11px] font-medium ${isPast ? "text-gray-600" : isToday ? "text-sky-300 font-semibold" : "text-gray-400"}`}>
                      {formatShortDate(flight.isoDate, locale)}
                      {isToday && (
                        <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-sky-400 animate-pulse">
                          {locale === "en" ? "TODAY" : "HOY"}
                        </span>
                      )}
                      {daysUntil > 0 && !isToday && (
                        <span className={`ml-1.5 text-[10px] ${daysUntil <= 7 ? "text-yellow-400" : "text-emerald-400"}`}>
                          {daysUntil}d
                        </span>
                      )}
                    </span>
                    {conn && conn.risk !== "safe" && (
                      <span className={`ml-auto text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${RISK_PILL[conn.risk]}`}>
                        {conn.risk === "missed"  ? (locale === "en" ? "Missed"   : "Perdida")  :
                         conn.risk === "at_risk" ? (locale === "en" ? "At risk"  : "En riesgo") :
                                                   (locale === "en" ? "Tight"    : "Ajustada")}
                        {conn.delayAddedMinutes > 0 && ` +${conn.delayAddedMinutes}m`}
                      </span>
                    )}
                  </div>

                  {/* Route: DEP ──✈── ARR */}
                  <div className="flex items-center gap-2">
                    {/* Origin */}
                    <div className="flex flex-col items-center min-w-[40px]">
                      <span className={`text-sm font-bold leading-none ${isPast ? "text-white/40" : "text-white"}`}>
                        {flight.originCode}
                      </span>
                      {flight.departureTime && (
                        <span className={`text-[11px] font-medium mt-0.5 ${isPast ? "text-white/30" : "text-blue-300"}`}>
                          {flight.departureTime}
                        </span>
                      )}
                      {hasOriginIssue && !isPast && (
                        <AlertTriangle className="w-2.5 h-2.5 text-orange-400 mt-0.5" />
                      )}
                    </div>

                    {/* Middle: flight code + plane icon */}
                    <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                      <div className="flex items-center gap-1 w-full">
                        <div className={`flex-1 h-px ${isPast ? "bg-white/10" : "bg-white/20"}`} />
                        <Plane className={`w-3 h-3 shrink-0 ${isPast ? "text-white/25" : "text-blue-400/70"}`} />
                        <div className={`flex-1 h-px ${isPast ? "bg-white/10" : "bg-white/20"}`} />
                      </div>
                      <span className={`text-[10px] font-medium truncate max-w-full ${isPast ? "text-white/30" : "text-gray-400"}`}>
                        {flight.flightCode}
                      </span>
                    </div>

                    {/* Destination */}
                    <div className="flex flex-col items-center min-w-[40px]">
                      <span className={`text-sm font-bold leading-none ${isPast ? "text-white/40" : "text-white"}`}>
                        {flight.destinationCode}
                      </span>
                      {flight.arrivalTime && (
                        <span className={`text-[11px] font-medium mt-0.5 ${isPast ? "text-white/30" : "text-emerald-300"}`}>
                          {flight.arrivalTime}
                          {flight.arrivalDate && flight.arrivalDate !== flight.isoDate && (
                            <span className="text-[9px] text-gray-500 ml-0.5">+1</span>
                          )}
                        </span>
                      )}
                      {hasDestIssue && !isPast && (
                        <AlertTriangle className="w-2.5 h-2.5 text-orange-400 mt-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Airport names (small, truncate) */}
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-600 truncate max-w-[45%]">
                      {AIRPORTS[flight.originCode]?.city ?? ""}
                    </span>
                    <span className="text-[10px] text-gray-600 truncate max-w-[45%] text-right">
                      {AIRPORTS[flight.destinationCode]?.city ?? ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Accommodations linked to this flight ── */}
              {flightAccs.map((acc) => (
                <AccommodationBlock key={acc.id} acc={acc} locale={locale} />
              ))}

              {/* ── Layover segment between this flight and the next ── */}
              {!isLast && nextFlight && (
                <LayoverSegment
                  flight={flight}
                  nextFlight={nextFlight}
                  conn={conn ?? null}
                  locale={locale}
                />
              )}
            </div>
          );
        })}

        {/* ── Final destination node ── */}
        {sorted.length > 0 && (() => {
          const last = sorted[sorted.length - 1];
          const hasIssue = statusMap[last.destinationCode]?.status !== "ok" &&
            statusMap[last.destinationCode]?.status !== undefined;
          const daysUntil = getDaysUntil(last.arrivalDate ?? last.isoDate);
          const isPast    = daysUntil < 0;

          return (
            <div className="flex gap-3">
              <div className="flex flex-col items-center w-6 shrink-0">
                <RailLine risk="safe" />
                <div className={`w-3.5 h-3.5 rounded-full mx-auto ring-2 ring-offset-1 ${
                  hasIssue ? "bg-orange-500 ring-orange-500/30" : isPast ? "bg-white/20 ring-white/10" : "bg-blue-500 ring-blue-500/30"
                }`}
                  style={{ "--tw-ring-offset-color": "#0a0a0f" } as React.CSSProperties}
                />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2 py-1">
                <span className={`text-sm font-bold ${isPast ? "text-white/40" : "text-white"}`}>
                  {last.destinationCode}
                </span>
                <span className="text-[11px] text-gray-500">
                  {AIRPORTS[last.destinationCode]?.city ?? ""}
                </span>
                {last.arrivalTime && (
                  <span className={`text-[11px] font-medium ml-auto ${isPast ? "text-white/30" : "text-emerald-300"}`}>
                    <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                    {last.arrivalTime}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Unlinked accommodations (no flightId) */}
        {accommodations
          .filter((a) => !a.flightId)
          .map((acc) => (
            <AccommodationBlock key={acc.id} acc={acc} locale={locale} />
          ))}
      </div>
    </div>
  );
}

// ── Layover segment ────────────────────────────────────────────────────────────

function LayoverSegment({
  flight,
  nextFlight,
  conn,
  locale,
}: {
  flight: TimelineFlight;
  nextFlight: TimelineFlight;
  conn: ConnectionAnalysis | null;
  locale: "es" | "en";
}) {
  const sameAirport = flight.destinationCode === nextFlight.originCode;
  if (!sameAirport) return null;

  const risk = conn?.risk ?? "safe";
  const bufferMin = conn?.scheduledBufferMinutes ?? null;

  return (
    <div className="flex gap-3 py-0">
      {/* Rail column */}
      <div className="flex flex-col items-center w-6 shrink-0">
        <RailLine risk={risk} />
      </div>

      {/* Layover label */}
      <div className="flex-1 min-w-0 flex items-center gap-2 py-1">
        <div className={`h-px flex-1 ${risk !== "safe" ? (RISK_LINE[risk] ?? "bg-white/10") : "bg-white/8"}`} />
        <span className={`text-[10px] font-medium whitespace-nowrap ${
          risk === "missed"  ? "text-red-400"    :
          risk === "at_risk" ? "text-orange-400" :
          risk === "tight"   ? "text-yellow-400" :
          "text-gray-500"
        }`}>
          {bufferMin !== null
            ? formatLayoverDuration(bufferMin, locale)
            : (locale === "en" ? "layover" : "escala")}
        </span>
        <div className={`h-px flex-1 ${risk !== "safe" ? (RISK_LINE[risk] ?? "bg-white/10") : "bg-white/8"}`} />
      </div>
    </div>
  );
}
