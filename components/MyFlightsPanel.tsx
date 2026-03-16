"use client";

import { AirportStatusMap } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { ExternalLink, Clock, MapPin, Plane, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FlightData {
  date: string;
  dateEn: string;
  flightNum: string;
  airline: string;
  originCode: string;
  originName: string;
  originNameEn: string;
  originICAO: string;
  destinationCode: string;
  destinationName: string;
  destinationNameEn: string;
  destinationICAO: string;
  departureTime: string;
  arrivalRecommendation: string;
  arrivalNoteEs: string;
  arrivalNoteEn: string;
  flightUrl: string;
  routeUrl: string;
}

const MY_FLIGHTS: FlightData[] = [
  {
    date: "29 Mar", dateEn: "Mar 29",
    flightNum: "AA 900", airline: "American Airlines",
    originCode: "EZE", originName: "Buenos Aires", originNameEn: "Buenos Aires", originICAO: "SAEZ",
    destinationCode: "MIA", destinationName: "Miami", destinationNameEn: "Miami", destinationICAO: "KMIA",
    departureTime: "20:30",
    arrivalRecommendation: "17:30",
    arrivalNoteEs: "3 hs antes — internacional + migraciones EZE",
    arrivalNoteEn: "3 hrs before — international + EZE immigration",
    flightUrl: "https://www.flightaware.com/live/flight/AAL900",
    routeUrl: "https://www.flightaware.com/live/flights/route/SAEZ/KMIA",
  },
  {
    date: "31 Mar", dateEn: "Mar 31",
    flightNum: "AA 956", airline: "American Airlines",
    originCode: "MIA", originName: "Miami", originNameEn: "Miami", originICAO: "KMIA",
    destinationCode: "GCM", destinationName: "Grand Cayman", destinationNameEn: "Grand Cayman", destinationICAO: "MWCR",
    departureTime: "12:55",
    arrivalRecommendation: "10:55",
    arrivalNoteEs: "2 hs antes — internacional desde MIA",
    arrivalNoteEn: "2 hrs before — international from MIA",
    flightUrl: "https://www.flightaware.com/live/flight/AAL956",
    routeUrl: "https://www.flightaware.com/live/flights/route/KMIA/MWCR",
  },
  {
    date: "05 Abr", dateEn: "Apr 5",
    flightNum: "B6 766", airline: "JetBlue Airways",
    originCode: "GCM", originName: "Grand Cayman", originNameEn: "Grand Cayman", originICAO: "MWCR",
    destinationCode: "JFK", destinationName: "New York", destinationNameEn: "New York", destinationICAO: "KJFK",
    departureTime: "15:40",
    arrivalRecommendation: "13:10",
    arrivalNoteEs: "2.5 hs antes — GCM pequeño, vuelo internacional",
    arrivalNoteEn: "2.5 hrs before — GCM small airport, international flight",
    flightUrl: "https://www.flightaware.com/live/flight/JBU766",
    routeUrl: "https://www.flightaware.com/live/flights/route/MWCR/KJFK",
  },
  {
    date: "11 Abr", dateEn: "Apr 11",
    flightNum: "DL 1514", airline: "Delta Air Lines",
    originCode: "JFK", originName: "New York", originNameEn: "New York", originICAO: "KJFK",
    destinationCode: "MIA", destinationName: "Miami", destinationNameEn: "Miami", destinationICAO: "KMIA",
    departureTime: "11:10",
    arrivalRecommendation: "09:10",
    arrivalNoteEs: "2 hs antes — doméstico USA, JFK es grande",
    arrivalNoteEn: "2 hrs before — domestic US, JFK is large",
    flightUrl: "https://www.flightaware.com/live/flight/DAL1514",
    routeUrl: "https://www.flightaware.com/live/flights/route/KJFK/KMIA",
  },
  {
    date: "11 Abr", dateEn: "Apr 11",
    flightNum: "AA 931", airline: "American Airlines",
    originCode: "MIA", originName: "Miami", originNameEn: "Miami", originICAO: "KMIA",
    destinationCode: "EZE", destinationName: "Buenos Aires", destinationNameEn: "Buenos Aires", destinationICAO: "SAEZ",
    departureTime: "21:15",
    arrivalRecommendation: "18:15",
    arrivalNoteEs: "3 hs antes — internacional largo + migraciones USA",
    arrivalNoteEn: "3 hrs before — long international + US immigration",
    flightUrl: "https://www.flightaware.com/live/flight/AAL931",
    routeUrl: "https://www.flightaware.com/live/flights/route/KMIA/SAEZ",
  },
];

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

interface MyFlightsPanelProps {
  statusMap: AirportStatusMap;
}

export function MyFlightsPanel({ statusMap }: MyFlightsPanelProps) {
  const { t, locale } = useLanguage();

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">{t.trip}</p>
        <LinkButton href="https://nasstatus.faa.gov" variant="blue">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          {t.faaButton}
        </LinkButton>
      </div>

      {/* Vuelos */}
      <div className="space-y-4">
        {MY_FLIGHTS.map((flight, idx) => {
          const originStatus = statusMap[flight.originCode];
          const status = originStatus?.status ?? "ok";
          const hasIssue = status !== "ok";
          const date = locale === "en" ? flight.dateEn : flight.date;
          const originName = locale === "en" ? flight.originNameEn : flight.originName;
          const destName   = locale === "en" ? flight.destinationNameEn : flight.destinationName;
          const arrivalNote = locale === "en" ? flight.arrivalNoteEn : flight.arrivalNoteEs;

          return (
            <div
              key={idx}
              className={`rounded-xl border-2 overflow-hidden transition-all ${
                hasIssue ? "border-orange-600/50" : "border-gray-800"
              }`}
            >
              {/* SECCIÓN 1: AEROPUERTO */}
              <div className={`px-4 py-3 ${hasIssue ? "bg-orange-950/30" : "bg-gray-900/60"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {hasIssue && <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />}
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        {t.sectionAirport}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{flight.originCode}</span>
                      <span className="text-sm text-gray-400">{originName}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={status} className="text-sm px-3 py-1" />
                    <LinkButton
                      href={`https://www.flightaware.com/live/airport/${flight.originICAO}`}
                      variant={hasIssue ? "orange" : "default"}
                    >
                      {t.seeAllFlightsFrom(flight.originCode)}
                    </LinkButton>
                  </div>
                </div>

                {hasIssue && (
                  <div className="mt-2 rounded-lg bg-orange-950/40 border border-orange-800/40 px-3 py-2 text-xs">
                    {originStatus?.delays && (
                      <p className="text-orange-200">
                        <span className="font-bold">⚠️ {t.delay}:</span>{" "}
                        {originStatus.delays.minMinutes}–{originStatus.delays.maxMinutes} min
                        {originStatus.delays.trend && ` · ${t.trend}: ${originStatus.delays.trend}`}
                        <br />
                        <span className="text-orange-400">{t.cause}: {originStatus.delays.reason}</span>
                      </p>
                    )}
                    {originStatus?.groundDelay && (
                      <p className="text-red-200">
                        <span className="font-bold">🔴 {t.groundDelayProgram}:</span>{" "}
                        {t.average} {originStatus.groundDelay.avgMinutes} min · {t.max} {originStatus.groundDelay.maxTime}
                        <br />
                        <span className="text-red-400">{t.cause}: {originStatus.groundDelay.reason}</span>
                      </p>
                    )}
                    {originStatus?.groundStop && (
                      <p className="text-red-200">
                        <span className="font-bold">🛑 {t.groundStop}</span>{" "}
                        {t.until} {originStatus.groundStop.endTime ?? t.indefinite}
                        <br />
                        <span className="text-red-400">{t.cause}: {originStatus.groundStop.reason}</span>
                      </p>
                    )}
                    {originStatus?.closure && (
                      <p className="text-gray-200">
                        <span className="font-bold">⛔ {t.airportClosed}</span>
                        <br />
                        <span className="text-gray-400">{t.cause}: {originStatus.closure.reason}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: RUTA */}
              <div className="px-4 py-3 border-t border-gray-800 bg-gray-900/30">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">
                      {t.sectionRoute}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-white">{flight.originCode}</span>
                      <Plane className="h-3.5 w-3.5 text-gray-600" />
                      <span className="font-bold text-gray-400">{flight.destinationCode}</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-500 text-xs">{originName} → {destName}</span>
                    </div>
                  </div>
                  <LinkButton href={flight.routeUrl} variant="default">
                    {t.seeOtherFlights(flight.originCode, flight.destinationCode)}
                  </LinkButton>
                </div>
              </div>

              {/* SECCIÓN 3: MI VUELO */}
              <div className="px-4 py-3 border-t border-gray-800 bg-gray-950/40">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">
                  {t.sectionMyFlight}
                </p>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-medium bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                        {date}
                      </span>
                      <span className="font-bold text-white">{flight.flightNum}</span>
                      <span className="text-xs text-gray-500">{flight.airline}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-xs">
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <Clock className="h-3.5 w-3.5 text-gray-600" />
                        {t.departs} <span className="font-bold text-white ml-1">{flight.departureTime}</span>
                      </span>
                      <span className="flex items-start gap-1.5 text-gray-400">
                        <MapPin className="h-3.5 w-3.5 text-yellow-600 shrink-0 mt-0.5" />
                        <span>
                          {t.arriveAt}{" "}
                          <span className="font-bold text-yellow-400">{flight.arrivalRecommendation}</span>
                          <span className="text-gray-600 ml-1">({arrivalNote})</span>
                        </span>
                      </span>
                    </div>
                  </div>
                  <LinkButton href={flight.flightUrl} variant="blue">
                    {t.trackFlight(flight.flightNum)}
                  </LinkButton>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-700 pt-1">{t.flightLinkNote}</p>
    </div>
  );
}
