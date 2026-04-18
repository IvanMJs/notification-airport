import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { Resend } from "resend";

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

  // Mark as sent FIRST to prevent race conditions
  const { error: upsertErr } = await supabase
    .from("user_profiles")
    .upsert({ id: user.id, welcome_sent: true });
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

function buildWelcomeEmail(name: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="text-align:center;margin-bottom:32px">
      <span style="font-size:32px">✈️</span>
      <h1 style="color:#fff;font-size:22px;font-weight:900;margin:8px 0 4px">TripCopilot</h1>
    </div>
    <div style="background:linear-gradient(160deg,#12121f,#0d0d1a);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px">
      <h2 style="color:#fff;font-size:18px;font-weight:800;margin:0 0 8px">Hola, ${name} 👋</h2>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px">
        Bienvenido a TripCopilot — tu copiloto de viajes con IA. Esto es lo que podés hacer desde ahora:
      </p>
      <div style="margin-bottom:24px">
        ${[
          ["📸", "Importá vuelos con IA", "Foto o texto de tu reserva — TripCopilot carga todo automáticamente."],
          ["🔔", "Alertas en tiempo real", "Demoras, cambios de puerta y cancelaciones antes que nadie."],
          ["🌍", "Mapa de viajes", "Tu historial de países y aeropuertos en un mapa interactivo."],
          ["👫", "Red de viajeros", "Conectate con amigos y ve dónde están viajando."],
        ].map(([icon, title, desc]) => `
          <div style="display:flex;gap:12px;margin-bottom:16px">
            <span style="font-size:20px;flex-shrink:0">${icon}</span>
            <div>
              <p style="color:#fff;font-size:13px;font-weight:700;margin:0 0 2px">${title}</p>
              <p style="color:#9ca3af;font-size:12px;margin:0">${desc}</p>
            </div>
          </div>
        `).join("")}
      </div>
      <div style="text-align:center;margin-bottom:24px">
        <a href="https://tripcopilot.app/app" style="display:inline-block;background:#7c3aed;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px">
          Abrir TripCopilot →
        </a>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;text-align:center">
        <p style="color:#6b7280;font-size:12px;margin:0 0 8px">¿Ya tenés amigos viajeros? Compartiles la app 😊</p>
        <a href="https://tripcopilot.app" style="color:#8b5cf6;font-size:12px;text-decoration:none">tripcopilot.app</a>
      </div>
    </div>
    <p style="color:#374151;font-size:11px;text-align:center;margin:16px 0 0">TripCopilot · Buenos Aires, Argentina</p>
  </div>
</body>
</html>`;
}
