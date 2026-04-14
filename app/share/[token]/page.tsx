import { notFound } from "next/navigation";
import Link from "next/link";
import { Plane } from "lucide-react";
import { SharedTripFlight, SharedTripAccommodation } from "@/lib/tripShare";
import { getTripByShareToken } from "@/lib/tripShareServer";
import { AIRPORTS } from "@/lib/airports";
import { AutoRefresh } from "./AutoRefresh";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function formatDateRange(flights: SharedTripFlight[]): string {
  if (flights.length === 0) return "";
  const first = flights[0].iso_date;
  const last  = flights[flights.length - 1].iso_date;
  if (first === last) return formatDate(first);
  return `${formatDate(first)} – ${formatDate(last)}`;
}

function buildRouteString(flights: SharedTripFlight[]): string {
  if (flights.length === 0) return "";
  const codes = [flights[0].origin_code];
  for (const f of flights) codes.push(f.destination_code);
  // Deduplicate consecutive codes
  const deduped: string[] = [codes[0]];
  for (let i = 1; i < codes.length; i++) {
    if (codes[i] !== codes[i - 1]) deduped.push(codes[i]);
  }
  return deduped.join(" → ");
}

function flightDaysLeft(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(isoDate + "T00:00:00").getTime() - today.getTime()) / 86400000);
}

function flightStatusBadge(isoDate: string): { label: string; cls: string } {
  const diff = flightDaysLeft(isoDate);
  if (diff < 0)   return { label: "Completado",    cls: "bg-gray-800/70 text-gray-400 border-gray-700/40" };
  if (diff === 0) return { label: "Hoy",            cls: "bg-blue-900/60 text-blue-300 border-blue-700/40" };
  if (diff === 1) return { label: "Mañana",         cls: "bg-emerald-900/50 text-emerald-300 border-emerald-700/40" };
  if (diff <= 3)  return { label: `En ${diff} días`, cls: "bg-amber-900/40 text-amber-300 border-amber-700/40" };
  return { label: `En ${diff} días`, cls: "bg-white/5 text-gray-400 border-white/8" };
}

// ── Flight card ───────────────────────────────────────────────────────────────

