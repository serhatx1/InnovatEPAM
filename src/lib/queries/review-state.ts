import { SupabaseClient } from "@supabase/supabase-js";
import type {
  IdeaStageState,
  ReviewStageEvent,
  ReviewTransitionAction,
} from "@/types";

// ── Types ───────────────────────────────────────────────

export interface StageStateWithEvents extends IdeaStageState {
  events: ReviewStageEvent[];
}

export interface CreateStageStateInput {
  idea_id: string;
  workflow_id: string;
  current_stage_id: string;
  updated_by: string;
}

export interface RecordStageEventInput {
  idea_id: string;
  workflow_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  action: ReviewTransitionAction;
  evaluator_comment?: string | null;
  actor_id: string;
}

// ── Get Stage State ─────────────────────────────────────

/**
 * Fetch the current stage state for an idea.
 */
export async function getIdeaStageState(
  supabase: SupabaseClient,
  ideaId: string
): Promise<{ data: IdeaStageState | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea_stage_state")
    .select("*")
    .eq("idea_id", ideaId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    return { data: null, error: error.message };
  }

  return { data: data as IdeaStageState, error: null };
}

// ── Get Full State With Events ──────────────────────────

/**
 * Fetch stage state and full event history for an idea.
 * Events are ordered by occurred_at ascending (oldest first).
 */
export async function getIdeaStageStateWithEvents(
  supabase: SupabaseClient,
  ideaId: string
): Promise<{ data: StageStateWithEvents | null; error: string | null }> {
  const { data: state, error: stateError } = await getIdeaStageState(
    supabase,
    ideaId
  );

  if (stateError) {
    return { data: null, error: stateError };
  }
  if (!state) {
    return { data: null, error: null };
  }

  const { data: events, error: eventsError } = await supabase
    .from("review_stage_event")
    .select("*")
    .eq("idea_id", ideaId)
    .order("occurred_at", { ascending: true });

  if (eventsError) {
    return { data: null, error: eventsError.message };
  }

  return {
    data: {
      ...state,
      events: (events ?? []) as ReviewStageEvent[],
    },
    error: null,
  };
}

// ── Create Stage State ──────────────────────────────────

/**
 * Create initial stage state when an idea enters review.
 * Binds the idea to the workflow and sets it at the first stage.
 */
export async function createIdeaStageState(
  supabase: SupabaseClient,
  input: CreateStageStateInput
): Promise<{ data: IdeaStageState | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea_stage_state")
    .insert({
      idea_id: input.idea_id,
      workflow_id: input.workflow_id,
      current_stage_id: input.current_stage_id,
      updated_by: input.updated_by,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as IdeaStageState, error: null };
}

// ── Update Stage State ──────────────────────────────────

/**
 * Update the stage state for an idea with optimistic concurrency.
 * Only succeeds if the expected version matches the current version.
 * On success, increments state_version by 1.
 */
export async function updateIdeaStageState(
  supabase: SupabaseClient,
  ideaId: string,
  expectedVersion: number,
  update: {
    current_stage_id: string;
    updated_by: string;
    terminal_outcome?: "accepted" | "rejected" | null;
  }
): Promise<{ data: IdeaStageState | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea_stage_state")
    .update({
      current_stage_id: update.current_stage_id,
      updated_by: update.updated_by,
      terminal_outcome: update.terminal_outcome ?? null,
      state_version: expectedVersion + 1,
    })
    .eq("idea_id", ideaId)
    .eq("state_version", expectedVersion)
    .select()
    .single();

  if (error) {
    // PGRST116 = no rows matched — stale version (conflict)
    if (error.code === "PGRST116") {
      return { data: null, error: "CONFLICT" };
    }
    return { data: null, error: error.message };
  }

  return { data: data as IdeaStageState, error: null };
}

// ── Record Stage Event ──────────────────────────────────

/**
 * Append an immutable stage decision event to the audit log.
 */
export async function recordStageEvent(
  supabase: SupabaseClient,
  input: RecordStageEventInput
): Promise<{ data: ReviewStageEvent | null; error: string | null }> {
  const { data, error } = await supabase
    .from("review_stage_event")
    .insert({
      idea_id: input.idea_id,
      workflow_id: input.workflow_id,
      from_stage_id: input.from_stage_id,
      to_stage_id: input.to_stage_id,
      action: input.action,
      evaluator_comment: input.evaluator_comment ?? null,
      actor_id: input.actor_id,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as ReviewStageEvent, error: null };
}

// ── Get Events For Idea ─────────────────────────────────

/**
 * List all stage events for an idea, ordered chronologically.
 */
export async function getStageEvents(
  supabase: SupabaseClient,
  ideaId: string
): Promise<{ data: ReviewStageEvent[]; error: string | null }> {
  const { data, error } = await supabase
    .from("review_stage_event")
    .select("*")
    .eq("idea_id", ideaId)
    .order("occurred_at", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as ReviewStageEvent[], error: null };
}
