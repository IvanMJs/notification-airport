"use client";

import { useMemo } from "react";
import { TripTab } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

// ── Haversine distance ────────────────────────────────────────────────────────

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Duration helpers ──────────────────────────────────────────────────────────

function flightDurationMin(
  depTime: string,
  depDate: string,
  arrTime: string | undefined,
  arrDate: string | undefined,
  distKm: number,
): number {
  if (arrTime) {
    const [dh, dm] = depTime.split(":").map(Number);
    const [ah, am] = arrTime.split(":").map(Number);
    let depMin = dh * 60 + dm;
    let arrMin = ah * 60 + am;
    if (arrDate && arrDate !== depDate) {
      arrMin += 24 * 60;
    } else if (arrMin <= depMin) {
      arrMin += 24 * 60;
    }
    return arrMin - depMin;
  }
  if (distKm > 0) return Math.round((distKm / 850) * 60 + 30);
  return 240;
}

function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PersonalRecordsProps {
  trips: TripTab[];
  locale: "es" | "en";
}

interface RecordRow {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}

export function PersonalRecords({ trips, locale }: PersonalRecordsProps) {
  const records = useMemo<RecordRow[]>(() => {
    const allFlights = trips.flatMap((t) => t.flights);

    if (allFlights.length === 0) {
      return [];
    }

    // ── Longest flight ────────────────────────────────────────────────────────
    let longestMin = 0;
    let longestLabel = "";

    for (const f of allFlights) {
      if (!f.departureTime) continue;
      const originInfo = AIRPORTS[f.originCode];
      const destInfo = AIRPORTS[f.destinationCode];
      let distKm = 0;
      if (originInfo?.lat && destInfo?.lat) {
        distKm = haversineKm(originInfo.lat, originInfo.lng, destInfo.lat, destInfo.lng);
      }
      const dur = flightDurationMin(
        f.departureTime,
        f.isoDate,
        f.arrivalTime,
        f.arrivalDate,
        distKm,
      );
      if (dur > longestMin) {
        longestMin = dur;
        longestLabel = `${f.originCode} → ${f.destinationCode}`;
      }
    }

    // ── Most visited airport ──────────────────────────────────────────────────
    const visitCounts = new Map<string, number>();
    for (const f of allFlights) {
      visitCounts.set(f.originCode, (visitCounts.get(f.originCode) ?? 0) + 1);
      visitCounts.set(f.destinationCode, (visitCounts.get(f.destinationCode) ?? 0) + 1);
    }
    let topAirport = "";
    let topCount = 0;
    visitCounts.forEach((count, code) => {
      if (count > topCount) {
        topCount = count;
        topAirport = code;
      }
    });

    // ── Fastest successful connection ─────────────────────────────────────────
    // A successful connection: flightA.destination === flightB.origin, same or consecutive day
    let fastestConnectionMin: number | null = null;
    let fastestConnectionAirport = "";

    // Sort all flights by date + time to find consecutive pairs
    const sorted = [...allFlights].sort((a, b) =>
      a.isoDate.localeCompare(b.isoDate) ||
      (a.departureTime ?? "").localeCompare(b.departureTime ?? ""),
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.destinationCode !== b.originCode) continue;
      if (!a.departureTime || !b.departureTime) continue;

      // Estimate arrival of flight A
      const originA = AIRPORTS[a.originCode];
      const destA = AIRPORTS[a.destinationCode];
      let distA = 0;
      if (originA?.lat && destA?.lat) {
        distA = haversineKm(originA.lat, originA.lng, destA.lat, destA.lng);
      }
      const durA = flightDurationMin(a.departureTime, a.isoDate, a.arrivalTime, a.arrivalDate, distA);

      const [dh, dm] = a.departureTime.split(":").map(Number);
      const [bh, bm] = b.departureTime.split(":").map(Number);
      const depAMin = dh * 60 + dm;
      let depBMin = bh * 60 + bm;

      // Account for next-day departure
      if (b.isoDate > a.isoDate) {
        depBMin += 24 * 60;
      }

      const estimatedArrivalA = depAMin + durA;
      const connectionBuffer = depBMin - estimatedArrivalA;

      // Only count as a connection if buffer is positive (not a missed connection) and < 12h
      if (connectionBuffer > 0 && connectionBuffer < 720) {
        if (fastestConnectionMin === null || connectionBuffer < fastestConnectionMin) {
          fastestConnectionMin = connectionBuffer;
          fastestConnectionAirport = a.destinationCode;
        }
      }
    }

    const rows: RecordRow[] = [];

    if (longestMin > 0) {
      rows.push({
        icon: "✈️",
        label: locale === "es" ? "Vuelo más largo" : "Longest flight",
        value: formatDuration(longestMin),
        sub: longestLabel,
      });
    }

    if (topAirport) {
      rows.push({
        icon: "🏆",
        label: locale === "es" ? "Aeropuerto más visitado" : "Most visited airport",
        value: topAirport,
        sub: locale === "es" ? `${topCount} veces` : `${topCount} times`,
      });
    }

    if (fastestConnectionMin !== null && fastestConnectionAirport) {
      rows.push({
        icon: "⚡",
        label: locale === "es" ? "Conexión más rápida" : "Fastest connection",
        value: fastestConnectionAirport,
        sub: formatDuration(fastestConnectionMin),
      });
    }

    return rows;
  }, [trips, locale]);

  if (records.length === 0) return null;

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
          {locale === "es" ? "Records personales" : "Personal Records"}
        </p>
      </div>
      <div className="divide-y divide-white/[0.05]">
        {records.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-4 py-3">
            <span className="text-xl leading-none shrink-0" aria-hidden>
              {row.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium">{row.label}</p>
              {row.sub && (
                <p className="text-[10px] text-gray-600 truncate">{row.sub}</p>
              )}
            </div>
            <span className="text-sm font-black text-white tabular-nums shrink-0">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
