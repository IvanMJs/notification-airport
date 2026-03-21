"use client";

import { useFlightStatus } from "@/hooks/useFlightStatus";
import { RefreshCw, DoorOpen, Clock, Plane, AlertCircle } from "lucide-react";

const STATUS_CFG = {
  scheduled: { es: "Programado", en: "Scheduled",  cls: "border-blue-700/60 bg-blue-900/20 text-blue-300" },
  active:    { es: "En vuelo",   en: "In flight",   cls: "border-emerald-600/60 bg-emerald-900/20 text-emerald-300" },
  landed:    { es: "Aterrizó",   en: "Landed",      cls: "border-gray-700 bg-gray-800/60 text-gray-400" },
  cancelled: { es: "Cancelado",  en: "Cancelled",   cls: "border-red-700/60 bg-red-900/20 text-red-400" },
  diverted:  { es: "Desviado",   en: "Diverted",    cls: "border-orange-700/60 bg-orange-900/20 text-orange-400" },
  incident:  { es: "Incidente",  en: "Incident",    cls: "border-red-700/60 bg-red-900/30 text-red-300" },
  unknown:   { es: "Desconocido",en: "Unknown",     cls: "border-gray-700 bg-gray-800/40 text-gray-500" },
} as const;

interface Props {
  flightIata: string; // "AA900" no space
  isoDate:    string;
  locale:     "es" | "en";
}

function daysUntilFlight(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flight = new Date(isoDate + "T00:00:00");
  return Math.ceil((flight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function FlightStatusBadge({ flightIata, isoDate, locale }: Props) {
  const { data, loading, error, notConfigured, refresh } = useFlightStatus(flightIata, isoDate);

  // Hide completely when no API key or flight is too far away to fetch
  if (notConfigured) return null;
  if (daysUntilFlight(isoDate) > 3) return null;

  const cfg = STATUS_CFG[(data?.status ?? "unknown") as keyof typeof STATUS_CFG];

  return (
    <div className="px-4 py-3 border-t border-white/5">
      <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wider flex items-center gap-1.5">
        <Plane className="h-3 w-3" />
        {locale === "en" ? "Live flight status" : "Estado del vuelo en vivo"}
        <button
          onClick={refresh}
          disabled={loading}
          className="ml-auto text-gray-700 hover:text-gray-400 transition-colors disabled:opacity-40"
          title={locale === "en" ? "Refresh" : "Actualizar"}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </p>

      {loading && !data && (
        <p className="text-xs text-gray-600 animate-pulse">
          {locale === "en" ? "Fetching live data…" : "Obteniendo datos en vivo…"}
        </p>
      )}

      {error && !data && (
        <p className="text-xs text-gray-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {locale === "en" ? "Data unavailable" : "Datos no disponibles"}
        </p>
      )}

      {data && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>
            {locale === "en" ? cfg.en : cfg.es}
          </span>

            {/* B2 — Departure gate (prominent) */}
          {data.departure.gate && (
            <span className="flex items-center gap-1 text-sm font-semibold text-white">
              <DoorOpen className="w-3.5 h-3.5 text-violet-400" />
              {locale === "en" ? "Gate" : "Puerta"} {data.departure.gate}
              {data.departure.terminal ? ` · T${data.departure.terminal}` : ""}
            </span>
          )}

          {data.departure.delay != null && data.departure.delay > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-300 bg-orange-900/20 border border-orange-700/60 px-2 py-0.5 rounded-full">
              <Clock className="h-3 w-3" />
              +{data.departure.delay} min
            </span>
          )}

          {data.departure.delay === 0 && data.status === "scheduled" && (
            <span className="text-xs text-emerald-500/70">
              {locale === "en" ? "On time" : "A tiempo"}
            </span>
          )}

          {/* B1 — Aircraft type */}
          {data.aircraft?.iata && (
            <span className="text-xs text-gray-400">
              {data.aircraft.iata}
              {data.aircraft.registration ? ` · ${data.aircraft.registration}` : ""}
            </span>
          )}

          {data.arrival.gate && (
            <span className="text-[11px] text-gray-600">
              → {locale === "en" ? "Arr. gate" : "Puerta llegada"} {data.arrival.gate}
              {data.arrival.baggage ? ` · 🧳 ${data.arrival.baggage}` : ""}
            </span>
          )}

          {/* B3 — Actual vs scheduled departure time */}
          {(() => {
            const scheduled = data.departure.scheduled;
            const actual = data.departure.actual ?? data.departure.estimated;
            if (!scheduled || !actual) return null;
            const scheduledTime = new Date(scheduled).toLocaleTimeString(
              locale === "en" ? "en-US" : "es-AR",
              { hour: "2-digit", minute: "2-digit", hour12: false }
            );
            const actualTime = new Date(actual).toLocaleTimeString(
              locale === "en" ? "en-US" : "es-AR",
              { hour: "2-digit", minute: "2-digit", hour12: false }
            );
            if (scheduledTime === actualTime) return null;
            return (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 line-through">{scheduledTime}</span>
                <span className="text-sm font-medium text-amber-400">{actualTime}</span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
