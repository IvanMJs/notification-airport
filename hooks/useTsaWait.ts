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

export function useTsaWait() {
  const [data, setData] = useState<Record<string, TsaAirportData>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function load() {
      if (_tsaCache && Date.now() - _tsaCache.ts < TSA_TTL) {
        if (mounted.current) setData(_tsaCache.data);
        return;
      }
      try {
        const res = await fetch("/api/tsa-wait");
        if (!res.ok) return;
        const text = await res.text();
        if (!text.trim().startsWith("<")) return; // got JSON error
        const parsed = parseTsaXml(text);
        _tsaCache = { data: parsed, ts: Date.now() };
        if (mounted.current) setData(parsed);
      } catch {
        // silent fail
      }
    }

    load();
    return () => { mounted.current = false; };
  }, []);

  return data;
}
