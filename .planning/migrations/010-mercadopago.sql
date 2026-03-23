-- Migration 010: Add MercadoPago payer ID column
-- Adds mp_payer_id to user_profiles for subscription tracking.
-- stripe_customer_id is kept as nullable tombstone (non-destructive).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS mp_payer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_mp_payer
  ON user_profiles(mp_payer_id)
  WHERE mp_payer_id IS NOT NULL;
