import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { AIRPORTS } from "@/lib/airports";

export interface LiveFlightData {
  flightNumber: string;
  status: "scheduled" | "delayed" | "departed" | "landed" | "cancelled" | "unknown";
  departureGate: string | null;
  arrivalGate: string | null;
  scheduledDeparture: string | null; // ISO
  actualDeparture: string | null;    // ISO
  scheduledArrival: string | null;   // ISO
  actualArrival: string | null;      // ISO
  delayMinutes: number;
  terminal: string | null;
}

type AeroDataBoxFlight = {
  status?: string;
  departure?: {
    scheduledTimeLocal?: string;
    actualTimeLocal?: string;
    scheduledTimeUtc?: string;
    actualTimeUtc?: string;
    gate?: string;
    terminal?: { name?: string };
  };
  arrival?: {
    scheduledTimeLocal?: string;
    estimatedTimeLocal?: string;
    scheduledTimeUtc?: string;
    estimatedTimeUtc?: string;
    actualTimeUtc?: string;
    gate?: string;
  };
};

function normalizeStatus(raw: string | undefined): LiveFlightData["status"] {
  if (!raw) return "unknown";
  const s = raw.toLowerCase();
  if (s === "enroute" || s === "en route") return "departed";
  if (s === "landed") return "landed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "scheduled") return "scheduled";
  if (s === "delayed") return "delayed";
  return "unknown";
}

function computeDelayMinutes(flight: AeroDataBoxFlight): number {
  const scheduledUtc = flight.departure?.scheduledTimeUtc;
  const actualUtc = flight.departure?.actualTimeUtc;
  if (!scheduledUtc || !actualUtc) return 0;
  const diff = Math.round(
    (new Date(actualUtc).getTime() - new Date(scheduledUtc).getTime()) / 60000,
  );
  return diff > 0 ? diff : 0;
}

function toIso(local: string | undefined): string | null {
  if (!local) return null;
  // AeroDataBox returns "2026-03-29 14:30+00:00" — convert to ISO 8601
  return local.replace(" ", "T");
}

const EMPTY_RESPONSE = (flightNumber: string): LiveFlightData => ({
  flightNumber,
  status: "unknown",
  departureGate: null,
  arrivalGate: null,
  scheduledDeparture: null,
  actualDeparture: null,
  scheduledArrival: null,
  actualArrival: null,
  delayMinutes: 0,
  terminal: null,
});

// ── AviationStack fallback ────────────────────────────────────────────────

interface AviationStackFlight {
  flight_status?: string;
  departure?: {
    delay?: number;
    scheduled?: string;
    estimated?: string;
    actual?: string;
    gate?: string;
    terminal?: string;
  };
  arrival?: {
    estimated?: string;
    actual?: string;
    gate?: string;
  };
}

function normalizeAvsStatus(raw: string | undefined): LiveFlightData["status"] {
  switch (raw) {
    case "active":    return "departed";
    case "landed":    return "landed";
    case "cancelled": return "cancelled";
    case "scheduled": return "scheduled";
    default:          return "unknown";
  }
}

async function fetchFromAviationStack(
  flight: string,
  date: string,
): Promise<LiveFlightData | null> {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({
      access_key: apiKey,
      flight_iata: flight,
      flight_date: date,
      limit: "1",
    });
    const res = await fetch(`http://api.aviationstack.com/v1/flights?${params}`, {
      next: { revalidate: 180 },
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: AviationStackFlight[] };
    const raw = json.data?.[0];
    if (!raw) return null;

    const delayMinutes = typeof raw.departure?.delay === "number" ? raw.departure.delay : 0;
    const rawStatus = normalizeAvsStatus(raw.flight_status);
    const status: LiveFlightData["status"] =
      rawStatus === "scheduled" && delayMinutes > 0 ? "delayed" : rawStatus;

    return {
      flightNumber: flight,
      status,
      departureGate: raw.departure?.gate ?? null,
      arrivalGate: raw.arrival?.gate ?? null,
      scheduledDeparture: raw.departure?.scheduled ?? null,
      actualDeparture: raw.departure?.actual ?? raw.departure?.estimated ?? null,
      scheduledArrival: null,
      actualArrival: raw.arrival?.actual ?? raw.arrival?.estimated ?? null,
      delayMinutes,
      terminal: raw.departure?.terminal ?? null,
    };
  } catch {
    return null;
  }
}

// ── OpenSky Network fallback ──────────────────────────────────────────────

