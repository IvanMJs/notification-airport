"use client";

import { useState } from "react";
import { Search, X, ExternalLink, Plane, Info } from "lucide-react";
import { AirportStatusMap } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";

// Base de aerolíneas para parsear código IATA → nombre + ICAO
const AIRLINES: Record<string, { name: string; icao: string }> = {
  AA: { name: "American Airlines",   icao: "AAL" },
  DL: { name: "Delta Air Lines",     icao: "DAL" },
  UA: { name: "United Airlines",     icao: "UAL" },
  B6: { name: "JetBlue Airways",     icao: "JBU" },
  WN: { name: "Southwest Airlines",  icao: "SWA" },
  AS: { name: "Alaska Airlines",     icao: "ASA" },
  NK: { name: "Spirit Airlines",     icao: "NKS" },
  F9: { name: "Frontier Airlines",   icao: "FFT" },
  HA: { name: "Hawaiian Airlines",   icao: "HAL" },
  G4: { name: "Allegiant Air",       icao: "AAY" },
  AC: { name: "Air Canada",          icao: "ACA" },
  AM: { name: "Aeroméxico",          icao: "AMX" },
  AR: { name: "Aerolíneas Argentinas", icao: "ARG" },
  LA: { name: "LATAM Airlines",      icao: "LAN" },
  IB: { name: "Iberia",             icao: "IBE" },
  BA: { name: "British Airways",     icao: "BAW" },
  LH: { name: "Lufthansa",           icao: "DLH" },
  AF: { name: "Air France",          icao: "AFR" },
  KL: { name: "KLM",                icao: "KLM" },
  EK: { name: "Emirates",            icao: "UAE" },
  QR: { name: "Qatar Airways",       icao: "QTR" },
};

interface ParsedFlight {
  airlineCode: string;
  airlineName: string;
  airlineIcao: string;
  flightNumber: string;
  fullCode: string;
  flightAwareUrl: string;
}

function parseFlightCode(input: string): ParsedFlight | null {
  const clean = input.trim().toUpperCase().replace(/\s+/g, "");
  // Acepta formatos: AA900, AA 900, B6766, DL1514
  const match = clean.match(/^([A-Z]{2})(\d{1,4})$/);
  if (!match) return null;

  const [, airlineCode, num] = match;
  const airline = AIRLINES[airlineCode];
  if (!airline) return null;

  const icaoNum = `${airline.icao}${num}`;

  return {
    airlineCode,
    airlineName: airline.name,
    airlineIcao: airline.icao,
    flightNumber: num,
    fullCode: `${airlineCode} ${num}`,
    flightAwareUrl: `https://www.flightaware.com/live/flight/${icaoNum}`,
  };
}

interface TrackedFlight {
  parsed: ParsedFlight;
  airportCode: string;
}

interface FlightSearchProps {
  statusMap: AirportStatusMap;
}

const LABELS = {
  es: {
    title: "Buscar vuelo por código",
    placeholder: "Ej: AA900, B6766, DL1514",
    add: "Agregar",
    track: "Rastrear en FlightAware",
    airportStatus: "Estado del aeropuerto de salida",
    airportPlaceholder: "Código IATA del aeropuerto (ej: MIA)",
    airportOptional: "Aeropuerto de salida (opcional, para ver demoras FAA)",
    remove: "Quitar",
    noAirport: "Sin aeropuerto asignado — ingresá el código IATA para ver demoras FAA",
    faaNote: "El estado por vuelo individual requiere una API paga. Acá mostramos el estado del aeropuerto de salida.",
    invalidCode: "Código inválido. Usá formato: AA900 o B6766",
    unknownAirline: "Aerolínea no reconocida. Intentá con FlightAware directamente.",
    trackedFlights: "Vuelos rastreados",
    empty: "Ingresá un código de vuelo arriba para rastrearlo.",
    airportLabel: "Aeropuerto:",
  },
  en: {
    title: "Search flight by code",
    placeholder: "E.g.: AA900, B6766, DL1514",
    add: "Add",
    track: "Track on FlightAware",
    airportStatus: "Departure airport status",
    airportPlaceholder: "IATA airport code (e.g.: MIA)",
    airportOptional: "Departure airport (optional, to show FAA delays)",
    remove: "Remove",
    noAirport: "No airport assigned — enter IATA code to see FAA delays",
    faaNote: "Per-flight status requires a paid API. Here we show the departure airport status.",
    invalidCode: "Invalid code. Use format: AA900 or B6766",
    unknownAirline: "Airline not recognized. Try FlightAware directly.",
    trackedFlights: "Tracked flights",
    empty: "Enter a flight code above to track it.",
    airportLabel: "Airport:",
  },
};

