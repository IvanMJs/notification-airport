import type { SupabaseClient } from "@supabase/supabase-js";

export interface PriceAlert {
  id: string;
  tripId: string;
  flightNumber: string;
  isoDate: string;
  origin: string;
  destination: string;
  targetPriceUSD: number;
  currentPriceUSD: number | null;
  lastCheckedAt: string | null;
  triggered: boolean;
  createdAt: string;
}

interface DbPriceAlert {
  id: string;
  trip_id: string;
  flight_number: string;
  iso_date: string;
  origin: string;
  destination: string;
  target_price_usd: number;
  current_price_usd: number | null;
  last_checked_at: string | null;
  triggered: boolean;
  created_at: string;
}

function toPriceAlert(row: DbPriceAlert): PriceAlert {
  return {
    id:             row.id,
    tripId:         row.trip_id,
    flightNumber:   row.flight_number,
    isoDate:        row.iso_date,
    origin:         row.origin,
    destination:    row.destination,
    targetPriceUSD: row.target_price_usd,
    currentPriceUSD: row.current_price_usd,
    lastCheckedAt:  row.last_checked_at,
    triggered:      row.triggered,
    createdAt:      row.created_at,
  };
}

/**
 * Create a new price alert in the price_alerts table.
 * Returns the created alert or null if the insert failed.
 */
export async function createPriceAlert(
  supabase: SupabaseClient,
  alert: Omit<PriceAlert, "id" | "currentPriceUSD" | "lastCheckedAt" | "triggered" | "createdAt">
): Promise<PriceAlert | null> {
  const { data, error } = await supabase
    .from("price_alerts")
    .insert({
      trip_id:          alert.tripId,
      flight_number:    alert.flightNumber,
      iso_date:         alert.isoDate,
      origin:           alert.origin,
      destination:      alert.destination,
      target_price_usd: alert.targetPriceUSD,
      current_price_usd: null,
      last_checked_at:  null,
      triggered:        false,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return toPriceAlert(data as DbPriceAlert);
}

/**
 * Fetch all price alerts for a given trip, ordered newest first.
 */
export async function getTripPriceAlerts(
  supabase: SupabaseClient,
  tripId: string
): Promise<PriceAlert[]> {
  const { data, error } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as DbPriceAlert[]).map(toPriceAlert);
}

/**
 * Delete a price alert by ID.
 */
export async function deletePriceAlert(
  supabase: SupabaseClient,
  alertId: string
): Promise<void> {
  await supabase.from("price_alerts").delete().eq("id", alertId);
}

/**
 * Returns true when the current price is known and falls below the target price.
 */
export function shouldTriggerAlert(alert: PriceAlert): boolean {
  if (alert.currentPriceUSD === null) return false;
  return alert.currentPriceUSD < alert.targetPriceUSD;
}
