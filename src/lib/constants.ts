/** Shared application constants — single source of truth */

export const IDEA_CATEGORIES = [
  "Process Improvement",
  "Technology Innovation",
  "Cost Reduction",
  "Customer Experience",
  "Employee Engagement",
] as const;

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

/** Maximum file size for idea attachments: 5 MB */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Allowed MIME types for idea attachments */
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

/**
 * Valid status transitions for ideas.
 * Terminal states (accepted, rejected) have no outgoing transitions.
 */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ["under_review", "accepted", "rejected"],
  under_review: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};
