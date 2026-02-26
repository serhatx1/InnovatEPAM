import type { IdeaStageState } from "@/types";

/**
 * Sentinel error code returned when the expected state version
 * does not match the persisted version (optimistic lock failure).
 */
export const CONCURRENCY_CONFLICT = "CONFLICT" as const;

/**
 * Validate that the expected state version matches the current persisted version.
 * Returns null if valid, or an error message if stale.
 */
export function checkConcurrencyVersion(
  currentState: IdeaStageState,
  expectedVersion: number
): string | null {
  if (currentState.state_version !== expectedVersion) {
    return CONCURRENCY_CONFLICT;
  }
  return null;
}

/**
 * Build a 409 Conflict JSON response body for stale version conflicts.
 */
export function conflictResponse() {
  return {
    error: "Conflict",
    message: "State changed, refresh and retry",
  } as const;
}
