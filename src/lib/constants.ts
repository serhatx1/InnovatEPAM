/**
 * Shared constants for the InnovatEPAM Portal.
 * Single source of truth — imported by validation schemas, API routes, and UI components.
 */

export const IDEA_CATEGORIES = [
  "Process Improvement",
  "Technology Innovation",
  "Cost Reduction",
  "Customer Experience",
  "Employee Engagement",
] as const;

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

/** Maximum file size in bytes (5 MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes

/** Allowed MIME types for idea attachments */
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

/**
 * Valid status transitions for idea lifecycle.
 * Terminal states (accepted, rejected) have no outgoing transitions.
 */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ["under_review", "accepted", "rejected"],
  under_review: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};
