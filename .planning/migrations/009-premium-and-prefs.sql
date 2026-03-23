-- Migration 009: premium plan support + notification preferences
-- Adds plan, stripe_customer_id, notification_prefs to user_profiles

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
