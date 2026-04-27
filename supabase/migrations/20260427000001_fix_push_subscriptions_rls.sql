-- Ensure RLS is enabled and policies are correct on push_subscriptions.
-- Idempotent: safe to run multiple times.

ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON "public"."push_subscriptions";

CREATE POLICY "Users manage own push subscriptions"
  ON "public"."push_subscriptions"
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
