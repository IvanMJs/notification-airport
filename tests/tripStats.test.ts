import { describe, it, expect } from "vitest";
import { computeTripStats } from "@/lib/tripStats";
import type { TripTab, TripFlight } from "@/lib/types";

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
    ...overrides,
  };
}

function makeTrip(flights: TripFlight[], name = "Test Trip"): TripTab {
  return { id: "t1", name, flights, accommodations: [] };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("computeTripStats", () => {
  it("returns all zeros and nulls for an empty flights array", () => {
    const result = computeTripStats(makeTrip([]));

    expect(result.totalFlights).toBe(0);
    expect(result.totalDistanceKm).toBe(0);
    expect(result.totalDurationHours).toBe(0);
    expect(result.co2Kg).toBe(0);
    expect(result.countriesVisited).toEqual([]);
    expect(result.airportsVisited).toEqual([]);
    expect(result.mostUsedAirline).toBeNull();
    expect(result.earliestFlight).toBeNull();
    expect(result.longestFlight).toBeNull();
  });

  it("returns totalFlights = 1 for a single flight", () => {
    const flight = makeFlight({ originCode: "ATL", destinationCode: "ORD" });
    const result = computeTripStats(makeTrip([flight]));

    expect(result.totalFlights).toBe(1);
  });

  it("computes a positive distance for a single domestic flight between known airports", () => {
    // ATL and ORD both have lat/lng in the AIRPORTS table
    const flight = makeFlight({ originCode: "ATL", destinationCode: "ORD" });
    const result = computeTripStats(makeTrip([flight]));

    expect(result.totalDistanceKm).toBeGreaterThan(0);
  });

  it("counts countries visited from all origin and destination airports", () => {
    // EZE is Argentina, GRU is Brazil, ATL is USA
    const flight1 = makeFlight({ id: "f1", originCode: "ATL", destinationCode: "EZE" });
    const flight2 = makeFlight({ id: "f2", originCode: "EZE", destinationCode: "GRU" });
    const result = computeTripStats(makeTrip([flight1, flight2]));

    expect(result.countriesVisited).toContain("Argentina");
    expect(result.countriesVisited).toContain("Brazil");
    expect(result.countriesVisited).toContain("United States");
    expect(result.countriesVisited.length).toBe(3);
  });

  it("returns co2Kg > 0 for any flight with known airport coordinates", () => {
    const flight = makeFlight({ originCode: "JFK", destinationCode: "LAX" });
    const result = computeTripStats(makeTrip([flight]));

    expect(result.co2Kg).toBeGreaterThan(0);
  });

  it("correctly identifies the longest flight by duration", () => {
    // JFK→LAX is ~4,500 km (long), ATL→ORD is ~1,100 km (short)
    const shortFlight = makeFlight({
      id: "f1",
      flightCode: "DL200",
      originCode: "ATL",
      destinationCode: "ORD",
      departureTime: "08:00",
    });
    const longFlight = makeFlight({
      id: "f2",
      flightCode: "AA300",
      originCode: "JFK",
      destinationCode: "LAX",
      departureTime: "10:00",
    });
    const result = computeTripStats(makeTrip([shortFlight, longFlight]));

    expect(result.longestFlight).not.toBeNull();
    expect(result.longestFlight!.flightCode).toBe("AA300");
    expect(result.longestFlight!.durationMin).toBeGreaterThan(0);
  });

  it("identifies the most used airline when multiple flights share the same carrier", () => {
    const flight1 = makeFlight({
      id: "f1",
      flightCode: "AA100",
      airlineName: "American Airlines",
      originCode: "ATL",
      destinationCode: "ORD",
    });
    const flight2 = makeFlight({
      id: "f2",
      flightCode: "AA200",
      airlineName: "American Airlines",
      originCode: "ORD",
      destinationCode: "LAX",
    });
    const flight3 = makeFlight({
      id: "f3",
      flightCode: "DL300",
      airlineName: "Delta Air Lines",
      airlineCode: "DL",
      originCode: "LAX",
      destinationCode: "JFK",
    });
    const result = computeTripStats(makeTrip([flight1, flight2, flight3]));

    expect(result.mostUsedAirline).toBe("American Airlines");
  });

  it("accumulates totalFlights correctly for multiple flights", () => {
    const flights = [
      makeFlight({ id: "f1", originCode: "ATL", destinationCode: "ORD" }),
      makeFlight({ id: "f2", originCode: "ORD", destinationCode: "LAX" }),
      makeFlight({ id: "f3", originCode: "LAX", destinationCode: "JFK" }),
    ];
    const result = computeTripStats(makeTrip(flights));

    expect(result.totalFlights).toBe(3);
  });

  it("includes all origin and destination codes in airportsVisited", () => {
    const flight = makeFlight({ originCode: "SFO", destinationCode: "DEN" });
    const result = computeTripStats(makeTrip([flight]));

    expect(result.airportsVisited).toContain("SFO");
    expect(result.airportsVisited).toContain("DEN");
  });
});
