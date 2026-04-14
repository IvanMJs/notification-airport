"use client";

import { Plane, Hotel, ChevronRight, Trash2 } from "lucide-react";
import { TripTab } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatShortDate(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "es-AR", {
    day: "numeric",
    month: "short",
  });
}

function buildDateRange(trip: TripTab, locale: "es" | "en"): string {
  const dates = trip.flights.map((f) => f.isoDate).sort();
  if (dates.length === 0) return "";
  const first = dates[0];
  const last  = dates[dates.length - 1];
  const firstD = new Date(first + "T00:00:00");
  const lastD  = new Date(last  + "T00:00:00");
  const totalDays =
    Math.round((lastD.getTime() - firstD.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (first === last) {
    return `${formatShortDate(first, locale)} · ${totalDays} ${locale === "es" ? "día" : "day"}`;
  }

  const firstYear = firstD.getFullYear();
  const lastYear  = lastD.getFullYear();

  if (firstYear === lastYear) {
    return `${formatShortDate(first, locale)} – ${formatShortDate(last, locale)} ${lastYear}`;
  }
  return `${formatShortDate(first, locale)} ${firstYear} – ${formatShortDate(last, locale)} ${lastYear}`;
}

function buildRouteNodes(trip: TripTab): string[] {
  const codes: string[] = [];
  for (const f of trip.flights) {
    if (!codes.includes(f.originCode)) codes.push(f.originCode);
    if (!codes.includes(f.destinationCode)) codes.push(f.destinationCode);
  }
  return codes;
}

function cityLabel(iata: string): string {
  return AIRPORTS[iata]?.city ?? iata;
}

// ── TripArchiveCard ───────────────────────────────────────────────────────────

interface TripArchiveCardProps {
  trip: TripTab;
  locale: "es" | "en";
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TripArchiveCard({ trip, locale, onSelect, onDelete }: TripArchiveCardProps) {
  const dateRange  = buildDateRange(trip, locale);
  const routeNodes = buildRouteNodes(trip);
  const flightCount = trip.flights.length;
  const accCount    = trip.accommodations.length;

  const dates = trip.flights.map((f) => f.isoDate).sort();
  const firstDate = dates[0];
  const lastDate  = dates[dates.length - 1];
  const totalDays = firstDate && lastDate
    ? Math.round(
        (new Date(lastDate + "T00:00:00").getTime() -
          new Date(firstDate + "T00:00:00").getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1
    : 0;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden opacity-70 hover:opacity-90 transition-opacity">
      <div className="flex items-center gap-2 pr-3">
      <button
        onClick={() => onSelect(trip.id)}
        className="flex-1 min-w-0 text-left px-4 py-3.5 flex items-center gap-3 tap-scale"
      >
        <div className="flex-1 min-w-0">
          {/* Trip name + date range */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-sm font-semibold text-gray-300 truncate">{trip.name}</p>
            {dateRange && (
              <span className="shrink-0 text-[11px] text-gray-600 font-medium">
                {dateRange}
              </span>
            )}
          </div>

          {/* Route breadcrumb */}
          {routeNodes.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {routeNodes.map((code, idx) => (
                <span key={code} className="flex items-center gap-1">
                  {idx > 0 && (
                    <Plane className="h-2.5 w-2.5 text-gray-600 shrink-0" />
                  )}
                  <span className="text-[11px] font-semibold text-gray-500">
                    {code}
                  </span>
                  {routeNodes.length <= 6 && (
                    <span className="text-[10px] text-gray-700 hidden sm:inline">
                      {cityLabel(code)}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-gray-600">
              <Plane className="h-3 w-3" />
              {flightCount}{" "}
              {locale === "es"
                ? `vuelo${flightCount !== 1 ? "s" : ""}`
                : `flight${flightCount !== 1 ? "s" : ""}`}
            </span>
            {accCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-gray-600">
                <Hotel className="h-3 w-3" />
                {accCount}{" "}
                {locale === "es"
                  ? `alojamiento${accCount !== 1 ? "s" : ""}`
                  : `hotel${accCount !== 1 ? "s" : ""}`}
              </span>
            )}
            {totalDays > 0 && (
              <span className="text-[11px] text-gray-600">
                {totalDays}{" "}
                {locale === "es"
                  ? `día${totalDays !== 1 ? "s" : ""}`
                  : `day${totalDays !== 1 ? "s" : ""}`}
              </span>
            )}
          </div>
        </div>

        {/* Open button */}
        <div className="shrink-0 flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-300 hover:border-white/[0.14] transition-colors">
          {locale === "es" ? "Abrir" : "Open"}
          <ChevronRight className="h-3 w-3" />
        </div>
      </button>
      {onDelete && (
        <button
          onClick={() => onDelete(trip.id)}
          className="shrink-0 p-2 rounded-xl text-gray-700 hover:text-red-400 hover:bg-red-950/30 transition-colors tap-scale"
          title={locale === "es" ? "Eliminar viaje" : "Delete trip"}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      </div>
    </div>
  );
}
