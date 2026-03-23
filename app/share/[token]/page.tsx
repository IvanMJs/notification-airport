import { notFound } from "next/navigation";
import Link from "next/link";
import { getTripByShareToken, SharedTripFlight, SharedTripAccommodation } from "@/lib/tripShare";
import { AutoRefresh } from "./AutoRefresh";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function flightStatusColor(isoDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flightDay = new Date(isoDate + "T00:00:00");
  const diff = Math.ceil((flightDay.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return "bg-gray-800/60 text-gray-400 border-gray-700/40";
  if (diff === 0) return "bg-blue-900/60 text-blue-300 border-blue-700/40 animate-pulse";
  if (diff <= 3)  return "bg-emerald-900/40 text-emerald-300 border-emerald-700/40";
  return "bg-white/5 text-gray-400 border-white/8";
}

function flightStatusLabel(isoDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flightDay = new Date(isoDate + "T00:00:00");
  const diff = Math.ceil((flightDay.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return "Completado";
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ma\u00F1ana";
  return `En ${diff} d\u00EDas`;
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
  const statusCls   = flightStatusColor(flight.iso_date);
  const statusLabel = flightStatusLabel(flight.iso_date);

  return (
    <div className={`rounded-xl border overflow-hidden ${statusCls}`}>
      {/* Flight header */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider text-gray-400">
              Vuelo {index + 1}
            </span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded border border-current opacity-70">
              {statusLabel}
            </span>
          </div>
          <p className="text-xl font-black tracking-wide">{flight.flight_code}</p>
          <p className="text-xs text-gray-400">{flight.airline_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold">
            {flight.origin_code}{" "}
            <span className="text-gray-500">&rarr;</span>{" "}
            {flight.destination_code}
          </p>
          <p className="text-xs text-gray-400">{formatDate(flight.iso_date)}</p>
          {flight.departure_time && (
            <p className="text-xs font-semibold text-white mt-0.5">
              {flight.departure_time}
              {flight.arrival_time && (
                <span className="text-gray-400">
                  {" \u2192 "}{flight.arrival_time}
                  {flight.arrival_date && flight.arrival_date !== flight.iso_date && (
                    <span className="text-xs text-gray-500">+1</span>
                  )}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Accommodation below flight */}
      {acc && (
        <div className="px-4 py-2.5 border-t border-white/8 bg-white/[0.02] flex items-center gap-2">
          <span className="text-sm" aria-hidden="true">{"\uD83C\uDFE8"}</span>
          <div>
            <p className="text-xs font-semibold text-gray-200">{acc.name}</p>
            <p className="text-[11px] text-gray-500">
              {acc.check_in_date ? formatDate(acc.check_in_date) : ""}
              {acc.check_out_date ? ` \u2013 ${formatDate(acc.check_out_date)}` : ""}
              {acc.check_in_time ? ` \u00B7 Check-in ${acc.check_in_time}` : ""}
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

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <AutoRefresh />

      {/* Header */}
      <div className="border-b border-white/8 px-4 py-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-0.5">
            Seguimiento en vivo
          </p>
          <h1 className="text-lg font-black text-white">{trip.name}</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400">Live</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Flight cards */}
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
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-5 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
            Monitorea tus vuelos en tiempo real
          </p>
          <p className="text-sm font-semibold text-white mb-3">
            Descarg\u00E1 TripCopilot
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors px-5 py-2 text-sm font-bold text-white"
          >
            Abrir TripCopilot
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-600 pt-2">
          Esta p\u00E1gina se actualiza autom\u00E1ticamente cada 2 minutos.
          <br />
          Compartido con TripCopilot
        </p>
      </div>
    </div>
  );
}
