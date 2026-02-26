/** Shared TypeScript types for the InnovatEPAM Portal */

export type IdeaStatus = "draft" | "submitted" | "under_review" | "accepted" | "rejected";
export type ReviewTerminalOutcome = "accepted" | "rejected";
export type ReviewTransitionAction =
  | "advance"
  | "return"
  | "hold"
  | "terminal_accept"
  | "terminal_reject";

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
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Metadata for a single file attachment stored in idea_attachment table */
export interface IdeaAttachment {
  id: string;
  idea_id: string;
  original_file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  upload_order: number;
  created_at: string;
}

/** Attachment as returned in API responses (signed download URL, no storage_path) */
export interface AttachmentResponse {
  id: string | null;
  original_file_name: string;
  file_size: number | null;
  mime_type: string;
  upload_order: number;
  download_url: string;
}

/** Idea with full attachment details for detail/create responses */
export interface IdeaWithAttachments extends Idea {
  signed_attachment_url: string | null;
  attachments: AttachmentResponse[];
}

export interface ReviewWorkflow {
  id: string;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  activated_at: string | null;
}

export interface ReviewStage {
  id: string;
  workflow_id: string;
  name: string;
  position: number;
  is_enabled: boolean;
  created_at: string;
}

export interface IdeaStageState {
  idea_id: string;
  workflow_id: string;
  current_stage_id: string;
  state_version: number;
  terminal_outcome: ReviewTerminalOutcome | null;
  updated_by: string;
  updated_at: string;
}

export interface ReviewStageEvent {
  id: string;
  idea_id: string;
  workflow_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  action: ReviewTransitionAction;
  evaluator_comment: string | null;
  actor_id: string;
  occurred_at: string;
}
