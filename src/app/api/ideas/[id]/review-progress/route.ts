import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, getIdeaById } from "@/lib/queries";
import { getIdeaStageStateWithEvents } from "@/lib/queries/review-state";
import { getWorkflowById } from "@/lib/queries/review-workflow";
import { shapeProgressByRole } from "@/lib/review/visibility";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: ideaId } = await params;

  // ── Auth ──────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Role check ────────────────────────────────────────
  const role = await getUserRole(supabase, user.id);

  // ── Fetch idea to verify existence and ownership ──────
  const { data: idea, error: ideaError } = await getIdeaById(supabase, ideaId);

  if (ideaError || !idea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  // Only the owner, admin, or evaluator can see review progress
  const isOwner = idea.user_id === user.id;
  if (!isOwner && role !== "admin" && role !== "evaluator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Fetch stage state with events ─────────────────────
  const { data: stateWithEvents, error: stateError } =
    await getIdeaStageStateWithEvents(supabase, ideaId);

  if (stateError || !stateWithEvents) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  const { events, ...state } = stateWithEvents;

  // ── Fetch workflow to resolve stage names ──────────────
  const { data: workflow, error: wfError } = await getWorkflowById(
    supabase,
    state.workflow_id
  );

  if (wfError || !workflow) {
    return NextResponse.json(
      { error: "Workflow not found" },
      { status: 500 }
    );
  }

  // Resolve current stage name
  const currentStage = workflow.stages.find(
    (s) => s.id === state.current_stage_id
  );
  const currentStageName = currentStage?.name ?? "Unknown";

  // ── Shape response by role ────────────────────────────
  const effectiveRole = isOwner && role !== "admin" && role !== "evaluator"
    ? "submitter"
    : (role as "admin" | "evaluator");

  const progress = shapeProgressByRole(
    effectiveRole,
    ideaId,
    currentStageName,
    state.updated_at,
    state.terminal_outcome,
    state.state_version,
    events,
    workflow.stages
  );

  return NextResponse.json(progress, { status: 200 });
}
