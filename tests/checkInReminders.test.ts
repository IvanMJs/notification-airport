import { describe, it, expect } from "vitest";
import { getCheckInReminders } from "@/lib/checkInReminders";
import type { TripTab, TripFlight } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFlight(overrides: Partial<TripFlight> & Pick<TripFlight, "isoDate">): TripFlight {
  return {
    id: "f1",
    flightCode: "AA100",
    airlineCode: "AA",
    airlineName: "American Airlines",
    airlineIcao: "AAL",
    flightNumber: "100",
    originCode: "JFK",
    destinationCode: "LAX",
    departureTime: "10:00",
    arrivalBuffer: 2,
    ...overrides,
  };
}

function makeTrip(overrides: Partial<TripTab> & { flights: TripFlight[] }): TripTab {
  return {
    id: "t1",
    name: "Test Trip",
    accommodations: [],
    ...overrides,
  };
}

const TARGET = "2026-06-15";
const OTHER_DATE = "2026-06-20";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getCheckInReminders", () => {
  it("returns empty array when no trips are provided", () => {
    const result = getCheckInReminders([], "user-1", TARGET);
    expect(result).toEqual([]);
  });

  it("returns empty array when no flights match the target date", () => {
    const trip = makeTrip({ flights: [makeFlight({ isoDate: OTHER_DATE })] });
    const result = getCheckInReminders([trip], "user-1", TARGET);
    expect(result).toEqual([]);
  });

  it("returns a reminder for a flight that matches the target date", () => {
    const flight = makeFlight({ isoDate: TARGET });
    const trip = makeTrip({ name: "My Trip", flights: [flight] });

    const result = getCheckInReminders([trip], "user-42", TARGET);

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("user-42");
    expect(result[0].flight).toBe(flight);
    expect(result[0].tripName).toBe("My Trip");
  });

  it("skips flights whose isoDate does not match the target date", () => {
    const matching = makeFlight({ id: "f1", flightCode: "AA100", isoDate: TARGET });
    const nonMatching = makeFlight({ id: "f2", flightCode: "UA200", isoDate: OTHER_DATE });
    const trip = makeTrip({ flights: [matching, nonMatching] });

    const result = getCheckInReminders([trip], "user-1", TARGET);

    expect(result).toHaveLength(1);
    expect(result[0].flight.flightCode).toBe("AA100");
  });

  it("handles multiple trips and collects matching flights from each", () => {
    const tripA = makeTrip({ id: "t1", name: "Trip A", flights: [makeFlight({ id: "f1", flightCode: "AA100", isoDate: TARGET })] });
    const tripB = makeTrip({ id: "t2", name: "Trip B", flights: [makeFlight({ id: "f2", flightCode: "DL300", isoDate: TARGET })] });
    const tripC = makeTrip({ id: "t3", name: "Trip C", flights: [makeFlight({ id: "f3", flightCode: "UA500", isoDate: OTHER_DATE })] });

    const result = getCheckInReminders([tripA, tripB, tripC], "user-1", TARGET);

    expect(result).toHaveLength(2);
    const codes = result.map((r) => r.flight.flightCode);
    expect(codes).toContain("AA100");
    expect(codes).toContain("DL300");
  });

  it("respects the custom targetDate override", () => {
    const flightOnTarget = makeFlight({ id: "f1", flightCode: "AA100", isoDate: "2026-07-04" });
    const flightOnOther = makeFlight({ id: "f2", flightCode: "DL300", isoDate: TARGET });
    const trip = makeTrip({ flights: [flightOnTarget, flightOnOther] });

    const result = getCheckInReminders([trip], "user-1", "2026-07-04");

    expect(result).toHaveLength(1);
    expect(result[0].flight.flightCode).toBe("AA100");
  });

  it("builds correct departureDateTime from departureTime and isoDate", () => {
    const flight = makeFlight({ isoDate: TARGET, departureTime: "14:30" });
    const trip = makeTrip({ flights: [flight] });

    const result = getCheckInReminders([trip], "user-1", TARGET);

    expect(result).toHaveLength(1);
    // 2026-06-15 14:30 UTC → ISO string
    expect(result[0].departureDateTime).toBe("2026-06-15T14:30:00.000Z");
  });

  it("falls back to midnight UTC when departureTime is missing", () => {
    const flight = makeFlight({ isoDate: TARGET, departureTime: "" });
    const trip = makeTrip({ flights: [flight] });

    const result = getCheckInReminders([trip], "user-1", TARGET);

    expect(result).toHaveLength(1);
    expect(result[0].departureDateTime).toBe("2026-06-15T00:00:00.000Z");
  });

  it("sorts results by departureTime ascending", () => {
    const late = makeFlight({ id: "f1", flightCode: "AA100", isoDate: TARGET, departureTime: "20:00" });
    const early = makeFlight({ id: "f2", flightCode: "DL300", isoDate: TARGET, departureTime: "06:00" });
    const mid = makeFlight({ id: "f3", flightCode: "UA500", isoDate: TARGET, departureTime: "13:00" });
    const trip = makeTrip({ flights: [late, early, mid] });

    const result = getCheckInReminders([trip], "user-1", TARGET);

    expect(result.map((r) => r.flight.departureTime)).toEqual(["06:00", "13:00", "20:00"]);
  });

  it("propagates userId to every reminder", () => {
    const trip = makeTrip({
      flights: [
        makeFlight({ id: "f1", flightCode: "AA100", isoDate: TARGET }),
        makeFlight({ id: "f2", flightCode: "DL300", isoDate: TARGET, departureTime: "15:00" }),
      ],
    });

    const result = getCheckInReminders([trip], "user-abc", TARGET);

    expect(result.every((r) => r.userId === "user-abc")).toBe(true);
  });

  it("returns empty array when trips have no flights at all", () => {
    const trip = makeTrip({ flights: [] });
    const result = getCheckInReminders([trip], "user-1", TARGET);
    expect(result).toEqual([]);
  });
});
