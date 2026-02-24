import { z } from "zod";
import { IDEA_CATEGORIES, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/constants";
import { validateCategoryFieldsForCategory } from "@/lib/validation/category-fields";

export const ideaSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be between 5 and 100 characters")
    .max(100, "Title must be between 5 and 100 characters"),
  description: z
    .string()
    .min(20, "Description must be between 20 and 1000 characters")
    .max(1000, "Description must be between 20 and 1000 characters"),
  category: z.enum(IDEA_CATEGORIES, { message: "Invalid category" }),
});

export type IdeaInput = z.infer<typeof ideaSchema>;

/**
 * Validate a file attachment against size and type constraints.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return "File must not exceed 5 MB";
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
    return "Accepted formats: PDF, PNG, JPG, DOCX";
  }

  return null;
}

export { validateCategoryFieldsForCategory };
