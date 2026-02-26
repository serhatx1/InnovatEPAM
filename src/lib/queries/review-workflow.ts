import { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewWorkflow, ReviewStage } from "@/types";

// ── Types ───────────────────────────────────────────────

export interface WorkflowWithStages extends ReviewWorkflow {
  stages: ReviewStage[];
}

export interface CreateWorkflowInput {
  stages: { name: string }[];
  created_by: string;
}

// ── Get Active Workflow ─────────────────────────────────

/**
 * Fetch the currently active workflow with its ordered stages.
 */
export async function getActiveWorkflow(
  supabase: SupabaseClient
): Promise<{ data: WorkflowWithStages | null; error: string | null }> {
  const { data: workflow, error: wfError } = await supabase
    .from("review_workflow")
    .select("*")
    .eq("is_active", true)
    .single();

  if (wfError) {
    // PGRST116 = no rows found
    if (wfError.code === "PGRST116") {
      return { data: null, error: null };
    }
    return { data: null, error: wfError.message };
  }

  const { data: stages, error: stError } = await supabase
    .from("review_stage")
    .select("*")
    .eq("workflow_id", workflow.id)
    .order("position", { ascending: true });

  if (stError) {
    return { data: null, error: stError.message };
  }

  return {
    data: {
      ...(workflow as ReviewWorkflow),
      stages: (stages ?? []) as ReviewStage[],
    },
    error: null,
  };
}

// ── Get Workflow By ID ──────────────────────────────────

/**
 * Fetch a specific workflow version by ID with its ordered stages.
 */
export async function getWorkflowById(
  supabase: SupabaseClient,
  workflowId: string
): Promise<{ data: WorkflowWithStages | null; error: string | null }> {
  const { data: workflow, error: wfError } = await supabase
    .from("review_workflow")
    .select("*")
    .eq("id", workflowId)
    .single();

  if (wfError) {
    if (wfError.code === "PGRST116") {
      return { data: null, error: null };
    }
    return { data: null, error: wfError.message };
  }

  const { data: stages, error: stError } = await supabase
    .from("review_stage")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("position", { ascending: true });

  if (stError) {
    return { data: null, error: stError.message };
  }

  return {
    data: {
      ...(workflow as ReviewWorkflow),
      stages: (stages ?? []) as ReviewStage[],
    },
    error: null,
  };
}

// ── Get Next Version ────────────────────────────────────

/**
 * Determine the next monotonic version number for a new workflow.
 */
export async function getNextWorkflowVersion(
  supabase: SupabaseClient
): Promise<{ data: number; error: string | null }> {
  const { data, error } = await supabase
    .from("review_workflow")
    .select("version")
    .order("version", { ascending: false })
    .limit(1);

  if (error) {
    return { data: 1, error: error.message };
  }

  const maxVersion = data && data.length > 0 ? (data[0] as { version: number }).version : 0;
  return { data: maxVersion + 1, error: null };
}

// ── Create and Activate Workflow ────────────────────────

/**
 * Create a new workflow version with stages and activate it.
 * Deactivates any previously active workflow first.
 */
export async function createAndActivateWorkflow(
  supabase: SupabaseClient,
  input: CreateWorkflowInput
): Promise<{ data: WorkflowWithStages | null; error: string | null }> {
  // 1. Get next version
  const { data: version, error: versionError } = await getNextWorkflowVersion(supabase);
  if (versionError) {
    return { data: null, error: versionError };
  }

  // 2. Deactivate current active workflow (if any)
  const { error: deactivateError } = await supabase
    .from("review_workflow")
    .update({ is_active: false })
    .eq("is_active", true);

  if (deactivateError) {
    return { data: null, error: deactivateError.message };
  }

  // 3. Insert new workflow
  const { data: workflow, error: wfError } = await supabase
    .from("review_workflow")
    .insert({
      version,
      is_active: true,
      created_by: input.created_by,
      activated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (wfError) {
    return { data: null, error: wfError.message };
  }

  // 4. Insert stages with sequential positions
  const stageRows = input.stages.map((stage, index) => ({
    workflow_id: workflow.id,
    name: stage.name,
    position: index + 1,
  }));

  const { data: stages, error: stError } = await supabase
    .from("review_stage")
    .insert(stageRows)
    .select()
    .order("position", { ascending: true });

  if (stError) {
    return { data: null, error: stError.message };
  }

  return {
    data: {
      ...(workflow as ReviewWorkflow),
      stages: (stages ?? []) as ReviewStage[],
    },
    error: null,
  };
}
