import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const PostBodySchema = z.object({
  friendshipId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { friendshipId } = parsed.data;

  // Verify: friendship must exist, addressee must be current user, status must be pending
  const { data: friendship, error: fetchErr } = await supabase
    .from("friendships")
    .select("id, status, addressee_id")
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchErr || !friendship) {
    return NextResponse.json(
      { error: "Solicitud no encontrada o ya procesada" },
      { status: 404 },
    );
  }

  const { error: updateErr } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId);

  if (updateErr) {
    return NextResponse.json({ error: "No se pudo aceptar la solicitud" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
