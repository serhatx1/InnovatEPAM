import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/queries";
import { getIdeaStageStateWithEvents } from "@/lib/queries/review-state";
import { getWorkflowById } from "@/lib/queries/review-workflow";
import { ideaExists } from "@/lib/queries";

/**
 * GET /api/admin/review/ideas/[id]/stage
 * Return full stage state and event history for admin/evaluator review tooling.
 * Role: admin or evaluator.
 */
export async function GET(
  _request: Request,
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

  // Check idea exists
  const exists = await ideaExists(supabase, id);
  if (!exists) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  // Get stage state with events
  const { data: stateWithEvents, error } = await getIdeaStageStateWithEvents(
    supabase,
    id
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (!stateWithEvents) {
    return NextResponse.json(
      { error: "Idea not found" },
      { status: 404 }
    );
  }

  // Fetch workflow stages for name resolution
  const { data: workflow } = await getWorkflowById(
    supabase,
    stateWithEvents.workflow_id
  );

  const stageMap = new Map(
    workflow?.stages.map((s) => [s.id, s.name]) ?? []
  );

  return NextResponse.json({
    ideaId: id,
    workflowId: stateWithEvents.workflow_id,
    currentStageId: stateWithEvents.current_stage_id,
    currentStageName: stageMap.get(stateWithEvents.current_stage_id) ?? "Unknown",
    stateVersion: stateWithEvents.state_version,
    terminalOutcome: stateWithEvents.terminal_outcome,
    updatedAt: stateWithEvents.updated_at,
    events: stateWithEvents.events.map((e) => ({
      id: e.id,
      fromStage: e.from_stage_id ? stageMap.get(e.from_stage_id) ?? "Unknown" : null,
      toStage: stageMap.get(e.to_stage_id) ?? "Unknown",
      action: e.action,
      evaluatorComment: e.evaluator_comment,
      actorId: e.actor_id,
      occurredAt: e.occurred_at,
    })),
  });
}
