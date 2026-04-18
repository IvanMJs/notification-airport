import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

interface FeedItem {
  tripId: string;
  userId: string;
  username: string;
  displayName: string | null;
  destinationCode: string;
  destinationName: string | null;
  isoDate: string;
  createdAt: string;
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

  const { data: followingRows } = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = ((followingRows ?? []) as { following_id: string }[]).map(
    (r) => r.following_id,
  );

  if (followingIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const { data: tripRows } = await admin
    .from("trips")
    .select("id, user_id, destination_code, destination_name, iso_date, created_at")
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(20);

  const trips = (tripRows ?? []) as {
    id: string;
    user_id: string;
    destination_code: string | null;
    destination_name: string | null;
    iso_date: string;
    created_at: string;
  }[];

  const userIds = Array.from(new Set(trips.map((t) => t.user_id)));

  const profileMap = new Map<string, { username: string; displayName: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("id, username, display_name")
      .in("id", userIds);

    for (const p of (profiles ?? []) as {
      id: string;
      username: string;
      display_name: string | null;
    }[]) {
      profileMap.set(p.id, { username: p.username, displayName: p.display_name });
    }
  }

  const items: FeedItem[] = trips.flatMap((trip) => {
    if (!trip.destination_code) return [];
    const profile = profileMap.get(trip.user_id);
    if (!profile) return [];
    return [
      {
        tripId: trip.id,
        userId: trip.user_id,
        username: profile.username,
        displayName: profile.displayName,
        destinationCode: trip.destination_code,
        destinationName: trip.destination_name,
        isoDate: trip.iso_date,
        createdAt: trip.created_at,
      },
    ];
  });

  return NextResponse.json({ items });
}