function FlightCard({
  flight,
  index,
  acc,
}: {
  flight: SharedTripFlight;
  index: number;
  acc: SharedTripAccommodation | undefined;
}) {
  const badge       = flightStatusBadge(flight.iso_date);
  const originCity  = AIRPORTS[flight.origin_code]?.city ?? flight.origin_code;
  const destCity    = AIRPORTS[flight.destination_code]?.city ?? flight.destination_code;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] overflow-hidden">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Vuelo {index + 1}
            </span>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xl font-black tracking-wide text-white">{flight.flight_code}</p>
          <p className="text-xs text-gray-500 mt-0.5">{flight.airline_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-white">
            {flight.origin_code}
            <span className="mx-1.5 text-gray-500">→</span>
            {flight.destination_code}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">{originCity} · {destCity}</p>
        </div>
      </div>

      {/* Date & times row */}
      <div className="px-4 pb-3 flex items-center gap-3 border-t border-white/[0.05]">
        <div className="flex-1 pt-2.5">
          <p className="text-xs font-semibold text-gray-300">{formatDate(flight.iso_date)}</p>
          {flight.departure_time && (
            <p className="text-xs text-gray-500 mt-0.5">
              {flight.departure_time}
              {flight.arrival_time && (
                <>
                  {" → "}{flight.arrival_time}
                  {flight.arrival_date && flight.arrival_date !== flight.iso_date && (
                    <span className="text-gray-600 text-[10px]"> +1</span>
                  )}
                </>
              )}
            </p>
          )}
        </div>
        <Plane className="h-4 w-4 text-gray-600" aria-hidden="true" />
      </div>

      {/* Accommodation below flight */}
      {acc && (
        <div className="px-4 py-2.5 border-t border-white/[0.05] bg-white/[0.02] flex items-center gap-2.5">
          <span className="text-sm shrink-0" aria-hidden="true">🏨</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-200 truncate">{acc.name}</p>
            <p className="text-[11px] text-gray-500">
              {acc.check_in_date ? formatDate(acc.check_in_date) : ""}
              {acc.check_out_date ? ` – ${formatDate(acc.check_out_date)}` : ""}
              {acc.check_in_time ? ` · Check-in ${acc.check_in_time}` : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ShareTripPage({ params }: PageProps) {
  const { token } = await params;
  const trip = await getTripByShareToken(token);

  if (!trip) notFound();

  const sortedFlights = [...trip.flights].sort((a, b) => {
    const d = a.iso_date.localeCompare(b.iso_date);
    return d !== 0 ? d : (a.departure_time ?? "").localeCompare(b.departure_time ?? "");
  });

  const routeStr  = buildRouteString(sortedFlights);
  const dateRange = formatDateRange(sortedFlights);

  // Hero city: destination of last flight
  const lastFlight  = sortedFlights[sortedFlights.length - 1];
  const heroCode    = lastFlight?.destination_code ?? "";
  const heroCity    = AIRPORTS[heroCode]?.city ?? heroCode;
  const flightCount = sortedFlights.length;

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <AutoRefresh />

      {/* Hero gradient */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-[#0a0a12] to-[#0a0a12]"
        />
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl"
        />

        <div className="relative max-w-lg mx-auto px-5 pt-10 pb-8">
          {/* Live badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/50 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">Seguimiento en vivo</span>
          </div>

          {/* Trip name */}
          <h1 className="text-3xl font-black text-white leading-tight mb-1">
            {trip.name}
          </h1>

          {/* Destination city */}
          {heroCity && (
            <p className="text-lg font-semibold text-violet-300/80 mb-4">{heroCity}</p>
          )}

          {/* Route breadcrumb */}
          {routeStr && (
            <div className="flex items-center gap-2 mb-4">
              <Plane className="h-3.5 w-3.5 text-gray-500 shrink-0" aria-hidden="true" />
              <p className="text-sm font-mono text-gray-400">{routeStr}</p>
            </div>
          )}

          {/* Trip stats */}
          <div className="flex items-center gap-3 flex-wrap">
            {flightCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.09] text-xs font-semibold text-gray-300">
                {flightCount} {flightCount === 1 ? "vuelo" : "vuelos"}
              </span>
            )}
            {dateRange && (
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.09] text-xs font-semibold text-gray-300">
                {dateRange}
              </span>
            )}
            {trip.accommodations.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.09] text-xs font-semibold text-gray-300">
                🏨 {trip.accommodations.length} {trip.accommodations.length === 1 ? "alojamiento" : "alojamientos"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Flight cards */}
      <div className="max-w-lg mx-auto px-5 pb-6 space-y-3">
        {sortedFlights.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-12">
            Sin vuelos en este viaje.
          </p>
        ) : (
          sortedFlights.map((flight, idx) => {
            const acc = trip.accommodations.find(
              (a) =>
                a.check_in_date === (flight.arrival_date ?? flight.iso_date) ||
                a.check_in_date === flight.iso_date,
            );
            return (
              <FlightCard key={flight.id} flight={flight} index={idx} acc={acc} />
            );
          })
        )}

        {/* CTA */}
        <div className="mt-4 rounded-2xl border border-violet-800/30 bg-gradient-to-br from-violet-950/40 to-transparent px-5 py-6 text-center space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-violet-400/80">
            Monitorea tus vuelos en tiempo real
          </p>
          <p className="text-base font-bold text-white">
            Abrí TripCopilot para ver alertas, clima y más
          </p>
          <Link
            href="/app"
            className="inline-block rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 transition-colors px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-900/40"
          >
            Abrir en TripCopilot
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-600 pt-1 pb-2">
          Esta página se actualiza automáticamente cada 2 minutos.
          <br />
          <span className="text-gray-700">Compartido con</span>{" "}
          <span className="font-semibold text-gray-500">TripCopilot</span>
        </p>
      </div>
    </div>
  );
}
