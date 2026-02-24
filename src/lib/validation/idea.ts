import { z } from "zod";
import {
  IDEA_CATEGORIES,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
} from "@/lib/constants";

export const ideaSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be between 5 and 100 characters")
    .max(100, "Title must be between 5 and 100 characters"),
  description: z
    .string()
    .min(20, "Description must be between 20 and 1000 characters")
    .max(1000, "Description must be between 20 and 1000 characters"),
  category: z.enum(IDEA_CATEGORIES, {
    error: "Invalid category",
  }),
});

export type IdeaInput = z.infer<typeof ideaSchema>;

/** Result of file validation */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file attachment against size and type constraints.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateFile(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File must not exceed 5 MB" };
  }

  if (
    !ALLOWED_FILE_TYPES.includes(
      file.type as (typeof ALLOWED_FILE_TYPES)[number]
    )
  ) {
    return { valid: false, error: "Accepted formats: PDF, PNG, JPG, DOCX" };
  }

  return { valid: true };
}
