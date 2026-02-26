import { z } from "zod";

/**
 * Zod schema for the PUT /api/admin/settings/blind-review request body.
 * Validates that `enabled` is a boolean.
 */
export const blindReviewSettingSchema = z.object({
  enabled: z.boolean({ message: "enabled must be a boolean" }),
});

export type BlindReviewSettingInput = z.infer<typeof blindReviewSettingSchema>;
