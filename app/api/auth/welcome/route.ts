import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { Resend } from "resend";
import { buildWelcomeEmail } from "@/lib/welcomeEmail";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if already sent
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("welcome_sent")
    .eq("id", user.id)
    .single();

  if (profile?.welcome_sent) {
    return NextResponse.json({ already_sent: true });
  }

  // Populate display_name from OAuth metadata (Google sets full_name / name).
  // Only used as seed — the user can override it later in profile setup.
  const authName: string | null =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null;

  // Mark as sent FIRST to prevent race conditions.
  // IMPORTANT: include user_id so the column is never left NULL.
  const { error: upsertErr } = await supabase
    .from("user_profiles")
    .upsert({
      id: user.id,
      user_id: user.id,
      welcome_sent: true,
      ...(authName ? { display_name: authName } : {}),
    });
  if (upsertErr) return NextResponse.json({ error: "DB error" }, { status: 500 });

  // Send email
  if (process.env.RESEND_API_KEY && user.email) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const firstName = user.email.split("@")[0].replace(/[<>&"]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;"}[c]!));
    await resend.emails.send({
      from: "TripCopilot <hola@tripcopilot.app>",
      to: user.email,
      subject: "Bienvenido a TripCopilot ✈️",
      html: buildWelcomeEmail(firstName),
    }).catch(err => console.error("[welcome] Resend error:", err));
  }

  return NextResponse.json({ ok: true });
}
