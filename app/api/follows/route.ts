import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const BodySchema = z.object({ username: z.string().min(1).max(30) });

function makeAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkUserRateLimit(supabase, user.id, "follows", 30))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username } = parsed.data;
  const admin = makeAdmin();

  const { data: targetProfile } = await admin
    .from("user_profiles")
    .select("id")
    .ilike("username", username)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const targetId = (targetProfile as { id: string }).id;

  if (targetId === user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const { error: insertErr } = await admin
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetId });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "Already following this user" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not follow user" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkUserRateLimit(supabase, user.id, "follows", 30))) {
    return rateLimitResponse();
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username } = parsed.data;
  const admin = makeAdmin();

  const { data: targetProfile } = await admin
    .from("user_profiles")
    .select("id")
    .ilike("username", username)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const targetId = (targetProfile as { id: string }).id;

  const { error: deleteErr } = await admin
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);

  if (deleteErr) {
    return NextResponse.json({ error: "Could not unfollow user" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
