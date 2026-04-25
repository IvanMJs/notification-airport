import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { TEST_USER, isTestMode } from "@/lib/testUser";

export async function getAuthUser(): Promise<User | null> {
  if (isTestMode()) return TEST_USER as unknown as User;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
