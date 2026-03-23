import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectGateChanges } from "@/lib/gateChangeDetection";
import type { TripFlight } from "@/lib/types";
import type { StoredGateInfo } from "@/lib/gateChangeDetection";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFlight(overrides: Partial<TripFlight> & Pick<TripFlight, "flightCode" | "isoDate">): TripFlight {
  return {
    id: "f1",
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

function makeAeroResponse(gate: string | null): Response {
  const body = gate !== null
    ? JSON.stringify([{ departure: { gate } }])
    : JSON.stringify([{ departure: {} }]);
  return new Response(body, { status: 200 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("detectGateChanges", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty array when no flights are provided", async () => {
    const getStoredGate = vi.fn();
    const updateStoredGate = vi.fn();

    const result = await detectGateChanges([], getStoredGate, updateStoredGate, "api-key");

    expect(result).toEqual([]);
    expect(getStoredGate).not.toHaveBeenCalled();
    expect(updateStoredGate).not.toHaveBeenCalled();
  });

  it("detects a gate change when stored gate differs from live gate", async () => {
    const flight = makeFlight({ flightCode: "AA100", isoDate: "2026-06-15" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeAeroResponse("B12")));

    const stored: StoredGateInfo = {
      flightNumber: "AA100",
      isoDate: "2026-06-15",
      gate: "A5",
      checkedAt: "2026-06-14T10:00:00.000Z",
    };
    const getStoredGate = vi.fn().mockReturnValue(stored);
    const updateStoredGate = vi.fn();

    const result = await detectGateChanges([flight], getStoredGate, updateStoredGate, "api-key");

    expect(result).toHaveLength(1);
    expect(result[0].flightNumber).toBe("AA100");
    expect(result[0].oldGate).toBe("A5");
    expect(result[0].newGate).toBe("B12");
    expect(updateStoredGate).toHaveBeenCalledOnce();
  });

  it("emits no event when the gate is unchanged", async () => {
    const flight = makeFlight({ flightCode: "DL300", isoDate: "2026-06-15" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeAeroResponse("C7")));

    const stored: StoredGateInfo = {
      flightNumber: "DL300",
      isoDate: "2026-06-15",
      gate: "C7",
      checkedAt: "2026-06-14T10:00:00.000Z",
    };
    const getStoredGate = vi.fn().mockReturnValue(stored);
    const updateStoredGate = vi.fn();

    const result = await detectGateChanges([flight], getStoredGate, updateStoredGate, "api-key");

    expect(result).toHaveLength(0);
    expect(updateStoredGate).not.toHaveBeenCalled();
  });

  it("stores gate without emitting an event when flight is first seen", async () => {
    const flight = makeFlight({ flightCode: "UA500", isoDate: "2026-06-15" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeAeroResponse("D3")));

    const getStoredGate = vi.fn().mockReturnValue(null);
    const updateStoredGate = vi.fn();

    const result = await detectGateChanges([flight], getStoredGate, updateStoredGate, "api-key");

    expect(result).toHaveLength(0);
    expect(updateStoredGate).toHaveBeenCalledOnce();
    expect(updateStoredGate).toHaveBeenCalledWith(
      expect.objectContaining({ flightNumber: "UA500", gate: "D3" }),
    );
  });

  it("handles AeroDataBox fetch failure gracefully via Promise.allSettled", async () => {
    const flight = makeFlight({ flightCode: "WN200", isoDate: "2026-06-15" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const getStoredGate = vi.fn();
    const updateStoredGate = vi.fn();

    const result = await detectGateChanges([flight], getStoredGate, updateStoredGate, "api-key");

    expect(result).toEqual([]);
    expect(updateStoredGate).not.toHaveBeenCalled();
  });

  it("handles non-OK HTTP response gracefully (returns null gate)", async () => {
    const flight = makeFlight({ flightCode: "B6400", isoDate: "2026-06-15" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

    const getStoredGate = vi.fn();
    const updateStoredGate = vi.fn();

    const result = await detectGateChanges([flight], getStoredGate, updateStoredGate, "api-key");

    expect(result).toEqual([]);
    expect(updateStoredGate).not.toHaveBeenCalled();
  });

  it("processes multiple flights and returns only changed gates", async () => {
    const flight1 = makeFlight({ id: "f1", flightCode: "AA100", isoDate: "2026-06-15" });
    const flight2 = makeFlight({ id: "f2", flightCode: "DL300", isoDate: "2026-06-15" });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeAeroResponse("Z9"))   // AA100 — gate changed
      .mockResolvedValueOnce(makeAeroResponse("C7"));  // DL300 — gate unchanged

    vi.stubGlobal("fetch", fetchMock);

    const storedAA: StoredGateInfo = { flightNumber: "AA100", isoDate: "2026-06-15", gate: "A1", checkedAt: "" };
    const storedDL: StoredGateInfo = { flightNumber: "DL300", isoDate: "2026-06-15", gate: "C7", checkedAt: "" };

    const getStoredGate = vi.fn((code: string) =>
      code === "AA100" ? storedAA : storedDL,
    );
    const updateStoredGate = vi.fn();

    const result = await detectGateChanges([flight1, flight2], getStoredGate, updateStoredGate, "api-key");

    expect(result).toHaveLength(1);
    expect(result[0].flightNumber).toBe("AA100");
    expect(result[0].oldGate).toBe("A1");
    expect(result[0].newGate).toBe("Z9");
  });

  it("does not call updateStoredGate when the live gate is null", async () => {
    const flight = makeFlight({ flightCode: "F9100", isoDate: "2026-06-15" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeAeroResponse(null)));

    const getStoredGate = vi.fn().mockReturnValue(null);
    const updateStoredGate = vi.fn();

    const result = await detectGateChanges([flight], getStoredGate, updateStoredGate, "api-key");

    expect(result).toEqual([]);
    expect(updateStoredGate).not.toHaveBeenCalled();
  });
});
