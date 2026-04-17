import { createClient } from "@/utils/supabase/server";
import { registerFlightAlert } from "@/lib/flightaware";

const WEBHOOK_URL = "https://tripcopilot.app/api/webhooks/flightaware";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { flightId?: string };
  if (!body.flightId) {
    return Response.json({ error: "Missing flightId" }, { status: 400 });
  }

  // RLS ensures the flight belongs to this user
  const { data: flight } = await supabase
    .from("flights")
    .select("flight_code, iso_date")
    .eq("id", body.flightId)
    .single();

  if (!flight) {
    return Response.json({ ok: true }); // not found or not owned — silent no-op
  }

  const alert = await registerFlightAlert(flight.flight_code, flight.iso_date, WEBHOOK_URL);
  if (alert?.alert_id) {
    await supabase
      .from("flights")
      .update({ fa_alert_id: alert.alert_id })
      .eq("id", body.flightId);
  }

  return Response.json({ ok: true });
}
