import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

interface FollowUser {
  userId: string;
  username: string;
  displayName: string | null;
}

function makeAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = makeAdmin();

  const [{ data: followingRows }, { data: followerRows }] = await Promise.all([
    admin.from("follows").select("following_id").eq("follower_id", user.id),
    admin.from("follows").select("follower_id").eq("following_id", user.id),
  ]);

  const followingIds = ((followingRows ?? []) as { following_id: string }[]).map(
    (r) => r.following_id,
  );
  const followerIds = ((followerRows ?? []) as { follower_id: string }[]).map(
    (r) => r.follower_id,
  );

  const allIds = Array.from(new Set([...followingIds, ...followerIds]));

  let profileMap = new Map<string, { username: string; display_name: string | null }>();

  if (allIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("id, username, display_name")
      .in("id", allIds);

    for (const p of (profiles ?? []) as {
      id: string;
      username: string;
      display_name: string | null;
    }[]) {
      profileMap.set(p.id, { username: p.username, display_name: p.display_name });
    }
  }

  function toFollowUser(userId: string): FollowUser | null {
    const p = profileMap.get(userId);
    if (!p) return null;
    return { userId, username: p.username, displayName: p.display_name };
  }

  const following: FollowUser[] = followingIds.flatMap((id) => {
    const u = toFollowUser(id);
    return u ? [u] : [];
  });

  const followers: FollowUser[] = followerIds.flatMap((id) => {
    const u = toFollowUser(id);
    return u ? [u] : [];
  });

  return NextResponse.json({ following, followers });
}
