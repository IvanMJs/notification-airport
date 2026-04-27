-- Fix: user_profiles rows where user_id was left NULL.
--
-- Root cause: /api/auth/welcome upserted { id, welcome_sent } without
-- setting user_id, creating orphan rows for every new signup since ~2026-04-22.
--
-- Step 1: backfill orphan rows — user_id must equal id (both are auth.users.id).
UPDATE public.user_profiles
SET    user_id = id
WHERE  user_id IS NULL;

-- Step 2: add NOT NULL constraint so this can never happen again.
ALTER TABLE public.user_profiles
  ALTER COLUMN user_id SET NOT NULL;
