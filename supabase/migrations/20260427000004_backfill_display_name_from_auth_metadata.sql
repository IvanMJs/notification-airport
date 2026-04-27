-- Backfill display_name for user_profiles where it is NULL,
-- using the name provided by the OAuth provider (Google, etc.)
-- stored in auth.users.raw_user_meta_data.
--
-- Priority: full_name → name (both are standard Google OAuth fields).
UPDATE public.user_profiles up
SET display_name = COALESCE(
  au.raw_user_meta_data->>'full_name',
  au.raw_user_meta_data->>'name'
)
FROM auth.users au
WHERE up.user_id = au.id
  AND up.display_name IS NULL
  AND COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name'
  ) IS NOT NULL;
