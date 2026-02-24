import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch the role of a user by their auth ID.
 * Returns the role string or null if not found.
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("user_profile")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role ?? null;
}
