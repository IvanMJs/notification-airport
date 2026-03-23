-- Migration 009: premium plan support + notification preferences
-- Creates user_profiles table if it doesn't exist, then adds
-- plan, stripe_customer_id, and notification_prefs columns.

-- Create user_profiles if not already present
CREATE TABLE IF NOT EXISTS user_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Add plan column (default 'free')
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium'));

-- Add stripe_customer_id for subscription management
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add notification_prefs as JSONB with defaults
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{
    "flightDelays": true,
    "gateChanges": true,
    "checkInReminders": true,
    "weatherAlerts": false,
    "priceDrops": true,
    "weeklyDigest": false
  }'::jsonb;

-- Index for stripe customer lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer
  ON user_profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users manage own profile"
  ON user_profiles FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
