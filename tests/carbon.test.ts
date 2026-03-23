import { describe, it, expect } from "vitest";
import { calculateCarbonFootprint } from "@/lib/carbon";
import type { TripFlight } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFlight(overrides: Partial<TripFlight> & Pick<TripFlight, "originCode" | "destinationCode">): TripFlight {
  return {
    id: "f1",
    flightCode: "AA100",
    airlineCode: "AA",
    airlineName: "American Airlines",
    airlineIcao: "AAL",
    flightNumber: "100",
    isoDate: "2026-06-15",
    departureTime: "10:00",
    arrivalBuffer: 2,
    cabinClass: "economy",
    ...overrides,
  };
}

// ATL → LAX (cross-country, ~3,100 km) — both in the AIRPORTS table
const ATL_TO_LAX = makeFlight({ originCode: "ATL", destinationCode: "LAX" });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("calculateCarbonFootprint", () => {
  it("returns zero totals for an empty flight list", () => {
    const result = calculateCarbonFootprint([]);

    expect(result.totalKg).toBe(0);
    expect(result.offsetCostUSD).toBe(0);
    expect(result.trees).toBe(0);
    expect(result.perFlightKg).toEqual({});
  });

  it("produces a positive totalKg for a known route", () => {
    const result = calculateCarbonFootprint([ATL_TO_LAX]);

    expect(result.totalKg).toBeGreaterThan(0);
  });

  it("economy class produces lower CO2 than business class for the same route", () => {
    const economy = makeFlight({ id: "f1", flightCode: "AA100", originCode: "JFK", destinationCode: "LAX", cabinClass: "economy" });
    const business = makeFlight({ id: "f2", flightCode: "AA200", originCode: "JFK", destinationCode: "LAX", cabinClass: "business" });

    const eResult = calculateCarbonFootprint([economy]);
    const bResult = calculateCarbonFootprint([business]);

    expect(eResult.totalKg).toBeLessThan(bResult.totalKg);
  });

  it("offsetCostUSD equals totalKg / 1000 * 15 (rounded to 2 decimals)", () => {
    const result = calculateCarbonFootprint([ATL_TO_LAX]);

    const expected = parseFloat(((result.totalKg / 1000) * 15).toFixed(2));
    expect(result.offsetCostUSD).toBe(expected);
  });

  it("trees equals Math.ceil(totalKg / 21)", () => {
    const result = calculateCarbonFootprint([ATL_TO_LAX]);

    expect(result.trees).toBe(Math.ceil(result.totalKg / 21));
  });

  it("perFlightKg has an entry for each flight keyed by flightCode", () => {
    const f1 = makeFlight({ id: "f1", flightCode: "AA100", originCode: "ATL", destinationCode: "LAX" });
    const f2 = makeFlight({ id: "f2", flightCode: "DL300", originCode: "JFK", destinationCode: "ORD" });

    const result = calculateCarbonFootprint([f1, f2]);

    expect(Object.keys(result.perFlightKg)).toContain("AA100");
    expect(Object.keys(result.perFlightKg)).toContain("DL300");
    expect(result.perFlightKg["AA100"]).toBeGreaterThan(0);
    expect(result.perFlightKg["DL300"]).toBeGreaterThan(0);
  });

  it("totalKg equals the sum of all perFlightKg values", () => {
    const f1 = makeFlight({ id: "f1", flightCode: "AA100", originCode: "ATL", destinationCode: "LAX" });
    const f2 = makeFlight({ id: "f2", flightCode: "DL300", originCode: "JFK", destinationCode: "ORD" });

    const result = calculateCarbonFootprint([f1, f2]);

    const sumFromPer = Object.values(result.perFlightKg).reduce((acc, kg) => acc + kg, 0);
    // totalKg is Math.round(sum) — values may differ by at most 1 due to rounding
    expect(Math.abs(result.totalKg - sumFromPer)).toBeLessThanOrEqual(1);
  });

  it("unknown airport codes produce 0 kg for that flight and are still keyed in perFlightKg", () => {
    const flight = makeFlight({ id: "f1", flightCode: "XX999", originCode: "ZZZ", destinationCode: "QQQ" });

    const result = calculateCarbonFootprint([flight]);

    expect(result.perFlightKg["XX999"]).toBe(0);
    expect(result.totalKg).toBe(0);
  });

  it("comparison.drivingKm equals Math.round(totalKg / 0.21)", () => {
    const result = calculateCarbonFootprint([ATL_TO_LAX]);

    const expected = Math.round(result.totalKg / 0.21);
    expect(result.comparison.drivingKm).toBe(expected);
  });
});
