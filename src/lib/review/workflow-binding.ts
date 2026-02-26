import { SupabaseClient } from "@supabase/supabase-js";
import { getActiveWorkflow } from "@/lib/queries/review-workflow";
import { createIdeaStageState, recordStageEvent } from "@/lib/queries/review-state";
import type { IdeaStageState, ReviewStageEvent } from "@/types";

/**
 * Bind an idea to the currently active workflow's first stage.
 * Called when an idea transitions into staged review (e.g. on submission).
 *
 * Returns the created stage state and the initial entry event,
 * or an error if no active workflow exists or stage binding fails.
 */
export async function bindIdeaToActiveWorkflow(
  supabase: SupabaseClient,
  ideaId: string,
  actorId: string
): Promise<{
  data: { state: IdeaStageState; event: ReviewStageEvent } | null;
  error: string | null;
}> {
  // 1. Fetch active workflow with stages
  const { data: workflow, error: wfError } = await getActiveWorkflow(supabase);
  if (wfError) {
    return { data: null, error: wfError };
  }
  if (!workflow) {
    return { data: null, error: "No active review workflow configured" };
  }
  if (workflow.stages.length === 0) {
    return { data: null, error: "Active workflow has no stages" };
  }

  // 2. Get the first stage (position 1)
  const firstStage = workflow.stages[0];

  // 3. Create stage state binding
  const { data: state, error: stateError } = await createIdeaStageState(
    supabase,
    {
      idea_id: ideaId,
      workflow_id: workflow.id,
      current_stage_id: firstStage.id,
      updated_by: actorId,
    }
  );

  if (stateError) {
    return { data: null, error: stateError };
  }
  if (!state) {
    return { data: null, error: "Failed to create stage state" };
  }

  // 4. Record the initial entry event
  const { data: event, error: eventError } = await recordStageEvent(
    supabase,
    {
      idea_id: ideaId,
      workflow_id: workflow.id,
      from_stage_id: null,
      to_stage_id: firstStage.id,
      action: "advance",
      actor_id: actorId,
    }
  );

  if (eventError) {
    return { data: null, error: eventError };
  }
  if (!event) {
    return { data: null, error: "Failed to record entry event" };
  }

  return { data: { state, event }, error: null };
}
