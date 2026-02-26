import type { IdeaScore } from "@/types";

/** Score entry with optional display name for API responses. */
export type ScoreEntryResponse = IdeaScore & {
  evaluatorDisplayName?: string;
};

/**
 * Mask evaluator identity on a score entry when blind review requires anonymization.
 *
 * When `mask` is true:
 * - `evaluator_id` → `"anonymous"`
 * - `evaluatorDisplayName` → `"Anonymous Evaluator"`
 *
 * When `mask` is false: returns the score unchanged.
 */
export function anonymizeScoreEntry(
  score: IdeaScore,
  mask: boolean
): ScoreEntryResponse {
  if (!mask) {
    return score;
  }

  return {
    ...score,
    evaluator_id: "anonymous",
    evaluatorDisplayName: "Anonymous Evaluator",
  };
}
