-- Add admin override fields to user_profiles.
-- admin_override: when true, MercadoPago webhook skips updating the plan.
-- admin_notes: internal notes visible only in the admin dashboard.

ALTER TABLE "public"."user_profiles"
  ADD COLUMN IF NOT EXISTS "admin_override" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "admin_notes" text;
