-- Migration: create trip_share_tokens table
-- Apply manually in Supabase SQL editor before using the family tracking link feature.

CREATE TABLE trip_share_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token      text        UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  trip_id    uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Index for fast token lookups
CREATE INDEX idx_trip_share_tokens_token ON trip_share_tokens(token);

-- Row Level Security: tokens are public-read (no auth required for family tracking)
ALTER TABLE trip_share_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read a token row (needed for the public share page)
CREATE POLICY "Public read share tokens"
  ON trip_share_tokens FOR SELECT
  USING (true);

-- Only authenticated users can create tokens
CREATE POLICY "Authenticated users insert share tokens"
  ON trip_share_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only the trip owner can delete tokens (via trip ownership check)
CREATE POLICY "Authenticated users delete own share tokens"
  ON trip_share_tokens FOR DELETE
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );
