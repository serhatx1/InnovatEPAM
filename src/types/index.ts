/** Shared TypeScript types for the InnovatEPAM Portal */

export type IdeaStatus = "submitted" | "under_review" | "accepted" | "rejected";

export type CategoryFieldType = "text" | "number" | "select" | "textarea";
export type CategoryFieldValue = string | number;
export type CategoryFieldValues = Record<string, CategoryFieldValue>;

export interface CategoryFieldDefinition {
  field_key: string;
  field_label: string;
  field_type: CategoryFieldType;
  is_required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  pattern?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: "submitter" | "admin";
  created_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  category_fields: CategoryFieldValues;
  status: IdeaStatus;
  attachment_url: string | null;
  evaluator_comment: string | null;
  created_at: string;
  updated_at: string;
}
