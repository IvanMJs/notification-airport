import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const DEFAULTS = {
  profileVisible: "friends",
  showMap: true,
  showStats: true,
  showTrips: true,
  showPersona: false,
  showCurrentLocation: true,
  acceptRequests: true,
};

const PatchSchema = z.object({
  key: z.enum(["profileVisible", "showMap", "showStats", "showTrips", "showPersona", "showCurrentLocation", "acceptRequests"]),
  value: z.union([z.boolean(), z.enum(["friends", "nobody"])]),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("user_profiles")
    .select("social_settings")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ settings: data?.social_settings ?? DEFAULTS });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { key, value } = parsed.data;

  // Fetch existing, merge, update
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("social_settings")
    .eq("id", user.id)
    .single();

  const existing = (profile?.social_settings ?? DEFAULTS) as Record<string, unknown>;
  const updated = { ...existing, [key]: value };

  await supabase
    .from("user_profiles")
    .upsert({ id: user.id, social_settings: updated });

  return NextResponse.json({ ok: true, settings: updated });
}
