import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import type { TripSummary } from "@/lib/dreamPlanner";

const BodySchema = z.object({
  prompt: z.string().min(5).max(500),
  pastTrips: z.array(z.object({
    originCode: z.string(),
    destinationCode: z.string(),
    isoDate: z.string(),
  })).max(20),
  locale: z.enum(["es", "en"]).default("es"),
});

// Ensure TripSummary is used for type checking pastTrips entries
type _ValidateTripSummary = z.infer<typeof BodySchema>["pastTrips"][number] extends TripSummary ? true : never;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkUserRateLimit(supabase, user.id, "dream-planner", 3))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });

  const { prompt, pastTrips, locale } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "AI not configured" }, { status: 500 });

  const client = new Anthropic({ apiKey });

  const today = new Date().toISOString().slice(0, 10);
  const pastDestinations = pastTrips.length > 0
    ? pastTrips.map(t => `${t.originCode}→${t.destinationCode} (${t.isoDate})`).join(", ")
    : "none";

  const isEs = locale === "es";

  const systemPrompt = isEs
    ? `Sos un experto planificador de viajes. El usuario tiene estos viajes anteriores: ${pastDestinations}. Hoy es ${today}. Respondé en español con un plan detallado usando estas secciones exactas con emojis:
✈️ **Vuelos sugeridos** — rutas, aerolíneas recomendadas, escalas óptimas
🗓️ **Mejor época** — cuándo ir, clima, temporada alta/baja
🏙️ **Itinerario** — ciudades, días sugeridos, highlights
💰 **Presupuesto estimado** — vuelos, hospedaje, comida, total aproximado
🛂 **Visa y requisitos** — documentación necesaria
🎒 **Qué llevar** — tips de equipaje para este destino
✨ **Consejo final** — tu recomendación personal

Sé específico, útil y entusiasta. Máximo 600 palabras.`
    : `You are an expert travel planner. The user has these past trips: ${pastDestinations}. Today is ${today}. Reply in English with a detailed plan using these exact sections:
✈️ **Suggested flights** — routes, recommended airlines, optimal layovers
🗓️ **Best time to go** — when to visit, weather, peak/off-peak seasons
🏙️ **Itinerary** — cities, suggested days, highlights
💰 **Estimated budget** — flights, accommodation, food, approximate total
🛂 **Visa & requirements** — necessary documentation
🎒 **What to pack** — packing tips for this destination
✨ **Final tip** — your personal recommendation

Be specific, helpful, and enthusiastic. Maximum 600 words.`;

  const stream = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch {
        controller.error(new Error("Stream error"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
    },
  });
}
