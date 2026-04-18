import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { AIRPORTS } from "@/lib/airports";
import type { FriendWithLocation } from "@/lib/friends";

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
}

interface PendingIncoming {
  friendshipId: string;
  requesterId: string;
  requesterEmail: string;
}

export async function GET() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Fetch all friendships (accepted + pending incoming)
  const { data: allFriendships, error: fsErr } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .in("status", ["accepted", "pending"]);

  if (fsErr) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const rows = (allFriendships ?? []) as FriendshipRow[];

  // Separate accepted from pending-incoming
  const acceptedRows = rows.filter((r) => r.status === "accepted");
  const pendingIncomingRows = rows.filter(
    (r) => r.status === "pending" && r.addressee_id === user.id,
  );

  // Collect all other-user IDs we need to resolve
  const otherUserIds = acceptedRows.map((r) =>
    r.requester_id === user.id ? r.addressee_id : r.requester_id,
  );
  const pendingRequesterIds = pendingIncomingRows.map((r) => r.requester_id);
  const allNeededIds = Array.from(new Set([...otherUserIds, ...pendingRequesterIds]));

  // Resolve emails via admin API (paginated listUsers is expensive, so use getUserById per id)
  const emailByUserId = new Map<string, string>();
  await Promise.all(
    allNeededIds.map(async (uid) => {
      const {
        data: { user: u },
      } = await adminSupabase.auth.admin.getUserById(uid);
      if (u?.email) emailByUserId.set(uid, u.email);
    }),
  );

  // Build pending incoming list
  const pendingIncoming: PendingIncoming[] = pendingIncomingRows.map((r) => ({
    friendshipId: r.id,
    requesterId: r.requester_id,
    requesterEmail: emailByUserId.get(r.requester_id) ?? r.requester_id,
  }));

  if (otherUserIds.length === 0) {
    return NextResponse.json({ friends: [], pendingIncoming });
  }

  // Query active flights for accepted friends (±2 days from today)
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 2);
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + 2);

  const twoDaysAgo = toISO(fromDate);
  const twoDaysAhead = toISO(toDate);

  // Step 1: Get trip IDs belonging to the other users
  const { data: tripRows } = await adminSupabase
    .from("trips")
    .select("id, user_id")
    .in("user_id", otherUserIds);
  const tripIds = (tripRows ?? []).map((t) => t.id as string);

  // Step 2: Query flights filtered by those trip IDs and the date range
  const { data: flightRows } = await adminSupabase
    .from("flights")
    .select("destination_code, iso_date, trip_id")
    .in("trip_id", tripIds)
    .gte("iso_date", twoDaysAgo)
    .lte("iso_date", twoDaysAhead);

  // Step 3: Build trip_id -> user_id lookup from step 1
  const tripToUser = new Map<string, string>();
  for (const t of tripRows ?? []) {
    tripToUser.set(t.id as string, t.user_id as string);
  }

  // Build a map: userId -> most recent destination code (two separate maps to avoid
  // comparing ISO date strings against destination_code strings)
  const destByUserId = new Map<string, string>();
  const isoByUserId = new Map<string, string>();
  if (flightRows) {
    for (const row of flightRows) {
      const uid = tripToUser.get(row.trip_id as string);
      if (!uid) continue;
      const existing = isoByUserId.get(uid);
      if (!existing || (row.iso_date as string) > existing) {
        isoByUserId.set(uid, row.iso_date as string);
        destByUserId.set(uid, row.destination_code as string);
      }
    }
  }

  // Build FriendWithLocation array
  const friends: FriendWithLocation[] = acceptedRows.map((r) => {
    const otherId = r.requester_id === user.id ? r.addressee_id : r.requester_id;
    const email = emailByUserId.get(otherId) ?? otherId;
    const destCode = destByUserId.get(otherId);
    let currentLocation: FriendWithLocation["currentLocation"] = null;

    if (destCode) {
      const airport = AIRPORTS[destCode];
      if (
        airport &&
        typeof airport.lat === "number" &&
        typeof airport.lng === "number"
      ) {
        currentLocation = {
          city: airport.city ?? destCode,
          country: airport.country ?? "USA",
          lat: airport.lat,
          lng: airport.lng,
        };
      }
    }

    return {
      friendshipId: r.id,
      userId: otherId,
      email,
      currentLocation,
    };
  });

  return NextResponse.json({ friends, pendingIncoming });
}
