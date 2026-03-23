// Server-only utilities for trip sharing.
// This file uses next/headers — only import from Server Components or API routes.
import { createClient } from "@/utils/supabase/server";
import type { SharedTripData } from "./tripShare";

export async function getTripByShareToken(
  token: string,
): Promise<SharedTripData | null> {
  const supabase = await createClient();

  const { data: tokenRow, error: tokenErr } = await supabase
    .from("trip_share_tokens")
    .select("trip_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenErr || !tokenRow) return null;

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return null; // expired
  }

  const { data: trip, error: tripErr } = await supabase
    .from("trips")
    .select("id, name, flights(*), accommodations(*)")
    .eq("id", tokenRow.trip_id)
    .single();

  if (tripErr || !trip) return null;

  return trip as SharedTripData;
}
