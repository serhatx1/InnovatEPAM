import { z } from "zod";

/**
 * Zod schema for the PUT /api/ideas/[id]/score request body.
 * Validates score (integer 1–5) and optional comment (max 500 chars).
 */
export const scoreSubmissionSchema = z.object({
  score: z
    .number({ message: "Score is required" })
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(5, "Score must be at most 5"),
  comment: z
    .string()
    .trim()
    .max(500, "Comment must not exceed 500 characters")
    .optional()
    .nullable(),
});

export type ScoreSubmissionInput = z.infer<typeof scoreSubmissionSchema>;
