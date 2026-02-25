import { z } from "zod";
import {
  IDEA_CATEGORIES,
  MAX_FILE_SIZE,
  MAX_TOTAL_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS,
  ALLOWED_FILE_TYPES,
  FILE_TYPE_LABELS,
} from "@/lib/constants";
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

/** Human-readable label string from FILE_TYPE_LABELS for error messages */
const acceptedFormatsLabel = Object.values(FILE_TYPE_LABELS).join(", ");

/**
 * Validate a single file attachment against size and type constraints.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateFile(file: File): string | null {
  if (file.size === 0) {
    return "File is empty";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "File must not exceed 10 MB";
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
    return `Accepted formats: ${acceptedFormatsLabel}`;
  }

  return null;
}

/** Result of multi-file validation. Null means all files are valid. */
export interface ValidateFilesError {
  countError?: string;
  totalSizeError?: string;
  fileErrors?: Array<{ index: number; name: string; error: string }>;
  valid: File[];
}

/**
 * Validate multiple file attachments (count, individual file rules, total size).
 * Returns null if all files are valid, or a structured error object.
 */
export function validateFiles(files: File[]): ValidateFilesError | null {
  if (files.length === 0) {
    return null;
  }

  const result: ValidateFilesError = { valid: [] };
  let hasError = false;

  // Check count limit
  if (files.length > MAX_ATTACHMENTS) {
    result.countError = "Maximum 5 files allowed";
    hasError = true;
  }

  // Validate individual files
  const fileErrors: Array<{ index: number; name: string; error: string }> = [];
  for (let i = 0; i < files.length; i++) {
    const error = validateFile(files[i]);
    if (error) {
      fileErrors.push({ index: i, name: files[i].name, error });
      hasError = true;
    } else {
      result.valid.push(files[i]);
    }
  }

  if (fileErrors.length > 0) {
    result.fileErrors = fileErrors;
  }

  // Check total size of valid files
  const totalSize = result.valid.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
    result.totalSizeError = "Total attachment size must not exceed 25 MB";
    hasError = true;
  }

  return hasError ? result : null;
}

export { validateCategoryFieldsForCategory };
