"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export interface FlightStatusData {
  flightIata:  string;
  status:      "scheduled" | "active" | "landed" | "cancelled" | "diverted" | "incident" | "unknown";
  departure: {
    terminal:  string | null;
    gate:      string | null;
    delay:     number | null;
    scheduled: string | null;
    estimated: string | null;
    actual:    string | null;
  };
  arrival: {
    terminal:  string | null;
    gate:      string | null;
    baggage:   string | null;
    delay:     number | null;
    estimated: string | null;
  };
  aircraft: { iata: string | null; registration: string | null } | null;
}

const _cache: Record<string, { data: FlightStatusData | null; ts: number; error?: string }> = {};
const TTL = 5 * 60 * 1000;

function shouldFetch(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flight = new Date(isoDate + "T00:00:00");
  const diff = Math.ceil((flight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= 3;
}

export function useFlightStatus(flightIata: string, isoDate: string) {
  const [data, setData]               = useState<FlightStatusData | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const mounted = useRef(true);
  const cacheKey = `${flightIata}__${isoDate}`;

  const doFetch = useCallback(async (force = false) => {
    if (!shouldFetch(isoDate)) return;

    const cached = _cache[cacheKey];
    if (!force && cached && Date.now() - cached.ts < TTL) {
      setData(cached.data);
      if (cached.error) setError(cached.error);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ flight_iata: flightIata, flight_date: isoDate });
      const res = await fetch(`/api/flight-status?${params}`);

      if (res.status === 503) { setNotConfigured(true); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const raw = json.data?.[0];
      if (!raw) {
        _cache[cacheKey] = { data: null, ts: Date.now() };
        if (mounted.current) setData(null);
        return;
      }

      const parsed: FlightStatusData = {
        flightIata: (raw.flight?.iata as string | undefined) ?? flightIata,
        status:     (raw.flight_status as FlightStatusData["status"] | undefined) ?? "unknown",
        departure: {
          terminal:  (raw.departure?.terminal as string | undefined) ?? null,
          gate:      (raw.departure?.gate as string | undefined) ?? null,
          delay:     typeof raw.departure?.delay === "number" ? raw.departure.delay : null,
          scheduled: (raw.departure?.scheduled as string | undefined) ?? null,
          estimated: (raw.departure?.estimated as string | undefined) ?? null,
          actual:    (raw.departure?.actual as string | undefined) ?? null,
        },
        arrival: {
          terminal:  (raw.arrival?.terminal as string | undefined) ?? null,
          gate:      (raw.arrival?.gate as string | undefined) ?? null,
          baggage:   (raw.arrival?.baggage as string | undefined) ?? null,
          delay:     typeof raw.arrival?.delay === "number" ? raw.arrival.delay : null,
          estimated: (raw.arrival?.estimated as string | undefined) ?? null,
        },
        aircraft: raw.aircraft
          ? {
              iata:         (raw.aircraft.iata as string | undefined) ?? null,
              registration: (raw.aircraft.registration as string | undefined) ?? null,
            }
          : null,
      };

      _cache[cacheKey] = { data: parsed, ts: Date.now() };
      if (mounted.current) setData(parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      _cache[cacheKey] = { data: null, ts: Date.now(), error: msg };
      if (mounted.current) setError(msg);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [flightIata, isoDate, cacheKey]);

  useEffect(() => {
    mounted.current = true;
    doFetch();
    return () => { mounted.current = false; };
  }, [doFetch]);

  return { data, loading, error, notConfigured, refresh: () => doFetch(true) };
}
