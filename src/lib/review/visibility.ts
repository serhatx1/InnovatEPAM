import type { ReviewStageEvent, ReviewStage } from "@/types";

// ── Types ───────────────────────────────────────────────

/** Submitter-facing event (stripped of actor/comments during non-terminal) */
export interface SubmitterEvent {
  toStage: string;
  occurredAt: string;
}

/** Full event for admin/evaluator (all fields visible) */
export interface FullEvent {
  id: string;
  fromStage: string | null;
  toStage: string;
  action: string;
  evaluatorComment: string | null;
  actorId: string;
  occurredAt: string;
}

/** Submitter-facing progress (non-terminal: stage + timestamps only) */
export interface SubmitterProgress {
  ideaId: string;
  currentStage: string;
  currentStageUpdatedAt: string;
  events: SubmitterEvent[];
}

/** Full progress for admin/evaluator */
export interface FullProgress {
  ideaId: string;
  currentStage: string;
  currentStageUpdatedAt: string;
  terminalOutcome: string | null;
  stateVersion: number;
  events: FullEvent[];
}

// ── Helpers ─────────────────────────────────────────────

/**
 * Build a map of stage IDs to stage names from a stages array.
 */
function buildStageNameMap(stages: ReviewStage[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const stage of stages) {
    map.set(stage.id, stage.name);
  }
  return map;
}

// ── Visibility Shaping ──────────────────────────────────

/**
 * Shape review progress for a submitter (non-terminal state).
 * Strips actor identity and evaluator comments.
 */
export function shapeSubmitterProgress(
  ideaId: string,
  currentStageName: string,
  updatedAt: string,
  events: ReviewStageEvent[],
  stages: ReviewStage[]
): SubmitterProgress {
  const stageNames = buildStageNameMap(stages);

  return {
    ideaId,
    currentStage: currentStageName,
    currentStageUpdatedAt: updatedAt,
    events: events.map((event) => ({
      toStage: stageNames.get(event.to_stage_id) ?? "Unknown",
      occurredAt: event.occurred_at,
    })),
  };
}

/**
 * Shape review progress for admin/evaluator (full access).
 * Includes actor identity, comments, actions, and terminal outcome.
 */
export function shapeFullProgress(
  ideaId: string,
  currentStageName: string,
  updatedAt: string,
  terminalOutcome: string | null,
  stateVersion: number,
  events: ReviewStageEvent[],
  stages: ReviewStage[]
): FullProgress {
  const stageNames = buildStageNameMap(stages);

  return {
    ideaId,
    currentStage: currentStageName,
    currentStageUpdatedAt: updatedAt,
    terminalOutcome,
    stateVersion,
    events: events.map((event) => ({
      id: event.id,
      fromStage: event.from_stage_id
        ? stageNames.get(event.from_stage_id) ?? "Unknown"
        : null,
      toStage: stageNames.get(event.to_stage_id) ?? "Unknown",
      action: event.action,
      evaluatorComment: event.evaluator_comment,
      actorId: event.actor_id,
      occurredAt: event.occurred_at,
    })),
  };
}

/**
 * Determine which shaping function to apply based on role and terminal outcome.
 * - Admin/evaluator: always gets full progress.
 * - Submitter during non-terminal: gets stripped progress.
 * - Submitter after terminal: gets full progress.
 */
export function shapeProgressByRole(
  role: "admin" | "evaluator" | "submitter",
  ideaId: string,
  currentStageName: string,
  updatedAt: string,
  terminalOutcome: string | null,
  stateVersion: number,
  events: ReviewStageEvent[],
  stages: ReviewStage[]
): SubmitterProgress | FullProgress {
  if (role === "admin" || role === "evaluator") {
    return shapeFullProgress(
      ideaId,
      currentStageName,
      updatedAt,
      terminalOutcome,
      stateVersion,
      events,
      stages
    );
  }

  // Submitter after terminal outcome gets full progress
  if (terminalOutcome !== null) {
    return shapeFullProgress(
      ideaId,
      currentStageName,
      updatedAt,
      terminalOutcome,
      stateVersion,
      events,
      stages
    );
  }

  // Submitter during non-terminal: stripped view
  return shapeSubmitterProgress(
    ideaId,
    currentStageName,
    updatedAt,
    events,
    stages
  );
}
