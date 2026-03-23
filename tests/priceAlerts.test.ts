import { describe, it, expect } from "vitest";
import { shouldTriggerAlert } from "@/lib/priceAlerts";
import type { PriceAlert } from "@/lib/priceAlerts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAlert(overrides: Partial<PriceAlert> = {}): PriceAlert {
  return {
    id: "alert-1",
    tripId: "trip-1",
    flightNumber: "AA100",
    isoDate: "2026-06-15",
    origin: "ATL",
    destination: "ORD",
    targetPriceUSD: 300,
    currentPriceUSD: null,
    lastCheckedAt: null,
    triggered: false,
    createdAt: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("shouldTriggerAlert", () => {
  it("returns true when currentPriceUSD is below targetPriceUSD", () => {
    const alert = makeAlert({ currentPriceUSD: 250, targetPriceUSD: 300 });

    expect(shouldTriggerAlert(alert)).toBe(true);
  });

  it("returns false when currentPriceUSD equals targetPriceUSD (not strictly below)", () => {
    const alert = makeAlert({ currentPriceUSD: 300, targetPriceUSD: 300 });

    expect(shouldTriggerAlert(alert)).toBe(false);
  });

  it("returns false when currentPriceUSD is above targetPriceUSD", () => {
    const alert = makeAlert({ currentPriceUSD: 450, targetPriceUSD: 300 });

    expect(shouldTriggerAlert(alert)).toBe(false);
  });

  it("returns false when currentPriceUSD is null (price not yet known)", () => {
    const alert = makeAlert({ currentPriceUSD: null, targetPriceUSD: 300 });

    expect(shouldTriggerAlert(alert)).toBe(false);
  });
});
