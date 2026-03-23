import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

// POST /api/stripe/webhook
// Handles Stripe webhook events. Verifies signature with STRIPE_WEBHOOK_SECRET.
// Supported events:
//   checkout.session.completed  → set user_profiles.plan = 'premium'
//   customer.subscription.deleted → set user_profiles.plan = 'free'
export async function POST(req: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  // Use service-role key for admin writes — bypasses RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      if (!userId) {
        return NextResponse.json({ error: "Missing client_reference_id" }, { status: 400 });
      }

      const { error } = await supabase
        .from("user_profiles")
        .update({ plan: "premium" })
        .eq("user_id", userId);

      if (error) {
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Look up the user by stripe_customer_id — requires that column to exist
      const { data: profile, error: lookupError } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (lookupError || !profile) {
        // Not found — nothing to downgrade
        break;
      }

      const { error } = await supabase
        .from("user_profiles")
        .update({ plan: "free" })
        .eq("user_id", profile.user_id);

      if (error) {
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }
      break;
    }

    default:
      // Unhandled event — acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
}
