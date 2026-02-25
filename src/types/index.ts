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
