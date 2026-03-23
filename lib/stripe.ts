import Stripe from "stripe";

// Server-side Stripe client — lazy singleton so build-time static analysis
// doesn't fail when STRIPE_SECRET_KEY is not set in the build environment.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}
/** @deprecated use getStripe() */
export const stripe = { checkout: { sessions: { create: (...args: Parameters<Stripe["checkout"]["sessions"]["create"]>) => getStripe().checkout.sessions.create(...args) } } } as unknown as Stripe;

export const PLANS = {
  free: {
    name: "Free",
    maxTrips: 3,
    maxFlightsPerTrip: 5,
    features: ["Alertas básicas", "Importar boarding pass"],
  },
  premium: {
    name: "Premium",
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID ?? "",
    priceMonthlyUSD: 4.99,
    maxTrips: Infinity,
    maxFlightsPerTrip: Infinity,
    features: [
      "Viajes ilimitados",
      "AI Travel Assistant",
      "Colaboradores",
      "Export PDF",
      "Alertas de precio",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
