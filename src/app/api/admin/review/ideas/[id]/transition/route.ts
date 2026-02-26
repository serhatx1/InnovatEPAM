import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, ideaExists } from "@/lib/queries";
import { getIdeaStageState, updateIdeaStageState, recordStageEvent } from "@/lib/queries/review-state";
import { getWorkflowById } from "@/lib/queries/review-workflow";
import { reviewTransitionRequestSchema } from "@/lib/validation/review-transition";
import { checkConcurrencyVersion, conflictResponse, CONCURRENCY_CONFLICT } from "@/lib/review/concurrency";
import type { ReviewTransitionAction } from "@/types";

/**
 * POST /api/admin/review/ideas/[id]/transition
 * Apply evaluator/admin stage action with optimistic concurrency.
 * Role: admin or evaluator.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin" && role !== "evaluator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate request body
  const body = await request.json();
  const parsed = reviewTransitionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid transition",
        details: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const { action, expectedStateVersion, comment } = parsed.data;

  // Check idea exists
  const exists = await ideaExists(supabase, id);
  if (!exists) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  // Get current stage state
  const { data: currentState, error: stateError } = await getIdeaStageState(
    supabase,
    id
  );

  if (stateError) {
    return NextResponse.json({ error: stateError }, { status: 500 });
  }

  if (!currentState) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  // Check for terminal state — no further transitions allowed
  if (currentState.terminal_outcome) {
    return NextResponse.json(
      { error: "Invalid transition", message: "Idea has already reached a terminal outcome" },
      { status: 400 }
    );
  }

  // Optimistic concurrency check
  const concurrencyError = checkConcurrencyVersion(
    currentState,
    expectedStateVersion
  );
  if (concurrencyError === CONCURRENCY_CONFLICT) {
    return NextResponse.json(conflictResponse(), { status: 409 });
  }

  // Fetch workflow with stages for transition logic
  const { data: workflow, error: wfError } = await getWorkflowById(
    supabase,
    currentState.workflow_id
  );

  if (wfError || !workflow) {
    return NextResponse.json(
      { error: "Failed to load workflow" },
      { status: 500 }
    );
  }

  const stages = workflow.stages;
  const currentStageIndex = stages.findIndex(
    (s) => s.id === currentState.current_stage_id
  );

  if (currentStageIndex === -1) {
    return NextResponse.json(
      { error: "Invalid transition", message: "Current stage not found in workflow" },
      { status: 400 }
    );
  }

  // Determine target stage and outcome based on action
  let targetStageId: string;
  let terminalOutcome: "accepted" | "rejected" | null = null;

  switch (action as ReviewTransitionAction) {
    case "advance": {
      if (currentStageIndex >= stages.length - 1) {
        return NextResponse.json(
          { error: "Invalid transition", message: "Already at last stage; use terminal action" },
          { status: 400 }
        );
      }
      targetStageId = stages[currentStageIndex + 1].id;
      break;
    }
    case "return": {
      if (currentStageIndex <= 0) {
        return NextResponse.json(
          { error: "Invalid transition", message: "Cannot return from first stage" },
          { status: 400 }
        );
      }
      targetStageId = stages[currentStageIndex - 1].id;
      break;
    }
    case "hold": {
      // Stay at current stage
      targetStageId = currentState.current_stage_id;
      break;
    }
    case "terminal_accept": {
      if (currentStageIndex !== stages.length - 1) {
        return NextResponse.json(
          { error: "Invalid transition", message: "Terminal action only allowed at last stage" },
          { status: 400 }
        );
      }
      targetStageId = currentState.current_stage_id;
      terminalOutcome = "accepted";
      break;
    }
    case "terminal_reject": {
      if (currentStageIndex !== stages.length - 1) {
        return NextResponse.json(
          { error: "Invalid transition", message: "Terminal action only allowed at last stage" },
          { status: 400 }
        );
      }
      targetStageId = currentState.current_stage_id;
      terminalOutcome = "rejected";
      break;
    }
    default:
      return NextResponse.json(
        { error: "Invalid transition" },
        { status: 400 }
      );
  }

  // Update stage state with concurrency-safe write
  const { data: updatedState, error: updateError } = await updateIdeaStageState(
    supabase,
    id,
    expectedStateVersion,
    {
      current_stage_id: targetStageId,
      updated_by: user.id,
      terminal_outcome: terminalOutcome,
    }
  );

  if (updateError === CONCURRENCY_CONFLICT) {
    return NextResponse.json(conflictResponse(), { status: 409 });
  }

  if (updateError || !updatedState) {
    return NextResponse.json(
      { error: updateError ?? "Failed to update stage state" },
      { status: 500 }
    );
  }

  // Record immutable stage event
  const { error: eventError } = await recordStageEvent(supabase, {
    idea_id: id,
    workflow_id: currentState.workflow_id,
    from_stage_id: currentState.current_stage_id,
    to_stage_id: targetStageId,
    action: action as ReviewTransitionAction,
    evaluator_comment: comment ?? null,
    actor_id: user.id,
  });

  if (eventError) {
    // Event recording failure is non-blocking but logged
    console.error("Failed to record stage event:", eventError);
  }

  // Sync idea.status when a terminal outcome is reached
  if (terminalOutcome) {
    const newStatus = terminalOutcome === "accepted" ? "accepted" : "rejected";
    const { error: statusError } = await supabase
      .from("idea")
      .update({ status: newStatus })
      .eq("id", id);
    if (statusError) {
      console.error("Failed to sync idea status:", statusError);
    }
  }

  // Build response
  const stageMap = new Map(stages.map((s) => [s.id, s.name]));

  return NextResponse.json({
    ideaId: id,
    workflowId: updatedState.workflow_id,
    currentStageId: updatedState.current_stage_id,
    currentStageName: stageMap.get(updatedState.current_stage_id) ?? "Unknown",
    stateVersion: updatedState.state_version,
    terminalOutcome: updatedState.terminal_outcome,
    updatedAt: updatedState.updated_at,
  });
}
