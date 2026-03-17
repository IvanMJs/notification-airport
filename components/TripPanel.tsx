"use client";

import { useState } from "react";
import {
  Plus, X, ExternalLink, Clock, MapPin, Plane,
  AlertTriangle, Search, Calendar, Share2, CheckCheck,
} from "lucide-react";
import { AirportStatusMap, TripFlight, TripTab } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";
import { AIRLINES, parseFlightCode, subtractHours, buildArrivalNote } from "@/lib/flightUtils";
import { StatusBadge } from "./StatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { WeatherData } from "@/hooks/useWeather";
import { TripTimeline } from "./TripTimeline";
import { CalendarFlight, generateICS, downloadICS, buildGoogleCalendarURL } from "@/lib/calendarExport";
import { buildShareURL, copyToClipboard, buildWhatsAppMessage, buildWhatsAppURL, WhatsAppFlight } from "@/lib/tripShare";

// ── i18n ─────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    addTitle: "Agregar vuelo",
    flightPlaceholder: "Código (AA900, B6766…)",
    originPlaceholder: "Origen IATA",
    destPlaceholder: "Destino IATA",
    bufferLabel: "Llegar",
    addBtn: "Agregar",
    noFlights: "No hay vuelos todavía. Agregá el primero.",
    bufferOptions: [
      { value: 1,   label: "1h antes" },
      { value: 1.5, label: "1:30h antes" },
      { value: 2,   label: "2h antes" },
      { value: 2.5, label: "2:30h antes" },
      { value: 3,   label: "3h antes" },
    ],
    // Validation errors
    errInvalidCode:    "Código inválido. Usá: AA900, B6766 o EDV5068",
    errUnknownAirline: "Aerolínea no reconocida. Verificá el código.",
    errUnknownOrigin:  "Aeropuerto de origen no reconocido.",
    errUnknownDest:    "Aeropuerto de destino no reconocido.",
    errSameAirport:    "Origen y destino no pueden ser iguales.",
    errMissingDate:    "Ingresá la fecha del vuelo.",
    // Card labels
    sectionAirport: "Aeropuerto de salida",
    sectionRoute:   "Ruta",
    sectionFlight:  "Mi vuelo",
    departs: "Sale:",
    arriveAt: "Llegar al aeropuerto:",
    removeTitle: "Eliminar vuelo",
    seeAllFlightsFrom: (code: string) => `FlightAware · Vuelos de ${code}`,
    seeOtherFlights: (o: string, d: string) => `Vuelos alternativos ${o}→${d}`,
    trackFlight: (num: string) => `Tracking vuelo ${num}`,
    days: (n: number) => `${n} día${n !== 1 ? "s" : ""}`,
    today: "HOY",
    completed: "Completado",
  },
  en: {
    addTitle: "Add flight",
    flightPlaceholder: "Code (AA900, B6766…)",
    originPlaceholder: "Origin IATA",
    destPlaceholder: "Dest. IATA",
    bufferLabel: "Arrive",
    addBtn: "Add",
    noFlights: "No flights yet. Add the first one.",
    bufferOptions: [
      { value: 1,   label: "1h before" },
      { value: 1.5, label: "1:30h before" },
      { value: 2,   label: "2h before" },
      { value: 2.5, label: "2:30h before" },
      { value: 3,   label: "3h before" },
    ],
    errInvalidCode:    "Invalid code. Use: AA900, B6766 or EDV5068",
    errUnknownAirline: "Airline not recognized. Check the code.",
    errUnknownOrigin:  "Origin airport not recognized.",
    errUnknownDest:    "Destination airport not recognized.",
    errSameAirport:    "Origin and destination can't be the same.",
    errMissingDate:    "Enter the flight date.",
    sectionAirport: "Departure airport",
    sectionRoute:   "Route",
    sectionFlight:  "My flight",
    departs: "Departs:",
    arriveAt: "Arrive at airport by:",
    removeTitle: "Remove flight",
    seeAllFlightsFrom: (code: string) => `FlightAware · Flights from ${code}`,
    seeOtherFlights: (o: string, d: string) => `Alternative flights ${o}→${d}`,
    trackFlight: (num: string) => `Track flight ${num}`,
    days: (n: number) => `${n} day${n !== 1 ? "s" : ""} left`,
    today: "TODAY",
    completed: "Completed",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flight = new Date(isoDate + "T00:00:00");
  return Math.ceil((flight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DaysCountdown({ days, L }: { days: number; L: typeof LABELS["es"] }) {
  if (days < 0) {
    return (
      <span className="text-xs font-medium bg-gray-800 text-gray-500 px-2 py-0.5 rounded">
        {L.completed}
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="text-xs font-bold bg-red-900/60 text-red-300 px-2 py-0.5 rounded animate-pulse">
        {L.today}
      </span>
    );
  }
  const colorClass = days <= 7 ? "bg-yellow-900/50 text-yellow-300" : "bg-green-900/40 text-green-300";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${colorClass}`}>
      {L.days(days)}
    </span>
  );
}

function LinkButton({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "blue" | "orange";
}) {
  const colors = {
    default: "border-gray-700 bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 hover:text-white",
    blue:    "border-blue-700/60 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 hover:text-blue-300",
    orange:  "border-orange-700/60 bg-orange-900/20 text-orange-400 hover:bg-orange-900/40 hover:text-orange-300",
  };
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${colors[variant]}`}
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

// ── Add-flight form ───────────────────────────────────────────────────────────

interface AddFlightFormProps {
  tripId: string;
  onAdd: (tripId: string, flight: TripFlight) => void;
  locale: "es" | "en";
}

const BLANK_FORM = {
  flightCode:  "",
  originCode:  "",
  destCode:    "",
  isoDate:     "",
  departureTime: "",
  arrivalBuffer: 2 as number,
};

function AddFlightForm({ tripId, onAdd, locale }: AddFlightFormProps) {
  const L = LABELS[locale];
  const [form, setForm] = useState(BLANK_FORM);
  const [error, setError] = useState("");

  function update(field: keyof typeof BLANK_FORM, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function handleAdd() {
    setError("");

    // 1. Parse flight code
    const parsed = parseFlightCode(form.flightCode);
    if (!parsed) {
      const clean = form.flightCode.trim().toUpperCase().replace(/\s+/g, "");
      const codeMatch = clean.match(/^([A-Z]{2,3}|[A-Z0-9]{2})\d+$/);
      setError(codeMatch && !AIRLINES[codeMatch[1]] ? L.errUnknownAirline : L.errInvalidCode);
      return;
    }

    // 2. Validate origin
    const origin = form.originCode.trim().toUpperCase();
    if (!AIRPORTS[origin]) { setError(L.errUnknownOrigin); return; }

    // 3. Validate destination
    const dest = form.destCode.trim().toUpperCase();
    if (!AIRPORTS[dest]) { setError(L.errUnknownDest); return; }

    // 4. Same airport check
    if (origin === dest) { setError(L.errSameAirport); return; }

    // 5. Date required; time is optional
    if (!form.isoDate) { setError(L.errMissingDate); return; }

    const newFlight: TripFlight = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      flightCode:      parsed.fullCode,
      airlineCode:     parsed.airlineCode,
      airlineName:     parsed.airlineName,
      airlineIcao:     parsed.airlineIcao,
      flightNumber:    parsed.flightNumber,
      originCode:      origin,
      destinationCode: dest,
      isoDate:         form.isoDate,
      departureTime:   form.departureTime,
      arrivalBuffer:   form.arrivalBuffer,
    };

    onAdd(tripId, newFlight);
    setForm(BLANK_FORM);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

  const inputClass =
    "rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-300">{L.addTitle}</h3>
      </div>

      <div className="flex gap-2 flex-wrap">
        <input
          value={form.flightCode}
          onChange={(e) => update("flightCode", e.target.value)}
          onKeyDown={handleKey}
          placeholder={L.flightPlaceholder}
          className={`${inputClass} flex-1 min-w-[160px]`}
        />
        <input
          value={form.originCode}
          onChange={(e) => update("originCode", e.target.value.toUpperCase())}
          onKeyDown={handleKey}
          placeholder={L.originPlaceholder}
          maxLength={3}
          className={`${inputClass} w-28`}
        />
        <input
          value={form.destCode}
          onChange={(e) => update("destCode", e.target.value.toUpperCase())}
          onKeyDown={handleKey}
          placeholder={L.destPlaceholder}
          maxLength={3}
          className={`${inputClass} w-28`}
        />
        <input
          type="date"
          value={form.isoDate}
          onChange={(e) => update("isoDate", e.target.value)}
          onKeyDown={handleKey}
          className={`${inputClass} flex-1 min-w-[140px]`}
        />
        <input
          type="time"
          value={form.departureTime}
          onChange={(e) => update("departureTime", e.target.value)}
          onKeyDown={handleKey}
          className={`${inputClass} w-28`}
          title={locale === "es" ? "Hora de salida (opcional)" : "Departure time (optional)"}
        />
        {form.departureTime && (
          <select
            value={form.arrivalBuffer}
            onChange={(e) => update("arrivalBuffer", Number(e.target.value))}
            className={`${inputClass} w-36`}
            aria-label={L.bufferLabel}
          >
            {L.bufferOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {L.addBtn}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Flight card ───────────────────────────────────────────────────────────────

interface FlightCardProps {
  flight: TripFlight;
  statusMap: AirportStatusMap;
  weatherMap: Record<string, WeatherData>;
  locale: "es" | "en";
  onRemove: () => void;
  idx: number;
}

function FlightCard({ flight, statusMap, weatherMap, locale, onRemove, idx }: FlightCardProps) {
  const L = LABELS[locale];

  const originInfo  = AIRPORTS[flight.originCode];
  const destInfo    = AIRPORTS[flight.destinationCode];
  const originIcao  = originInfo?.icao ?? `K${flight.originCode}`;
  const destIcao    = destInfo?.icao   ?? `K${flight.destinationCode}`;

  const originName  = originInfo?.city || flight.originCode;
  const destName    = destInfo?.city   || flight.destinationCode;

  const flightUrl  = `https://www.flightaware.com/live/flight/${flight.airlineIcao}${flight.flightNumber}`;
  const routeUrl   = `https://www.google.com/travel/flights?q=flights+from+${flight.originCode}+to+${flight.destinationCode}`;
  const airportUrl = `https://www.flightaware.com/live/airport/${originIcao}`;

  const arrivalRec  = flight.departureTime
    ? subtractHours(flight.departureTime, flight.arrivalBuffer)
    : null;
  const arrivalNote = flight.departureTime
    ? buildArrivalNote(flight.arrivalBuffer, locale)
    : null;

  const dateLabel = new Date(flight.isoDate + "T00:00:00").toLocaleDateString(
    locale === "en" ? "en-US" : "es-AR",
    { day: "2-digit", month: locale === "en" ? "short" : "2-digit" }
  );
  const daysUntil = getDaysUntil(flight.isoDate);

  const originStatus = statusMap[flight.originCode];
  const status       = originStatus?.status ?? "ok";
  const hasIssue     = status !== "ok";
  const weather      = weatherMap[flight.originCode];

  return (
    <div
      id={`flight-card-${idx}`}
      className={`rounded-xl border-2 overflow-hidden transition-all animate-fade-in-up ${
        hasIssue ? "border-orange-600/50" : "border-gray-800"
      }`}
      style={{ animationDelay: `${idx * 0.08}s` }}
    >
      {/* SECTION 1: Airport */}
      <div className={`px-4 py-3 ${hasIssue ? "bg-orange-950/30" : "bg-gray-900/60"}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {hasIssue && <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />}
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {L.sectionAirport}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{flight.originCode}</span>
              <span className="text-sm text-gray-400">{originName}</span>
            </div>
            {weather && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                <span className="text-sm leading-none">{weather.icon}</span>
                <span className="font-medium text-gray-300">{weather.temperature}°C</span>
                <span>{weather.description}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={status} className="text-sm px-3 py-1" />
            <LinkButton href={airportUrl} variant={hasIssue ? "orange" : "default"}>
              {L.seeAllFlightsFrom(flight.originCode)}
            </LinkButton>
          </div>
        </div>

        {hasIssue && (
          <div className="mt-2 rounded-lg bg-orange-950/40 border border-orange-800/40 px-3 py-2 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                {locale === "en" ? "FAA Live Alert" : "Alerta FAA en vivo"}
              </span>
              <a
                href={airportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-orange-500 hover:text-orange-300 transition-colors"
              >
                {locale === "en" ? "See on FlightAware ↗" : "Ver en FlightAware ↗"}
              </a>
            </div>
            {originStatus?.delays && (
              <p className="text-orange-200">
                ⚠️ {originStatus.delays.minMinutes}–{originStatus.delays.maxMinutes} min
                {" · "}{originStatus.delays.reason}
              </p>
            )}
            {originStatus?.groundDelay && (
              <p className="text-red-200">
                🔴 avg {originStatus.groundDelay.avgMinutes} min · {originStatus.groundDelay.reason}
              </p>
            )}
            {originStatus?.groundStop && (
              <p className="text-red-200">
                🛑 {locale === "en" ? "until" : "hasta"} {originStatus.groundStop.endTime ?? "?"}{" "}
                · {originStatus.groundStop.reason}
              </p>
            )}
            {originStatus?.closure && (
              <p className="text-gray-200">⛔ {originStatus.closure.reason}</p>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: Route */}
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-900/30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">
              {L.sectionRoute}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-white">{flight.originCode}</span>
              <Plane className="h-3.5 w-3.5 text-gray-600" />
              <span className="font-bold text-gray-400">{flight.destinationCode}</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-500 text-xs">{originName} → {destName}</span>
            </div>
          </div>
          <LinkButton href={routeUrl} variant="default">
            {L.seeOtherFlights(flight.originCode, flight.destinationCode)}
          </LinkButton>
        </div>
      </div>

      {/* SECTION 3: My flight */}
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-950/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">
              {L.sectionFlight}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                  {dateLabel}
                </span>
                <DaysCountdown days={daysUntil} L={L} />
                <span className="font-bold text-white">{flight.flightCode}</span>
                <span className="text-xs text-gray-500">{flight.airlineName}</span>
              </div>
              {flight.departureTime && (
                <div className="flex items-center gap-4 flex-wrap text-xs">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Clock className="h-3.5 w-3.5 text-gray-600" />
                    {L.departs}{" "}
                    <span className="font-bold text-white ml-1">{flight.departureTime}</span>
                  </span>
                  {arrivalRec && (
                    <span className="flex items-start gap-1.5 text-gray-400">
                      <MapPin className="h-3.5 w-3.5 text-yellow-600 shrink-0 mt-0.5" />
                      <span>
                        {L.arriveAt}{" "}
                        <span className="font-bold text-yellow-400">{arrivalRec}</span>
                        <span className="text-gray-600 ml-1">({arrivalNote})</span>
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={onRemove}
              title={L.removeTitle}
              className="rounded-full p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <LinkButton href={flightUrl} variant="blue">
              {L.trackFlight(flight.flightCode)}
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TripPanel ─────────────────────────────────────────────────────────────────

interface TripPanelProps {
  trip: TripTab;
  statusMap: AirportStatusMap;
  weatherMap: Record<string, WeatherData>;
  onAddFlight: (tripId: string, flight: TripFlight) => void;
  onRemoveFlight: (tripId: string, flightId: string) => void;
}

export function TripPanel({
  trip,
  statusMap,
  weatherMap,
  onAddFlight,
  onRemoveFlight,
}: TripPanelProps) {
  const { locale } = useLanguage();
  const L = LABELS[locale];
  const [copied, setCopied]         = useState(false);
  const [waCopied, setWaCopied]     = useState(false);
  const [showGcal, setShowGcal]     = useState(false);

  const sorted = [...trip.flights].sort((a, b) =>
    a.isoDate.localeCompare(b.isoDate)
  );

  // Build shared CalendarFlight list (used by ICS + GCal)
  const calFlights: CalendarFlight[] = sorted.map((f) => ({
    flightCode:      f.flightCode,
    originCode:      f.originCode,
    originCity:      AIRPORTS[f.originCode]?.city ?? f.originCode,
    destinationCode: f.destinationCode,
    destinationCity: AIRPORTS[f.destinationCode]?.city ?? f.destinationCode,
    isoDate:         f.isoDate,
    departureTime:   f.departureTime || undefined,
    airlineName:     f.airlineName,
    flightAwareUrl:  `https://www.flightaware.com/live/flight/${f.airlineIcao}${f.flightNumber}`,
  }));

  function handleExportICS() {
    downloadICS(`${trip.name.replace(/\s+/g, "-")}.ics`, generateICS(calFlights));
  }

  async function handleShareWhatsApp() {
    const waFlights: WhatsAppFlight[] = sorted.map((f) => {
      const arrivalRec = f.departureTime
        ? subtractHours(f.departureTime, f.arrivalBuffer)
        : undefined;
      return {
        flightCode:      f.flightCode,
        airlineName:     f.airlineName,
        originCode:      f.originCode,
        originCity:      AIRPORTS[f.originCode]?.city ?? f.originCode,
        destinationCode: f.destinationCode,
        destinationCity: AIRPORTS[f.destinationCode]?.city ?? f.destinationCode,
        isoDate:         f.isoDate,
        departureTime:   f.departureTime || undefined,
        arrivalBuffer:   f.arrivalBuffer,
        arrivalRec:      arrivalRec ?? undefined,
      };
    });
    const msg = buildWhatsAppMessage(trip.name, waFlights, locale);
    try {
      await navigator.clipboard.writeText(msg);
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2500);
    } catch {
      window.open(buildWhatsAppURL(msg), "_blank", "noopener,noreferrer");
    }
  }

  async function handleShareLink() {
    const url = buildShareURL(trip.name, trip.flights);
    const ok = await copyToClipboard(url);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <TripTimeline flights={trip.flights} statusMap={statusMap} />

      <AddFlightForm tripId={trip.id} onAdd={onAddFlight} locale={locale} />

      {trip.flights.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {/* ICS download */}
            <button
              onClick={handleExportICS}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" />
              {locale === "en" ? "Export .ics" : "Exportar .ics"}
            </button>

            {/* Google Calendar dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowGcal((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                Google Calendar
              </button>
              {showGcal && (
                <div className="absolute top-full mt-1 left-0 z-20 min-w-[220px] rounded-lg border border-gray-700 bg-gray-900 shadow-xl py-1">
                  {calFlights.map((cf, i) => (
                    <a
                      key={i}
                      href={buildGoogleCalendarURL(cf)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowGcal(false)}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      <span>
                        <span className="font-semibold">{cf.flightCode}</span>
                        <span className="text-gray-500 ml-1">{cf.originCode}→{cf.destinationCode}</span>
                      </span>
                      <span className="text-gray-600 shrink-0">
                        {new Date(cf.isoDate + "T00:00:00").toLocaleDateString(locale === "en" ? "en-US" : "es-AR", { day: "numeric", month: "short" })}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* WhatsApp share */}
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 rounded-lg border border-green-800/60 bg-green-900/20 px-3 py-1.5 text-xs text-green-400 hover:bg-green-900/40 hover:text-green-300 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              {waCopied
                ? (locale === "en" ? "Copied! Paste in WhatsApp" : "¡Copiado! Pegalo en WhatsApp")
                : "WhatsApp"}
            </button>

            {/* Copy link */}
            <button
              onClick={handleShareLink}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-400" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied
                ? (locale === "en" ? "Copied!" : "¡Copiado!")
                : (locale === "en" ? "Copy link" : "Copiar link")}
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-8">{L.noFlights}</p>
      ) : (
        <div className="space-y-4">
          {sorted.map((flight, idx) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              statusMap={statusMap}
              weatherMap={weatherMap}
              locale={locale}
              onRemove={() => onRemoveFlight(trip.id, flight.id)}
              idx={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
}
