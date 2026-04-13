"use client";

import { useEffect, useCallback, useState } from "react";
import { AirportStatusMap, TripTab } from "@/lib/types";
import { offlineCache } from "@/lib/offlineCache";
import { cacheTrips } from "@/lib/tripsCache";

/**
 * Manages offline data sync for trips and airport status.
 *
 * - Tracks online/offline state via browser events.
 * - Auto-saves trips to IndexedDB (via tripsCache) and airport status to
 *   localStorage (via offlineCache) whenever fresh data arrives while online.
 * - Exposes `lastSync` so the UI can display when data was last saved.
 */
export function useOfflineSync(
  userId: string | null,
  trips: TripTab[],
  statusMap: AirportStatusMap,
) {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(() =>
    offlineCache.getLastSync(),
  );

  // ── Online / offline listeners ────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ── Auto-save trips when data is fresh and we're online ──────────────────

  useEffect(() => {
    if (!userId || trips.length === 0 || !isOnline) return;

    // Persist to IndexedDB (tripsCache) — best-effort, errors are swallowed there
    cacheTrips(trips).catch(() => {/* best-effort */});

    // Record sync time
    const now = new Date();
    offlineCache.setLastSync(now);
    setLastSync(now);
  }, [userId, trips, isOnline]);

  // ── Auto-save airport status when data is fresh and we're online ─────────

  useEffect(() => {
    if (!isOnline || Object.keys(statusMap).length === 0) return;
    offlineCache.saveAirportStatus(statusMap);
  }, [statusMap, isOnline]);

  // ── Utility: load cached trips from IndexedDB ─────────────────────────────

  const loadCachedTrips = useCallback(async (): Promise<TripTab[] | null> => {
    const { getCachedTrips } = await import("@/lib/tripsCache");
    return getCachedTrips();
  }, []);

  return { isOnline, lastSync, loadCachedTrips };
}
