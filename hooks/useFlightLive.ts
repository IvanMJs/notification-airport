"use client";

import { useQuery } from "@tanstack/react-query";
import { LiveFlightData } from "@/app/api/flight-live/route";

export type { LiveFlightData };

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export function useFlightLive(
  flightCode: string,
  isoDate: string,
  enabled: boolean,
): { data: LiveFlightData | null; loading: boolean } {
  const { data, isPending } = useQuery<LiveFlightData | null>({
    queryKey: ["flight-live", flightCode, isoDate],
    queryFn: async () => {
      const params = new URLSearchParams({ code: flightCode, date: isoDate });
      const res = await fetch(`/api/flight-live?${params.toString()}`);
      if (!res.ok) return null;
      return res.json() as Promise<LiveFlightData>;
    },
    enabled: enabled && !!flightCode,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
  });

  return { data: data ?? null, loading: isPending && enabled };
}
