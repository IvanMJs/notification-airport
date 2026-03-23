import Stripe from "stripe";

// Server-side Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

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
