import { createClient } from "@/utils/supabase/server";
import { cancelFlightAlert } from "@/lib/flightaware";

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
    .select("fa_alert_id")
    .eq("id", body.flightId)
    .single();

  if (flight?.fa_alert_id) {
    await cancelFlightAlert(flight.fa_alert_id);
  }

  return Response.json({ ok: true });
}
