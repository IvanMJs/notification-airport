"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { DEFAULT_AIRPORTS } from "@/lib/airports";

export function useWatchedAirports() {
  const [airports, setAirports] = useState<string[]>(DEFAULT_AIRPORTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data, error } = await supabase
        .from("watched_airports")
        .select("iata_code, sort_order")
        .order("sort_order", { ascending: true });

      if (!error && data && data.length > 0) {
        setAirports(data.map((r) => r.iata_code));
      } else if (!error && data && data.length === 0) {
        // No airports saved yet — seed defaults
        const rows = DEFAULT_AIRPORTS.map((iata, i) => ({ iata_code: iata, sort_order: i }));
        await supabase.from("watched_airports").insert(rows);
        setAirports(DEFAULT_AIRPORTS);
      }

      setLoading(false);
    }

    load();
  }, []);

  const add = useCallback(async (iata: string) => {
    setAirports((prev) => (prev.includes(iata) ? prev : [...prev, iata]));

    const supabase = createClient();
    const { data: last } = await supabase
      .from("watched_airports")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase
      .from("watched_airports")
      .insert({ iata_code: iata, sort_order: (last?.sort_order ?? -1) + 1 });
  }, []);

  const remove = useCallback(async (iata: string) => {
    setAirports((prev) => prev.filter((a) => a !== iata));

    const supabase = createClient();
    await supabase.from("watched_airports").delete().eq("iata_code", iata);
  }, []);

  return { airports, loading, add, remove };
}
