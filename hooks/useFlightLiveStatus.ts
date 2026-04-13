"use client";

import { useQuery } from "@tanstack/react-query";
import { LiveFlightData } from "@/app/api/flight-live/route";

export type { LiveFlightData };

// Statuses that mean the flight is still active and worth polling
const ACTIVE_STATUSES: LiveFlightData["status"][] = ["scheduled", "delayed", "departed"];

const POLL_INTERVAL = 3 * 60 * 1000; // 3 minutes

function isEligibleDate(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flightDay = new Date(isoDate + "T00:00:00");
  const diffDays = Math.round(
    (flightDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  // Only show live status for today and tomorrow
  return diffDays === 0 || diffDays === 1;
}

export interface UseFlightLiveStatusResult {
  liveData: LiveFlightData | null;
  loading: boolean;
  error: string | null;
}

export function useFlightLiveStatus(
  flightNumber: string,
  isoDate: string,
  enabled = true,
): UseFlightLiveStatusResult {
  const isEligible = enabled && isEligibleDate(isoDate);

  const { data, isPending, error: queryError } = useQuery<LiveFlightData | null, Error>({
    queryKey: ["flight-live-status", flightNumber, isoDate],
    queryFn: async () => {
      const params = new URLSearchParams({ flight: flightNumber, date: isoDate });
      const res = await fetch(`/api/flight-live?${params}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json() as Promise<LiveFlightData>;
    },
    enabled: isEligible,
    staleTime: POLL_INTERVAL,
    refetchInterval: (query) => {
      const currentData = query.state.data;
      if (!currentData) return false;
      if (!ACTIVE_STATUSES.includes(currentData.status)) return false;
      return POLL_INTERVAL;
    },
  });

  return {
    liveData: data ?? null,
    loading: isPending && isEligible,
    error: queryError ? queryError.message : null,
  };
}
