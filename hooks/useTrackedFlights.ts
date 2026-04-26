"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { ParsedFlight, parseFlightCode } from "@/lib/flightUtils";

export interface TrackedFlight {
  id: string;           // Supabase row id
  parsed: ParsedFlight;
  airportCode: string;
}

export function useTrackedFlights() {
  const [flights, setFlights] = useState<TrackedFlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      try {
        const { data, error } = await supabase
          .from("tracked_flights")
          .select("id, airline_code, flight_number, airport_code")
          .order("created_at", { ascending: true });

        if (!error && data) {
          const mapped = data.flatMap((r) => {
            const parsed = parseFlightCode(`${r.airline_code}${r.flight_number}`);
            return parsed ? [{ id: r.id, parsed, airportCode: r.airport_code ?? "" }] : [];
          });
          setFlights(mapped);
        }
      } catch (err) {
        console.error("Error loading tracked flights:", err);
      }

      setLoading(false);
    }

    load();
  }, []);

  const add = useCallback(async (parsed: ParsedFlight, airportCode: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tracked_flights")
        .insert({
          airline_code: parsed.airlineCode,
          flight_number: parsed.flightNumber,
          airport_code: airportCode || null,
        })
        .select("id")
        .single();

      if (!error && data) {
        setFlights((prev) => [...prev, { id: data.id, parsed, airportCode }]);
      }
    } catch (err) {
      console.error("Error adding tracked flight:", err);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      setFlights((prev) => prev.filter((f) => f.id !== id));

      const supabase = createClient();
      await supabase.from("tracked_flights").delete().eq("id", id);
    } catch (err) {
      console.error("Error removing tracked flight:", err);
    }
  }, []);

  return { flights, loading, add, remove };
}