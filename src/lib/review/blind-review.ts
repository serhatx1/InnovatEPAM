import type { Idea, ReviewTerminalOutcome } from "@/types";

// ── Types ───────────────────────────────────────────────

export interface AnonymizeParams {
  viewerRole: string;
  viewerId: string;
  ideaUserId: string;
  terminalOutcome: ReviewTerminalOutcome | null;
  blindReviewEnabled: boolean;
}

/** An idea with optional submitter display name added by anonymization. */
export type AnonymizedIdea = Idea & {
  submitter_display_name?: string;
};

// ── Core Decision ───────────────────────────────────────

/**
 * Determine whether a given idea should be anonymized for the current viewer.
 *
 * Returns true when ALL of these conditions hold:
 * 1. Blind review is enabled
 * 2. Viewer is NOT an admin
 * 3. Viewer is NOT the idea submitter (self-view exemption)
 * 4. Idea does NOT have a terminal outcome (accepted/rejected)
 */
export function shouldAnonymize(params: AnonymizeParams): boolean {
  const { blindReviewEnabled, viewerRole, viewerId, ideaUserId, terminalOutcome } = params;

  if (!blindReviewEnabled) return false;
  if (viewerRole === "admin") return false;
  if (viewerId === ideaUserId) return false;
  if (terminalOutcome !== null && terminalOutcome !== undefined) return false;

  return true;
}

// ── Response Masking ────────────────────────────────────

const ANONYMOUS_USER_ID = "anonymous";
const ANONYMOUS_DISPLAY_NAME = "Anonymous Submitter";

/**
 * Mask identity fields on a single idea response.
 * When `mask` is true, replaces user_id and adds anonymous display name.
 */
export function anonymizeIdeaResponse<T extends Idea>(
  idea: T,
  mask: boolean
): T & { submitter_display_name?: string } {
  if (!mask) {
    return idea;
  }

  return {
    ...idea,
    user_id: ANONYMOUS_USER_ID,
    submitter_display_name: ANONYMOUS_DISPLAY_NAME,
  };
}

/**
 * Apply anonymization to a list of ideas for a specific viewer.
 * Each idea is individually evaluated for masking based on its own
 * terminal state and the viewer's relationship to it.
 *
 * @param ideas - Array of ideas to potentially anonymize
 * @param viewerRole - Role of the current viewer ("admin" | "submitter")
 * @param viewerId - ID of the current viewer
 * @param blindReviewEnabled - Whether blind review is currently enabled
 * @param terminalOutcomes - Map of idea_id → terminal_outcome (from idea_stage_state)
 */
export function anonymizeIdeaList<T extends Idea>(
  ideas: T[],
  viewerRole: string,
  viewerId: string,
  blindReviewEnabled: boolean,
  terminalOutcomes: Map<string, ReviewTerminalOutcome | null> = new Map()
): (T & { submitter_display_name?: string })[] {
  return ideas.map((idea) => {
    const terminalOutcome = terminalOutcomes.get(idea.id) ?? null;
    const mask = shouldAnonymize({
      viewerRole,
      viewerId,
      ideaUserId: idea.user_id,
      terminalOutcome,
      blindReviewEnabled,
    });
    return anonymizeIdeaResponse(idea, mask);
  });
}
