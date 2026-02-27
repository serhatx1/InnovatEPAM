import { z } from "zod";
import { ideaSchema } from "@/lib/validation/idea";

/**
 * Draft save schema — all fields optional, max-length guards still apply.
 * Used when auto-saving or manually saving a draft.
 */
export const draftSaveSchema = z.object({
  title: z.string().max(100, "Title must not exceed 100 characters").nullish().transform((v) => v ?? ""),
  description: z.string().max(1000, "Description must not exceed 1000 characters").nullish().transform((v) => v ?? ""),
  category: z.string().nullish().transform((v) => v ?? ""),
  category_fields: z.record(z.string(), z.unknown()).nullish().transform((v) => v ?? {}),
});

export type DraftSaveInput = z.infer<typeof draftSaveSchema>;

/**
 * Draft submit schema — reuses full ideaSchema rules.
 * All fields required with full validation (title 5–100, description 20–1000, category required).
 */
export const draftSubmitSchema = ideaSchema;

export type DraftSubmitInput = z.infer<typeof draftSubmitSchema>;
