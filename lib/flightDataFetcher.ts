import { fetchFromAviationStack } from "./providers/aviationstack";
import { fetchFromOpenSky } from "./providers/opensky";
import { fetchFlightStatusFromFlightAware, type FlightAwareResult } from "./flightaware";
import type { FlightDataResult } from "./flightDataProvider";

const _cache = new Map<string, { data: FlightDataResult; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function faToFlightData(
  fa: FlightAwareResult,
  flightCode: string,
): import("./flightDataProvider").FlightData {
  const status = fa.cancelled ? "cancelled"
    : fa.diverted ? "diverted"
    : fa.landed ? "landed"
    : /en.?route|airborne|active/i.test(fa.rawStatus ?? "") ? "active"
    : fa.delayMinutes > 0 ? "active"
    : "scheduled";

  return {
    flightCode,
    status,
    departure: {
      iataCode: "",
      estimatedTime: fa.estimatedDeparture ?? undefined,
      delay: fa.delayMinutes,
      gate: fa.gate ?? undefined,
      terminal: fa.terminal ?? undefined,
    },
    arrival: {
      iataCode: fa.arrivalIataCode ?? "",
      scheduledTime: undefined,
      estimatedTime: fa.estimatedArrival ?? undefined,
      actualTime: undefined,
      delay: undefined,
    },
    provider: "flightaware",
  };
}

export async function getFlightData(
  flightCode: string,
  isoDate: string,
): Promise<FlightDataResult> {
  const cacheKey = `${flightCode}:${isoDate}`;
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const faResult = await fetchFlightStatusFromFlightAware(flightCode, isoDate);
  if (faResult !== null) {
    const data = faToFlightData(faResult, flightCode);
    const result: FlightDataResult = { success: true, data };
    _cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  }
  // Only warn if key is configured but FA returned nothing (not when key is absent)
  if (process.env.FLIGHTAWARE_API_KEY) {
    console.warn(`[flightData] FlightAware returned null for ${flightCode}. Trying AviationStack...`);
  }

  const avsResult = await fetchFromAviationStack(flightCode, isoDate);
  if (avsResult.success) {
    _cache.set(cacheKey, { data: avsResult, ts: Date.now() });
    return avsResult;
  }

  console.warn(
    `[flightData] AviationStack failed for ${flightCode}: ${avsResult.error}. Trying OpenSky...`,
  );

  const osResult = await fetchFromOpenSky(flightCode, isoDate);
  if (osResult.success) {
    _cache.set(cacheKey, { data: osResult, ts: Date.now() });
    return osResult;
  }

  console.error(
    `[flightData] All providers failed for ${flightCode}. AviationStack: ${avsResult.error} | OpenSky: ${osResult.error}`,
  );

  return { success: false, error: "All providers unavailable" };
}
