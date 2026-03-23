import { AIRPORTS } from "@/lib/airports";
import type { TripFlight } from "@/lib/types";

// ── Public result type ────────────────────────────────────────────────────────

export interface CarbonResult {
  /** Total CO₂ across all flights, in kg */
  totalKg: number;
  /** CO₂ per flight keyed by flight code (e.g. "AA900") */
  perFlightKg: Record<string, number>;
  /** Estimated offset cost in USD (~$15 / tonne) */
  offsetCostUSD: number;
  /** Trees required to offset in one year (1 tree absorbs ~21 kg CO₂/year) */
  trees: number;
  comparison: {
    /** Equivalent distance driven by an average car */
    drivingKm: number;
    label: string;
  };
}

// ── Haversine distance ────────────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Emission factors (kg CO₂/km/passenger) ───────────────────────────────────
// Source: ICAO Carbon Emissions Calculator methodology

const EMISSION_FACTORS: Record<
  "economy" | "premium_economy" | "business" | "first",
  number
> = {
  economy:         0.115,
  premium_economy: 0.173,
  business:        0.230,
  first:           0.345,
};

// ── calculateFlightCO2 ────────────────────────────────────────────────────────

export function calculateFlightCO2(
  originCode: string,
  destinationCode: string,
  cabinClass: "economy" | "premium_economy" | "business" | "first",
): { distanceKm: number; co2Kg: number } | null {
  const origin = AIRPORTS[originCode];
  const dest   = AIRPORTS[destinationCode];

  if (!origin || !dest) return null;

  const distanceKm = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
  const co2Kg = distanceKm * EMISSION_FACTORS[cabinClass];

  return { distanceKm: Math.round(distanceKm), co2Kg: Math.round(co2Kg) };
}

// ── calculateTripCO2 ──────────────────────────────────────────────────────────

export function calculateTripCO2(
  flights: Array<{
    originCode: string;
    destinationCode: string;
    cabinClass?: string;
  }>,
): { totalCo2Kg: number; perFlight: Array<{ co2Kg: number; distanceKm: number }> } {
  let totalCo2Kg = 0;
  const perFlight: Array<{ co2Kg: number; distanceKm: number }> = [];

  for (const f of flights) {
    const cabin = (
      f.cabinClass === "economy" ||
      f.cabinClass === "premium_economy" ||
      f.cabinClass === "business" ||
      f.cabinClass === "first"
    ) ? f.cabinClass : "economy";

    const result = calculateFlightCO2(f.originCode, f.destinationCode, cabin);
    if (result) {
      totalCo2Kg += result.co2Kg;
      perFlight.push(result);
    } else {
      perFlight.push({ co2Kg: 0, distanceKm: 0 });
    }
  }

  return { totalCo2Kg: Math.round(totalCo2Kg), perFlight };
}

// ── calculateCarbonFootprint ──────────────────────────────────────────────────
// Average car emits ~0.21 kg CO₂/km (EU mixed fleet, ICCT 2023)

const KG_CO2_PER_CAR_KM = 0.21;
const USD_PER_TONNE     = 15;
const KG_CO2_PER_TREE   = 21; // kg absorbed per tree per year

export function calculateCarbonFootprint(flights: TripFlight[]): CarbonResult {
  const perFlightKg: Record<string, number> = {};
  let totalKg = 0;

  for (const f of flights) {
    const cabin = (
      f.cabinClass === "economy" ||
      f.cabinClass === "premium_economy" ||
      f.cabinClass === "business" ||
      f.cabinClass === "first"
    ) ? f.cabinClass : "economy";

    const result = calculateFlightCO2(f.originCode, f.destinationCode, cabin);
    const kg = result?.co2Kg ?? 0;
    perFlightKg[f.flightCode] = kg;
    totalKg += kg;
  }

  totalKg = Math.round(totalKg);

  const offsetCostUSD = parseFloat(((totalKg / 1000) * USD_PER_TONNE).toFixed(2));
  const trees         = Math.ceil(totalKg / KG_CO2_PER_TREE);
  const drivingKm     = Math.round(totalKg / KG_CO2_PER_CAR_KM);

  return {
    totalKg,
    perFlightKg,
    offsetCostUSD,
    trees,
    comparison: {
      drivingKm,
      label: `equivalent to driving ${drivingKm.toLocaleString()} km`,
    },
  };
}
