import { z } from "zod";
import {
  REVIEW_WORKFLOW_MIN_STAGES,
  REVIEW_WORKFLOW_MAX_STAGES,
} from "@/lib/constants";

export const reviewStageInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Stage name is required")
    .max(80, "Stage name must not exceed 80 characters"),
});

export const reviewWorkflowInputSchema = z
  .object({
    stages: z
      .array(reviewStageInputSchema)
      .min(
        REVIEW_WORKFLOW_MIN_STAGES,
        `Workflow must contain at least ${REVIEW_WORKFLOW_MIN_STAGES} stages`
      )
      .max(
        REVIEW_WORKFLOW_MAX_STAGES,
        `Workflow must contain at most ${REVIEW_WORKFLOW_MAX_STAGES} stages`
      ),
  })
  .superRefine((payload, context) => {
    const seenNames = new Set<string>();

    payload.stages.forEach((stage, index) => {
      const normalized = stage.name.toLowerCase();
      if (seenNames.has(normalized)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stages", index, "name"],
          message: "Stage names must be unique within the workflow",
        });
      }
      seenNames.add(normalized);
    });
  });

export const reviewWorkflowResponseSchema = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  is_active: z.boolean(),
  activated_at: z.iso.datetime().nullable(),
  stages: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      position: z.number().int().positive(),
      is_enabled: z.boolean(),
    })
  ),
});

export type ReviewStageInput = z.infer<typeof reviewStageInputSchema>;
export type ReviewWorkflowInput = z.infer<typeof reviewWorkflowInputSchema>;
export type ReviewWorkflowResponse = z.infer<typeof reviewWorkflowResponseSchema>;