async function fetchFromOpenSky(
  flightCode: string,
  isoDate: string,
  originIcao: string,
  scheduledDepTime: string | null,
): Promise<LiveFlightData | null> {
  try {
    const dayStart = Math.floor(new Date(isoDate + "T00:00:00Z").getTime() / 1000);
    const dayEnd = dayStart + 86400;
    const res = await fetch(
      `https://opensky-network.org/api/flights/departure?airport=${originIcao}&begin=${dayStart}&end=${dayEnd}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const flights: Array<{ callsign: string; firstSeen: number }> = await res.json();
    // OpenSky callsigns are ICAO designator + number (e.g. AAL123 for AA123)
    // Match by numeric suffix of our flight code
    const numericSuffix = flightCode.replace(/^[A-Z]+/, "");
    const match = flights.find((f) => f.callsign?.trim().endsWith(numericSuffix));
    if (!match) return null;

    let delayMinutes = 0;
    if (scheduledDepTime) {
      const [h, m] = scheduledDepTime.split(":").map(Number);
      const scheduledUnix = dayStart + h * 3600 + m * 60;
      delayMinutes = Math.max(0, Math.round((match.firstSeen - scheduledUnix) / 60));
    }

    const actualDeparture = new Date(match.firstSeen * 1000).toISOString();

    return {
      flightNumber: flightCode,
      status: "departed",
      departureGate: null,
      arrivalGate: null,
      scheduledDeparture: null,
      actualDeparture,
      scheduledArrival: null,
      actualArrival: null,
      delayMinutes,
      terminal: null,
    };
  } catch {
    return null;
  }
}

// Cache TTL: 3 hours for active flights, 6 hours for landed/cancelled
const CACHE_TTL_ACTIVE_MS  = 3 * 60 * 60 * 1000;
const CACHE_TTL_SETTLED_MS = 6 * 60 * 60 * 1000;

const SETTLED_STATUSES: LiveFlightData["status"][] = ["landed", "cancelled"];

async function getCached(
  supabase: Awaited<ReturnType<typeof createClient>>,
  flightKey: string,
  isoDate: string,
): Promise<LiveFlightData | null> {
  const { data } = await supabase
    .from("flight_live_cache")
    .select("data, fetched_at")
    .eq("flight_key", flightKey)
    .eq("iso_date", isoDate)
    .single();

  if (!data) return null;

  const ageMs = Date.now() - new Date(data.fetched_at as string).getTime();
  const cached = data.data as LiveFlightData;
  const ttl = SETTLED_STATUSES.includes(cached.status) ? CACHE_TTL_SETTLED_MS : CACHE_TTL_ACTIVE_MS;

  return ageMs < ttl ? cached : null;
}

async function setCached(
  supabase: Awaited<ReturnType<typeof createClient>>,
  flightKey: string,
  isoDate: string,
  liveData: LiveFlightData,
): Promise<void> {
  await supabase
    .from("flight_live_cache")
    .upsert({ flight_key: flightKey, iso_date: isoDate, data: liveData, fetched_at: new Date().toISOString() });
}

// ── Handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkUserRateLimit(supabase, user.id, "flight-live", 20))) {
    return rateLimitResponse();
  }

  const { searchParams } = new URL(request.url);
  const flight = searchParams.get("flight") ?? searchParams.get("code");
  const date = searchParams.get("date");

  if (!flight || !date) {
    return NextResponse.json({ error: "Missing flight or date" }, { status: 400 });
  }

  // ── Shared cache (Supabase) — checked before any external API call ────
  const cached = await getCached(supabase, flight, date);
  if (cached) {
    return NextResponse.json<LiveFlightData>(cached);
  }

  // ── Try AeroDataBox first ─────────────────────────────────────────────
  const apiKey = process.env.AERODATABOX_RAPIDAPI_KEY;
  if (apiKey) {
    try {
      const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flight)}/${encodeURIComponent(date)}`;
      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
        },
        next: { revalidate: 180 },
      });

      if (res.ok) {
        const raw: unknown = await res.json();
        const flights = Array.isArray(raw) ? raw : [];
        const flightData = flights[0] as AeroDataBoxFlight | undefined;

        if (flightData) {
          const rawStatus = normalizeStatus(flightData.status);
          const delayMinutes = computeDelayMinutes(flightData);
          const status: LiveFlightData["status"] =
            rawStatus === "scheduled" && delayMinutes > 0 ? "delayed" : rawStatus;

          const result: LiveFlightData = {
            flightNumber: flight,
            status,
            departureGate: flightData.departure?.gate ?? null,
            arrivalGate: flightData.arrival?.gate ?? null,
            scheduledDeparture: toIso(flightData.departure?.scheduledTimeUtc),
            actualDeparture: toIso(flightData.departure?.actualTimeUtc),
            scheduledArrival: toIso(flightData.arrival?.scheduledTimeUtc),
            actualArrival: toIso(flightData.arrival?.actualTimeUtc ?? flightData.arrival?.estimatedTimeUtc),
            delayMinutes,
            terminal: flightData.departure?.terminal?.name ?? null,
          };

          await setCached(supabase, flight, date, result);
          return NextResponse.json<LiveFlightData>(result);
        }
      }
    } catch {
      // fall through to AviationStack
    }
  }

  // ── Fallback: AviationStack ───────────────────────────────────────────
  const avsData = await fetchFromAviationStack(flight, date);
  if (avsData) {
    await setCached(supabase, flight, date, avsData);
    return NextResponse.json<LiveFlightData>(avsData);
  }

  // Fallback 3: OpenSky Network (free, no key required)
  const originParam = searchParams.get("origin");
  if (originParam) {
    const icao = AIRPORTS[originParam]?.icao ?? null;
    const schedDep = searchParams.get("scheduledDep");
    if (icao) {
      const openSkyData = await fetchFromOpenSky(flight, date, icao, schedDep);
      if (openSkyData) {
        await setCached(supabase, flight, date, openSkyData);
        return NextResponse.json<LiveFlightData>(openSkyData);
      }
    }
  }

  return NextResponse.json<LiveFlightData>(EMPTY_RESPONSE(flight));
}
