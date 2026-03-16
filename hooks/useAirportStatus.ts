"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AirportStatusMap } from "@/lib/types";
import { parseXML } from "@/lib/faa";
import toast from "react-hot-toast";

export function useAirportStatus(refreshIntervalMinutes: number = 5) {
  const [statusMap, setStatusMap] = useState<AirportStatusMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    refreshIntervalMinutes * 60
  );
  const prevStatusRef = useRef<AirportStatusMap>({});
  const initialLoadDone = useRef(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch("/api/faa-status", { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error("Error fetching FAA data");
      const xml = await res.text();
      const newMap = parseXML(xml);

      // Detectar cambios y notificar (solo después del primer load)
      if (initialLoadDone.current) {
        const prev = prevStatusRef.current;
        Object.keys(newMap).forEach((iata) => {
          const prevStatus = prev[iata]?.status;
          const newStatus = newMap[iata]?.status;
          if (prevStatus !== undefined && prevStatus !== newStatus) {
            if (newStatus === "ok") {
              toast.success(`${iata}: Demoras despejadas ✅`);
            } else {
              toast.error(`${iata}: Estado cambió ⚠️`);
            }
          }
        });
      }

      prevStatusRef.current = newMap;
      setStatusMap(newMap);
      setLastUpdated(new Date());
      setSecondsUntilRefresh(refreshIntervalMinutes * 60);
      initialLoadDone.current = true;
    } catch (e) {
      clearTimeout(timeout);
      if ((e as Error).name === "AbortError") {
        setError("Timeout — FAA no respondió en 12 segundos");
      } else {
        setError(String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [refreshIntervalMinutes]);

  // Auto-refresh
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, refreshIntervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus, refreshIntervalMinutes]);

  // Countdown ticker
  useEffect(() => {
    setSecondsUntilRefresh(refreshIntervalMinutes * 60);
    const tick = setInterval(() => {
      setSecondsUntilRefresh((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [refreshIntervalMinutes, lastUpdated]);

  return {
    statusMap,
    loading,
    error,
    lastUpdated,
    secondsUntilRefresh,
    totalSeconds: refreshIntervalMinutes * 60,
    refresh: fetchStatus,
  };
}
