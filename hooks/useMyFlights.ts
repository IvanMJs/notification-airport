"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { AIRPORTS } from "@/lib/airports";
import { subtractHours, buildArrivalNote } from "@/lib/flightUtils";

// ── Public type — consumed by MyFlightsPanel and sub-components ───────────────

export interface FlightData {
  date: string;
  dateEn: string;
  isoDate: string;
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
  arrivalBuffer: number;
  arrivalRecommendation: string;
  arrivalNoteEs: string;
  arrivalNoteEn: string;
  flightUrl: string;
  routeUrl: string;
}

// ── DB row shape returned by Supabase ─────────────────────────────────────────

interface DbFlight {
  id: string;
  flight_code: string;
  airline_code: string;
  airline_name: string;
  airline_icao: string;
  flight_number: string;
  origin_code: string;
  destination_code: string;
  iso_date: string;
  departure_time: string | null;
  arrival_buffer: number;
  sort_order: number;
}

// ── Month abbreviations ───────────────────────────────────────────────────────

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Transform DB row → FlightData ─────────────────────────────────────────────

function toFlightData(f: DbFlight): FlightData {
  const origin = AIRPORTS[f.origin_code];
  const dest   = AIRPORTS[f.destination_code];

  const d     = new Date(f.iso_date + "T00:00:00");
  const day   = d.getDate();
  const month = d.getMonth();

  const date   = `${String(day).padStart(2, "0")} ${MONTHS_ES[month]}`;
  const dateEn = `${MONTHS_EN[month]} ${day}`;

  const departureTime       = f.departure_time ?? "";
  const arrivalRecommendation = departureTime
    ? subtractHours(departureTime, f.arrival_buffer)
    : "";

  return {
    date,
    dateEn,
    isoDate:             f.iso_date,
    flightNum:           `${f.airline_code} ${f.flight_number}`,
    airline:             f.airline_name,
    originCode:          f.origin_code,
    originName:          origin?.city ?? f.origin_code,
    originNameEn:        origin?.city ?? f.origin_code,
    originICAO:          origin?.icao ?? "",
    destinationCode:     f.destination_code,
    destinationName:     dest?.city ?? f.destination_code,
    destinationNameEn:   dest?.city ?? f.destination_code,
    destinationICAO:     dest?.icao ?? "",
    departureTime,
    arrivalBuffer:       f.arrival_buffer,
    arrivalRecommendation,
    arrivalNoteEs:       buildArrivalNote(f.arrival_buffer, "es"),
    arrivalNoteEn:       buildArrivalNote(f.arrival_buffer, "en"),
    flightUrl:  `https://www.flightaware.com/live/flight/${f.airline_icao}${f.flight_number}`,
    routeUrl:   `https://www.google.com/travel/flights?q=flights+from+${f.origin_code}+to+${f.destination_code}`,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMyFlights() {
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // Fetch the user's primary trip (oldest created) and all its flights
      const { data: trip, error } = await supabase
        .from("trips")
        .select("id, flights(*)")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && trip?.flights) {
        const sorted = [...(trip.flights as DbFlight[])].sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        setFlights(sorted.map(toFlightData));
      }

      setLoading(false);
    }

    load();
  }, []);

  return { flights, loading };
}
