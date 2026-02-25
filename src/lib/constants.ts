/**
 * Shared constants for the InnovatEPAM Portal.
 * Single source of truth — imported by validation schemas, API routes, and UI components.
 */

import type { CategoryFieldDefinition } from "@/types";

export const IDEA_CATEGORIES = [
  "Process Improvement",
  "Technology Innovation",
  "Cost Reduction",
  "Customer Experience",
  "Employee Engagement",
] as const;

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

/** Maximum file size in bytes (10 MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10,485,760 bytes

/** Maximum total attachment size in bytes (25 MB) */
export const MAX_TOTAL_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 26,214,400 bytes

/** Maximum number of file attachments per idea */
export const MAX_ATTACHMENTS = 5;

/** Allowed MIME types for idea attachments (9 unique MIME types covering 10 extensions) */
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
] as const;

/** Image MIME types (for thumbnail detection on detail page) */
export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

/** Human-readable labels for file types (for UI display and error messages) */
export const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/gif": "GIF",
  "image/webp": "WEBP",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "text/csv": "CSV",
};

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

export const CATEGORY_FIELD_DEFINITIONS: Record<IdeaCategory, CategoryFieldDefinition[]> = {
  "Process Improvement": [
    {
      field_key: "current_process",
      field_label: "Current Process",
      field_type: "textarea",
      is_required: true,
    },
    {
      field_key: "time_saved_hours",
      field_label: "Estimated Hours Saved (monthly)",
      field_type: "number",
      is_required: true,
      min: 1,
      max: 1000,
    },
  ],
  "Technology Innovation": [
    {
      field_key: "technology_area",
      field_label: "Technology Area",
      field_type: "select",
      is_required: true,
      options: ["AI/ML", "Automation", "Cloud", "Data"],
    },
    {
      field_key: "prototype_readiness",
      field_label: "Prototype Readiness",
      field_type: "select",
      is_required: false,
      options: ["Concept", "Prototype", "Pilot", "Production"],
    },
  ],
  "Cost Reduction": [
    {
      field_key: "cost_area",
      field_label: "Cost Area",
      field_type: "text",
      is_required: true,
    },
    {
      field_key: "estimated_savings",
      field_label: "Estimated Savings (USD)",
      field_type: "number",
      is_required: true,
      min: 0,
      max: 1000000,
    },
  ],
  "Customer Experience": [
    {
      field_key: "target_customer_segment",
      field_label: "Target Customer Segment",
      field_type: "text",
      is_required: true,
    },
    {
      field_key: "expected_nps_impact",
      field_label: "Expected NPS Impact",
      field_type: "number",
      is_required: false,
      min: -100,
      max: 100,
    },
  ],
  "Employee Engagement": [
    {
      field_key: "target_team",
      field_label: "Target Team",
      field_type: "text",
      is_required: true,
    },
    {
      field_key: "engagement_metric",
      field_label: "Engagement Metric",
      field_type: "select",
      is_required: true,
      options: ["Participation", "Satisfaction", "Retention", "Productivity"],
    },
  ],
};
