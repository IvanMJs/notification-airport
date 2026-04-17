import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// FlightAware pushes events for alerts we registered via POST /alerts.
// Payload shape (simplified — only the fields we care about):
interface FAWebhookPayload {
  alert_id?: number;
  event_type?: string; // "departure" | "arrival" | "diverted" | "cancelled" | "filed"
  flight?: {
    ident?: string;
    ident_iata?: string;
    fa_flight_id?: string;
    status?: string;
    cancelled?: boolean;
    diverted?: boolean;
    departure_delay?: number; // seconds
    gate_origin?: string;
    terminal_origin?: string;
    estimated_out?: string;
    actual_out?: string;
    scheduled_out?: string;
  };
}

webpush.setVapidDetails(
  "mailto:support@tripcopilot.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: Request) {
  // FlightAware signs requests with a shared secret in the X-Signature header.
  // We verify it to prevent spoofed payloads.
  const secret = process.env.FLIGHTAWARE_WEBHOOK_SECRET;
  if (secret) {
    const sig = request.headers.get("x-signature") ?? "";
    const body = await request.text();
    const { createHmac } = await import("crypto");
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    if (sig !== expected) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
    // Re-parse since we consumed the stream
    const payload = JSON.parse(body) as FAWebhookPayload;
    return handlePayload(payload);
  }

  // No secret configured — accept without signature check (dev/test mode)
  const payload = (await request.json()) as FAWebhookPayload;
  return handlePayload(payload);
}

async function handlePayload(payload: FAWebhookPayload) {
  const flight = payload.flight;
  if (!flight) return Response.json({ ok: true });

  const eventType = payload.event_type ?? "";
  const flightIdent = flight.ident_iata ?? flight.ident ?? "";
  if (!flightIdent) return Response.json({ ok: true });

  // Derive ISO date from the scheduled departure UTC timestamp
  const isoDate = (flight.scheduled_out ?? flight.estimated_out ?? flight.actual_out ?? "")
    .slice(0, 10);
  if (!isoDate) return Response.json({ ok: true });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Find matching flights in DB
  const { data: dbFlights } = await supabase
    .from("flights")
    .select("id, trip_id, flight_code, gate, trips!inner(user_id)")
    .eq("flight_code", flightIdent)
    .eq("iso_date", isoDate);

  if (!dbFlights?.length) return Response.json({ ok: true });

  // Build notification based on event type
  const delayMinutes = flight.departure_delay
    ? Math.round(flight.departure_delay / 60)
    : 0;
  const gate = flight.gate_origin ?? null;

  let title = "";
  let body  = "";

  switch (eventType) {
    case "departure":
      title = `✈️ ${flightIdent} departed`;
      body  = gate ? `Departed from gate ${gate}` : "Flight has departed";
      break;
    case "arrival":
      title = `🛬 ${flightIdent} landed`;
      body  = "Your flight has arrived";
      break;
    case "diverted":
      title = `⚠️ ${flightIdent} diverted`;
      body  = "Flight has been diverted to another airport";
      break;
    case "cancelled":
      title = `❌ ${flightIdent} cancelled`;
      body  = "Flight has been cancelled";
      break;
    case "filed":
    default:
      if (delayMinutes >= 20) {
        title = `⏱️ ${flightIdent} delayed ${delayMinutes} min`;
        body  = gate ? `New departure from gate ${gate}` : "Check updated departure time";
      } else {
        // Minor update — skip push
        return Response.json({ ok: true });
      }
  }

  // Update gate in DB if we have new info
  if (gate) {
    const flightIds = dbFlights.map((f) => f.id);
    await supabase.from("flights").update({ gate }).in("id", flightIds);
  }

  // Collect user_ids from matched flights
  const userIds = Array.from(
    new Set(
      dbFlights.map((f) => (f.trips as unknown as { user_id: string }).user_id),
    ),
  );

  // Fetch push subscriptions for those users
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (!subs?.length) return Response.json({ ok: true });

  const notification = JSON.stringify({ title, body, tag: `fa-${flightIdent}-${eventType}` });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification,
      ).catch(() => null),
    ),
  );

  return Response.json({ ok: true, notified: subs.length });
}