export function FlightSearch({ statusMap }: FlightSearchProps) {
  const { locale } = useLanguage();
  const L = LABELS[locale];

  const [input, setInput] = useState("");
  const [airportInput, setAirportInput] = useState("");
  const [error, setError] = useState("");
  const [tracked, setTracked] = useState<TrackedFlight[]>([]);

  function handleAdd() {
    setError("");
    const parsed = parseFlightCode(input);
    if (!parsed) {
      const match = input.trim().toUpperCase().replace(/\s+/g, "").match(/^([A-Z]{2})\d+$/);
      if (match && !AIRLINES[match[1]]) {
        setError(L.unknownAirline);
      } else {
        setError(L.invalidCode);
      }
      return;
    }

    const alreadyExists = tracked.some(
      (t) => t.parsed.fullCode === parsed.fullCode
    );
    if (alreadyExists) return;

    setTracked((prev) => [
      ...prev,
      { parsed, airportCode: airportInput.trim().toUpperCase() },
    ]);
    setInput("");
    setAirportInput("");
  }

  function handleRemove(fullCode: string) {
    setTracked((prev) => prev.filter((t) => t.parsed.fullCode !== fullCode));
  }

  return (
    <div className="space-y-4">

      {/* Formulario de búsqueda */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">{L.title}</h3>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={L.placeholder}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="relative flex-1 min-w-[120px]">
            <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              type="text"
              value={airportInput}
              onChange={(e) => setAirportInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={L.airportPlaceholder}
              maxLength={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAdd}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            {L.add}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <p className="text-xs text-gray-600 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {L.faaNote}
        </p>
      </div>

      {/* Resultados */}
      {tracked.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-6">{L.empty}</p>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {L.trackedFlights}
          </h3>
          {tracked.map(({ parsed, airportCode }) => {
            const airportStatus = airportCode ? statusMap[airportCode] : undefined;
            const status = airportStatus?.status ?? "ok";
            const hasIssue = status !== "ok" && !!airportCode;

            return (
              <div
                key={parsed.fullCode}
                className={`rounded-xl border-2 p-4 transition-all ${
                  hasIssue ? "border-orange-600/50 bg-orange-950/10" : "border-gray-800 bg-gray-900/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-white">{parsed.fullCode}</span>
                      <span className="text-sm text-gray-500">{parsed.airlineName}</span>
                    </div>
                    {airportCode ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">{L.airportLabel}</span>
                        <span className="font-bold text-white text-sm">{airportCode}</span>
                        <StatusBadge status={status} />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 italic">{L.noAirport}</p>
                    )}

                    {/* Detalle de demora si existe */}
                    {airportStatus?.delays && (
                      <p className="text-xs text-orange-300 mt-1">
                        ⚠️ {airportStatus.delays.minMinutes}–{airportStatus.delays.maxMinutes} min
                        {" · "}{airportStatus.delays.reason}
                      </p>
                    )}
                    {airportStatus?.groundDelay && (
                      <p className="text-xs text-red-300 mt-1">
                        🔴 {locale === "en" ? "Ground Delay" : "Demora en Tierra"} avg {airportStatus.groundDelay.avgMinutes} min
                        {" · "}{airportStatus.groundDelay.reason}
                      </p>
                    )}
                    {airportStatus?.groundStop && (
                      <p className="text-xs text-red-300 mt-1">
                        🛑 {locale === "en" ? "Ground Stop" : "Parada en Tierra"} {locale === "en" ? "until" : "hasta"} {airportStatus.groundStop.endTime ?? "?"} · {airportStatus.groundStop.reason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleRemove(parsed.fullCode)}
                      className="rounded-full p-1 text-gray-600 hover:text-gray-400 hover:bg-gray-800 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={parsed.flightAwareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-700/60 bg-blue-900/20 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-900/40 transition-all"
                    >
                      {L.track}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
