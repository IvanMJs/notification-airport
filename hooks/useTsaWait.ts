"use client";

import { useRef, useState, useEffect } from "react";

export interface TsaCheckpoint {
  name:     string;
  waitTime: number;
  updated:  string;
}

export interface TsaAirportData {
  airportCode: string;
  checkpoints: TsaCheckpoint[];
  avgWaitTime: number;
}

export type TsaWaitLevel = "low" | "medium" | "high";

export interface TsaWaitResult {
  waitMinutes: number | null;
  level: TsaWaitLevel | null;
  updatedAt: string | null;
  loading: boolean;
}

let _tsaCache: { data: Record<string, TsaAirportData>; ts: number } | null = null;
const TSA_TTL = 10 * 60 * 1000;

// Robust regex-based XML parser (no DOM dependency)
function parseTsaXml(xml: string): Record<string, TsaAirportData> {
  const result: Record<string, TsaAirportData> = {};

  // Match any <*CheckPoint*> or <*Checkpoint*> block (TSA XML schema varies)
  const blockRe = /<[A-Za-z]*[Cc]heck[Pp]oint[A-Za-z]*>([\s\S]*?)<\/[A-Za-z]*[Cc]heck[Pp]oint[A-Za-z]*>/g;
  let m: RegExpExecArray | null;

  const get = (block: string, ...tags: string[]): string => {
    for (const tag of tags) {
      const r = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i").exec(block);
      if (r) return r[1].trim();
    }
    return "";
  };

  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[1];
    const code = get(block, "AirportCode", "Airport");
    if (!code || code.length !== 3) continue;

    const name     = get(block, "Terminal", "CheckpointName", "Name") || "Security";
    const waitStr  = get(block, "WaitTime", "CurrentWaitTime", "Wait");
    const waitTime = parseInt(waitStr, 10);
    if (isNaN(waitTime)) continue;
    const updated  = get(block, "WaitTimeUpdated", "LastUpdated", "Updated");

    if (!result[code]) result[code] = { airportCode: code, checkpoints: [], avgWaitTime: 0 };
    result[code].checkpoints.push({ name, waitTime, updated });
  }

  for (const code of Object.keys(result)) {
    const times = result[code].checkpoints.map(c => c.waitTime).filter(t => t >= 0);
    result[code].avgWaitTime = times.length
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;
  }

  return result;
}

function getLevelFromMinutes(minutes: number): TsaWaitLevel {
  if (minutes < 15) return "low";
  if (minutes <= 30) return "medium";
  return "high";
}

async function fetchTsaData(): Promise<Record<string, TsaAirportData>> {
  if (_tsaCache && Date.now() - _tsaCache.ts < TSA_TTL) {
    return _tsaCache.data;
  }
  const res = await fetch("/api/tsa-wait");
  if (!res.ok) throw new Error(`TSA fetch failed: ${res.status}`);
  const text = await res.text();
  if (!text.trim().startsWith("<")) throw new Error("TSA returned non-XML response");
  const parsed = parseTsaXml(text);
  _tsaCache = { data: parsed, ts: Date.now() };
  return parsed;
}

/**
 * Returns TSA wait time data for a specific US airport.
 * Only fetches if `enabled` is true.
 */
export function useTsaWait(airportIata: string, enabled = true): TsaWaitResult {
  const [result, setResult] = useState<TsaWaitResult>({
    waitMinutes: null,
    level: null,
    updatedAt: null,
    loading: false,
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    if (!enabled || !airportIata) {
      setResult({ waitMinutes: null, level: null, updatedAt: null, loading: false });
      return () => { mounted.current = false; };
    }

    setResult(prev => ({ ...prev, loading: true }));

    fetchTsaData()
      .then((data) => {
        if (!mounted.current) return;
        const airport = data[airportIata.toUpperCase()];
        if (!airport) {
          setResult({ waitMinutes: null, level: null, updatedAt: null, loading: false });
          return;
        }
        const waitMinutes = airport.avgWaitTime > 0 ? airport.avgWaitTime : null;
        const updatedAt = airport.checkpoints[0]?.updated ?? null;
        setResult({
          waitMinutes,
          level: waitMinutes !== null ? getLevelFromMinutes(waitMinutes) : null,
          updatedAt,
          loading: false,
        });
      })
      .catch(() => {
        if (mounted.current) {
          setResult({ waitMinutes: null, level: null, updatedAt: null, loading: false });
        }
      });

    return () => { mounted.current = false; };
  }, [airportIata, enabled]);

  return result;
}
