import { describe, it, expect } from "vitest";
import { generateItineraryHtml } from "@/lib/itineraryPdf";
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

function makeTrip(flights: TripFlight[], name = "Summer Vacation"): TripTab {
  return { id: "t1", name, flights, accommodations: [] };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("generateItineraryHtml", () => {
  it("returns a string", () => {
    const trip = makeTrip([makeFlight({ originCode: "ATL", destinationCode: "ORD" })]);
    const result = generateItineraryHtml({ trip, locale: "en" });

    expect(typeof result).toBe("string");
  });

  it("contains the trip name in the output", () => {
    const trip = makeTrip([], "My Europe Trip");
    const result = generateItineraryHtml({ trip, locale: "en" });

    expect(result).toContain("My Europe Trip");
  });

  it("contains the flight code for each flight", () => {
    const flights = [
      makeFlight({ id: "f1", flightCode: "UA500", originCode: "JFK", destinationCode: "LAX" }),
      makeFlight({ id: "f2", flightCode: "DL800", originCode: "LAX", destinationCode: "ORD" }),
    ];
    const result = generateItineraryHtml({ trip: makeTrip(flights), locale: "en" });

    expect(result).toContain("UA500");
    expect(result).toContain("DL800");
  });

  it("contains origin and destination airport codes for each flight", () => {
    const flight = makeFlight({ originCode: "EZE", destinationCode: "MIA" });
    const result = generateItineraryHtml({ trip: makeTrip([flight]), locale: "en" });

    expect(result).toContain("EZE");
    expect(result).toContain("MIA");
  });

  it("includes @media print styles in the output", () => {
    const trip = makeTrip([makeFlight({ originCode: "ATL", destinationCode: "ORD" })]);
    const result = generateItineraryHtml({ trip, locale: "en" });

    expect(result).toContain("@media print");
  });

  it("works correctly when the flights array is empty", () => {
    const trip = makeTrip([], "Empty Trip");
    const result = generateItineraryHtml({ trip, locale: "en" });

    expect(typeof result).toBe("string");
    expect(result).toContain("Empty Trip");
    // The flights count should show 0
    expect(result).toContain("Flights (0)");
  });

  it("outputs Spanish labels when locale is es", () => {
    const trip = makeTrip([makeFlight({ originCode: "EZE", destinationCode: "MIA" })], "Viaje de Prueba");
    const result = generateItineraryHtml({ trip, locale: "es" });

    expect(result).toContain("Itinerario de viaje");
    expect(result).toContain("Vuelos");
    expect(result).toContain("Alojamientos");
  });

  it("outputs English labels when locale is en", () => {
    const trip = makeTrip([makeFlight({ originCode: "ATL", destinationCode: "JFK" })], "Test Trip");
    const result = generateItineraryHtml({ trip, locale: "en" });

    expect(result).toContain("Travel Itinerary");
    expect(result).toContain("Flights");
    expect(result).toContain("Accommodations");
  });
});
