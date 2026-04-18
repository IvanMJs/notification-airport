export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  // enriched fields (from join)
  otherUserEmail?: string;
  otherUserId?: string;
}

export interface FriendWithLocation {
  friendshipId: string;
  userId: string;
  email: string;
  // current location — null if not actively traveling
  currentLocation: {
    city: string;
    country: string;
    lat: number;
    lng: number;
  } | null;
}
