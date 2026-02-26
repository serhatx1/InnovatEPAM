import { z } from "zod";
import {
  REVIEW_TRANSITION_ACTIONS,
  REVIEW_TERMINAL_OUTCOMES,
} from "@/lib/constants";

export const reviewTransitionRequestSchema = z.object({
  action: z.enum(REVIEW_TRANSITION_ACTIONS),
  expectedStateVersion: z
    .number()
    .int("expectedStateVersion must be an integer")
    .positive("expectedStateVersion must be greater than 0"),
  comment: z.string().trim().max(1000, "Comment must not exceed 1000 characters").optional(),
});

export const reviewTransitionResponseSchema = z.object({
  ideaId: z.uuid(),
  workflowId: z.uuid(),
  currentStageId: z.uuid(),
  currentStageName: z.string(),
  stateVersion: z.number().int().positive(),
  terminalOutcome: z.enum(REVIEW_TERMINAL_OUTCOMES).nullable(),
  updatedAt: z.iso.datetime(),
});

export type ReviewTransitionRequest = z.infer<typeof reviewTransitionRequestSchema>;
export type ReviewTransitionResponse = z.infer<typeof reviewTransitionResponseSchema>;