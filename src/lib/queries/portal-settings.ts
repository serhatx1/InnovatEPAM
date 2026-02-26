import { SupabaseClient } from "@supabase/supabase-js";

const BLIND_REVIEW_KEY = "blind_review_enabled";

/**
 * Read the current blind review setting.
 * Returns false if no row exists (default off).
 */
export async function getBlindReviewEnabled(
  supabase: SupabaseClient
): Promise<{ enabled: boolean; updatedBy: string | null; updatedAt: string | null }> {
  const { data, error } = await supabase
    .from("portal_setting")
    .select("value, updated_by, updated_at")
    .eq("key", BLIND_REVIEW_KEY)
    .maybeSingle();

  if (error || !data) {
    return { enabled: false, updatedBy: null, updatedAt: null };
  }

  return {
    enabled: data.value === true,
    updatedBy: data.updated_by,
    updatedAt: data.updated_at,
  };
}

/**
 * Set blind review enabled/disabled (admin only).
 * Upserts the `blind_review_enabled` row.
 */
export async function setBlindReviewEnabled(
  supabase: SupabaseClient,
  enabled: boolean,
  userId: string
): Promise<{
  data: { enabled: boolean; updatedBy: string; updatedAt: string } | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("portal_setting")
    .upsert(
      {
        key: BLIND_REVIEW_KEY,
        value: enabled,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
    .select("value, updated_by, updated_at")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      enabled: data.value === true,
      updatedBy: data.updated_by,
      updatedAt: data.updated_at,
    },
    error: null,
  };
}
