import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import * as Sentry from "@sentry/nextjs";

const BodySchema = z
  .object({
    text:        z.string().max(10_000).optional(),
    imageBase64: z.string().max(5_000_000).optional(), // ~3.7 MB image
    mimeType:    z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
    locale:      z.enum(["es", "en"]).default("en"),
  })
  .refine((d) => d.text || d.imageBase64, {
    message: "Either text or imageBase64 is required",
  })
  .refine((d) => !d.imageBase64 || !!d.mimeType, {
    message: "mimeType is required when imageBase64 is provided",
    path: ["mimeType"],
  });

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

const SYSTEM_PROMPT = `You are a universal travel document extractor. Process ALL segment types: flights, transfers, buses, trains, ferries, and car rentals.

STEP 1 — CLASSIFY the document type using these keyword rules:
- flight: airline codes (AA, LA, AR, UA, DL), flight numbers (AA900), IATA airport codes, "boarding pass", "gate", "seat"
- transfer: "Bono de Traslado", "Shuttle", "Sentido:", "Transfer", "traslado", "voucher transfer", provider names like "Jumbo Tours"
- bus: "FlixBus", "Omnibus", "Terminal de buses", "andén", coach/seat number, "autobus"
- train: "AVE", "Amtrak", "Renfe", "Tren", "rail", "Vagón", "Andén", "SNCF", "Eurostar"
- ferry: "Ferry", "Grimaldi", "Baleària", "port", "Cubierta", "cabin", "embarque"
- car_rental: "Hertz", "Avis", "Budget", "Alamo", "Rental Agreement", "Pick-up", "Drop-off", "recogida"

STEP 2 — EXTRACT fields according to the rules below, then return ONLY valid JSON (no markdown, no explanation):
{
  "flights": [
    {
      "flightCode": "AA900",
      "airlineCode": "AA",
      "airlineName": "American Airlines",
      "flightNumber": "900",
      "originCode": "EZE",
      "destinationCode": "MIA",
      "isoDate": "2026-03-29",
      "departureTime": "20:30",
      "arrivalDate": "2026-03-30",
      "arrivalTime": "06:45",
      "segmentType": "flight",
      "cabinClass": "economy",
      "seatNumber": "12A",
      "bookingCode": "QDLHPV",
      "confidence": 0.95,
      "missing": []
    }
  ],
  "rawExtraction": "Brief reasoning: found 2 flights in a round-trip AA confirmation..."
}

Field rules:

FOR FLIGHTS:
- flightCode: airline IATA code + flight number, no spaces (e.g. "AA900", "UA456")
- airlineCode: 2-letter IATA code (e.g. "AA", "UA", "DL", "LA", "AR")
- airlineName: full airline name in English
- flightNumber: just the digits (e.g. "900")
- originCode: IATA airport code, 3 uppercase letters
- destinationCode: IATA airport code, 3 uppercase letters

FOR NON-FLIGHT SEGMENTS (transfer, bus, train, ferry, car_rental):
- flightCode: use booking/localizador number prefixed with type — NEVER leave empty (e.g. "TRANSFER-8246238613", "BUS-16111266", "TRAIN-REN123456")
- airlineCode: use "" for non-flight segments
- airlineName: use the provider/company name (e.g. "Jumbo Tours", "FlixBus", "Renfe", "Hertz")
- flightNumber: use "" for non-flight segments
- originCode: nearest airport IATA code OR city abbreviation (e.g. "CUN" for Cancún airport, "MAD" for Madrid). Use hotel name first 3 chars if no IATA exists (e.g. "WYN" for Wyndham)
- destinationCode: same logic as originCode

COMMON FIELDS:
- isoDate: departure date, format "YYYY-MM-DD"
- departureTime: 24h format "HH:MM", or "" if not found. Convert 12h to 24h (e.g. "8:30 PM" → "20:30").
- arrivalDate: arrival date, format "YYYY-MM-DD". Leave "" if not found.
- arrivalTime: arrival time in local time at destination, 24h format "HH:MM". Leave "" if not found.
- segmentType: one of "flight"|"bus"|"train"|"car_rental"|"ferry"|"transfer"
- cabinClass: one of "economy", "premium_economy", "business", "first". Leave "" if not found.
- seatNumber: assigned seat (e.g. "12A"). Leave "" if not assigned.
- bookingCode: PNR/confirmation/reservation code (e.g. "QDLHPV" or "8246238613"). Leave "" if not found.
- confidence: numeric 0.0–1.0
  - 1.0: all key fields present (originCode, destinationCode, isoDate, departureTime)
  - 0.8: missing departureTime only
  - 0.6: missing 1-2 fields but type is clear
  - 0.4: type detected but most fields uncertain
  - 0.2: document unclear, best guess
- missing: array of field names that could not be determined, e.g. ["departureTime"] or []
- rawExtraction: 1-2 sentence summary of what you found and any ambiguities

FEW-SHOT EXAMPLES:

Input: "BOARDING PASS · American Airlines AA900 · JFK → MIA · April 11 2026 · Dep 11:10 · Seat 12A"
Output: {"segmentType":"flight","flightCode":"AA900","airlineCode":"AA","airlineName":"American Airlines","flightNumber":"900","originCode":"JFK","destinationCode":"MIA","isoDate":"2026-04-11","departureTime":"11:10","arrivalDate":"","arrivalTime":"","cabinClass":"","seatNumber":"12A","bookingCode":"","confidence":0.95,"missing":[]}

Input: "Bono de Traslado · Jumbo Tours · Cancún Aeropuerto → Wyndham Grand · 01/05/2026 14:15 · Localizador: 8246238613"
Output: {"segmentType":"transfer","flightCode":"TRANSFER-8246238613","airlineCode":"","airlineName":"Jumbo Tours","flightNumber":"","originCode":"CUN","destinationCode":"WYN","isoDate":"2026-05-01","departureTime":"14:15","arrivalDate":"","arrivalTime":"","cabinClass":"","seatNumber":"","bookingCode":"8246238613","confidence":0.85,"missing":[]}

Input: "AVE Madrid→Barcelona · 08:30 · 20/06/2026 · Vagón 3 Asiento 12A · Renfe · Reserva: REN123456"
Output: {"segmentType":"train","flightCode":"TRAIN-REN123456","airlineCode":"","airlineName":"Renfe","flightNumber":"","originCode":"MAD","destinationCode":"BCN","isoDate":"2026-06-20","departureTime":"08:30","arrivalDate":"","arrivalTime":"","cabinClass":"","seatNumber":"12A","bookingCode":"REN123456","confidence":0.9,"missing":[]}

Handle Spanish, English, and Portuguese input naturally.
Extract ALL travel segments in chronological order.
If a field is missing or uncertain, leave it as empty string "" and add the field name to "missing".
`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = getAnthropicClient();
  if (!client) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const allowed = await checkUserRateLimit(supabase, user.id, "parse-itinerary", 20);
  if (!allowed) return rateLimitResponse();

  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { text, imageBase64, mimeType } = parsed.data;

    const userContent: Anthropic.MessageParam["content"] = [];

    if (imageBase64 && mimeType) {
      userContent.push({
        type: "image",
        source: {
          type:       "base64",
          media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data:       imageBase64,
        },
      });
      userContent.push({
        type: "text",
        text: "Extract ALL travel segments (flights, transfers, buses, trains, ferries, car rentals) from this image. Return JSON only.",
      });
    } else {
      userContent.push({
        type: "text",
        text: `Extract ALL travel segments (flights, transfers, buses, trains, ferries, car rentals) from this travel document:\n\n${text}\n\nReturn JSON only.`,
      });
    }

    const message = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: userContent }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ flights: [], rawExtraction: "" });
    }

    const jsonParsed = JSON.parse(jsonMatch[0]) as {
      flights?: unknown[];
      rawExtraction?: string;
    };

    const FlightSchema = z.object({
      flightCode:      z.string().catch(""),
      airlineCode:     z.string().max(3).catch(""),
      airlineName:     z.string().max(100).catch(""),
      flightNumber:    z.string().max(6).catch(""),
      originCode:      z.string().regex(/^[A-Z]{3}$/).catch(""),
      destinationCode: z.string().regex(/^[A-Z]{3}$/).catch(""),
      isoDate:         z
        .string()
        .regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/)
        .catch(""),
      departureTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .or(z.literal(""))
        .catch(""),
      arrivalDate: z
        .string()
        .regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/)
        .or(z.literal(""))
        .catch(""),
      arrivalTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .or(z.literal(""))
        .catch(""),
      segmentType: z.enum(['flight','bus','train','car_rental','ferry','transfer']).catch('flight'),
      cabinClass:  z
        .enum(["economy", "premium_economy", "business", "first"])
        .or(z.literal(""))
        .catch(""),
      seatNumber:  z.string().max(10).catch(""),
      bookingCode: z.string().max(20).catch(""),
      confidence:  z.number().min(0).max(1).catch(0.5),
      missing:     z.array(z.string()).catch([]),
    });

    const flights = z
      .array(FlightSchema)
      .max(20)
      .catch([])
      .parse(jsonParsed.flights ?? []);

    const rawExtraction =
      typeof jsonParsed.rawExtraction === "string"
        ? jsonParsed.rawExtraction.slice(0, 500)
        : "";

    return NextResponse.json({ flights, rawExtraction });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
