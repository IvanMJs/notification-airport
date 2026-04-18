import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

const BodySchema = z.object({
  aircraftType: z.string().min(2).max(60),
  airline: z.string().max(50).default(""),
  locale: z.enum(["es", "en"]).default("es"),
});

// Simple in-memory cache: "aircraftType:locale" → brief string
const briefCache = new Map<string, string>();

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { aircraftType, airline, locale } = parsed.data;
  const cacheKey = `${aircraftType}:${locale}`;

  if (briefCache.has(cacheKey)) {
    return NextResponse.json({ brief: briefCache.get(cacheKey) });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ brief: aircraftType });

  const client = new Anthropic({ apiKey });
  const prompt =
    locale === "es"
      ? `Escribí 1 dato curioso e interesante sobre el avión ${aircraftType}${airline ? ` de ${airline}` : ""}. Máximo 80 caracteres. Sin markdown.`
      : `Write 1 curious fact about the ${aircraftType} aircraft${airline ? ` by ${airline}` : ""}. Max 80 characters. No markdown.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const block = msg.content[0];
  const brief = block.type === "text" ? block.text.trim() : aircraftType;
  briefCache.set(cacheKey, brief);

  return NextResponse.json({ brief });
}
