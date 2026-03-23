import { describe, it, expect } from "vitest";
import { parseFlightsFromText } from "@/lib/importFlights";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("parseFlightsFromText", () => {
  it("parses a typical confirmation email with flightCode, airports, date, and time → confidence: high", () => {
    const text = `
      Thank you for your booking!
      Flight: AA900
      From: JFK  To: MIA
      Date: 2026-03-22
      Departure: 14:30
    `;

    const result = parseFlightsFromText(text);

    expect(result.flights).toHaveLength(1);
    const flight = result.flights[0];
    expect(flight.flightCode).toBe("AA 900");
    expect(flight.airlineCode).toBe("AA");
    expect(flight.originCode).toBe("JFK");
    expect(flight.destinationCode).toBe("MIA");
    expect(flight.isoDate).toBe("2026-03-22");
    expect(flight.departureTime).toBe("14:30");
    expect(flight.confidence).toBe("high");
  });

  it("parses compact table format 'AA900 JFK MIA 22MAR2026 14:30'", () => {
    const text = "AA900 JFK MIA 22MAR2026 14:30";

    const result = parseFlightsFromText(text);

    expect(result.flights).toHaveLength(1);
    const flight = result.flights[0];
    expect(flight.flightCode).toBe("AA 900");
    expect(flight.originCode).toBe("JFK");
    expect(flight.destinationCode).toBe("MIA");
    expect(flight.isoDate).toBe("2026-03-22");
    expect(flight.departureTime).toBe("14:30");
  });

  it("returns confidence: medium and departureTime: '' when no time is present", () => {
    const text = `
      Flight AA900 from JFK to MIA on 2026-03-22.
      No departure time provided.
    `;

    const result = parseFlightsFromText(text);

    expect(result.flights).toHaveLength(1);
    const flight = result.flights[0];
    expect(flight.confidence).toBe("medium");
    expect(flight.departureTime).toBe("");
  });

  it("converts AM/PM time '2:30 PM' to 24-hour '14:30'", () => {
    const text = `
      Flight DL400 JFK LAX 2026-04-10 2:30 PM
    `;

    const result = parseFlightsFromText(text);

    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].departureTime).toBe("14:30");
  });

  it("parses date in '29 March 2026' format → isoDate: '2026-03-29'", () => {
    const text = `
      United Airlines UA500
      Departure airport: EWR  Arrival: LAX
      Date: 29 March 2026
      Time: 08:00
    `;

    const result = parseFlightsFromText(text);

    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].isoDate).toBe("2026-03-29");
  });

  it("parses date in DD/MM/YYYY format '13/03/2026' → isoDate: '2026-03-13'", () => {
    const text = `
      LA800 EZE MIA
      Fecha: 13/03/2026
      Hora salida: 20:30
    `;

    const result = parseFlightsFromText(text);

    expect(result.flights).toHaveLength(1);
    expect(result.flights[0].isoDate).toBe("2026-03-13");
  });

  it("adds flight to unresolved when airport code is not in AIRPORTS dict", () => {
    // XYZ is not a real IATA code in the AIRPORTS dict
    const text = `
      AA900 XYZ ABC 2026-03-22 14:30
    `;

    const result = parseFlightsFromText(text);

    // No valid airports found → flight goes to unresolved
    expect(result.flights).toHaveLength(0);
    expect(result.unresolved).toContain("AA900");
  });

  it("deduplicates flights that appear multiple times in the same text", () => {
    const text = `
      Your itinerary:
      Flight AA900 JFK MIA 2026-03-22 14:30
      Confirmation: AA900 JFK MIA 2026-03-22 14:30
      Summary: AA900 JFK MIA 2026-03-22 14:30
    `;

    const result = parseFlightsFromText(text);

    expect(result.flights).toHaveLength(1);
  });

  it("detects multiple different flights in the same text", () => {
    const text = `
      Segment 1: AA900 JFK MIA 2026-03-22 14:30
      Segment 2: UA500 ORD LAX 2026-03-23 08:00
    `;

    const result = parseFlightsFromText(text);

    expect(result.flights).toHaveLength(2);
    const codes = result.flights.map((f) => f.flightCode);
    expect(codes).toContain("AA 900");
    expect(codes).toContain("UA 500");
  });

  it("returns flights: [] and unresolved: [] for empty text", () => {
    const result = parseFlightsFromText("");

    expect(result.flights).toEqual([]);
    expect(result.unresolved).toEqual([]);
  });
});
