import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const TripFlightSchema = z.object({
  flightCode:      z.string().max(10),
  originCode:      z.string().max(3),
  destinationCode: z.string().max(3),
  isoDate:         z.string().max(10),
  departureTime:   z.string().max(5).optional(),
  arrivalTime:     z.string().max(5).optional(),
  arrivalDate:     z.string().max(10).optional(),
  airlineName:     z.string().max(100).optional(),
});

const BodySchema = z.object({
  question:    z.string().min(1).max(500),
  tripContext: z.object({
    flights:  z.array(TripFlightSchema).max(50),
    tripName: z.string().max(200),
  }),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Rate limit: 20 chat requests per hour per user
  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_user_id:      user.id,
    p_endpoint:     "trip-copilot",
    p_max_per_hour: 20,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded — try again later" }, { status: 429 });
  }

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { question, tripContext } = parsed.data;

  const flightsText = tripContext.flights.length > 0
    ? tripContext.flights.map((f) => {
        const parts = [`${f.flightCode} · ${f.originCode}→${f.destinationCode} · ${f.isoDate}`];
        if (f.departureTime) parts.push(`sale ${f.departureTime}`);
        if (f.arrivalTime) parts.push(`llega ${f.arrivalTime}${f.arrivalDate && f.arrivalDate !== f.isoDate ? " (" + f.arrivalDate + ")" : ""}`);
        if (f.airlineName) parts.push(f.airlineName);
        return "• " + parts.join(" · ");
      }).join("\n")
    : "Sin vuelos registrados";

  const tripSummary = `Viaje: "${tripContext.tripName}"\nVuelos:\n${flightsText}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: `Sos un asistente de viaje conciso y práctico. El usuario tiene el siguiente itinerario:\n\n${tripSummary}\n\nRespondé sus preguntas de forma concisa (máximo 3-4 oraciones). Si la pregunta no tiene que ver con viajes, redirigí amablemente al tema.`,
      messages: [{ role: "user", content: question }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string; type?: string } };
    const type = err.error?.type ?? "";
    const friendly =
      type === "authentication_error" ? "API key inválida"
      : type === "permission_error"   ? "Sin permisos en la API"
      : response.status === 529       ? "API con sobrecarga, reintentá en unos segundos"
      : "No se pudo generar la respuesta";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }

  const apiRaw = await response.json() as { content: { type: string; text: string }[] };
  const answer = apiRaw.content?.find((c) => c.type === "text")?.text ?? "";

  if (!answer) {
    return NextResponse.json({ error: "No se obtuvo respuesta del modelo" }, { status: 502 });
  }

  return NextResponse.json({ answer });
}
