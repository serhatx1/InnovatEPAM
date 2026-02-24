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
