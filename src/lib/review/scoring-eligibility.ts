import { SupabaseClient } from "@supabase/supabase-js";

export interface ScoringEligibilityResult {
  eligible: boolean;
  reason?: string;
  /** HTTP status code for the API to return when not eligible */
  status?: number;
}

/**
 * Check whether an evaluator is eligible to score a given idea.
 *
 * Guards:
 * 1. Idea must exist and not be soft-deleted.
 * 2. Idea must have a stage state (be under review).
 * 3. Idea must NOT have a terminal outcome.
 */
export async function checkScoringEligibility(
  supabase: SupabaseClient,
  ideaId: string,
  evaluatorId: string
): Promise<ScoringEligibilityResult> {
  // 1. Fetch the idea
  const { data: idea, error: ideaError } = await supabase
    .from("idea")
    .select("id, user_id, deleted_at")
    .eq("id", ideaId)
    .maybeSingle();

  if (ideaError || !idea) {
    return { eligible: false, reason: "Idea not found", status: 404 };
  }

  if (idea.deleted_at) {
    return { eligible: false, reason: "Idea not found", status: 404 };
  }

  // 2. Fetch stage state
  const { data: stageState } = await supabase
    .from("idea_stage_state")
    .select("terminal_outcome")
    .eq("idea_id", ideaId)
    .maybeSingle();

  if (!stageState) {
    return { eligible: false, reason: "Idea is not under review", status: 400 };
  }

  // 3. Terminal outcome check
  if (stageState.terminal_outcome !== null) {
    return {
      eligible: false,
      reason: "Idea has reached a terminal outcome",
      status: 403,
    };
  }

  return { eligible: true };
}
