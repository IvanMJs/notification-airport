import { AirportStatusMap } from "@/lib/types";

// ── Storage keys ──────────────────────────────────────────────────────────────

const KEYS = {
  airportStatus: "tc-offline-airports",
  lastSync: "tc-offline-last-sync",
} as const;

// TTLs
const AIRPORT_STATUS_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ── Serialised envelope ───────────────────────────────────────────────────────

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
}

function safeGet<T>(key: string): CacheEnvelope<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (typeof parsed.timestamp !== "number" || parsed.data === undefined) return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeSet<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: CacheEnvelope<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // localStorage may be unavailable (private mode, quota exceeded) — fail silently.
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const offlineCache = {
  /** Persist airport status map for offline access. */
  saveAirportStatus(statusMap: AirportStatusMap): void {
    safeSet<AirportStatusMap>(KEYS.airportStatus, statusMap);
  },

  /**
   * Load cached airport status map.
   * Returns null if cache is absent or expired (> 15 min).
   */
  loadAirportStatus(): AirportStatusMap | null {
    const entry = safeGet<AirportStatusMap>(KEYS.airportStatus);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > AIRPORT_STATUS_TTL_MS) return null;
    return entry.data;
  },

  /** Record the timestamp of the last successful data sync. */
  setLastSync(date: Date): void {
    safeSet<number>(KEYS.lastSync, date.getTime());
  },

  /** Retrieve the last successful sync time, or null if never recorded. */
  getLastSync(): Date | null {
    const entry = safeGet<number>(KEYS.lastSync);
    if (!entry) return null;
    return new Date(entry.data);
  },

  /** Remove all offline cache entries written by this module. */
  clearAll(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(KEYS.airportStatus);
      localStorage.removeItem(KEYS.lastSync);
    } catch {
      // fail silently
    }
  },
};
