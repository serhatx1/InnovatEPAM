/** Shared TypeScript types for the InnovatEPAM Portal */

export type IdeaStatus = "submitted" | "under_review" | "accepted" | "rejected";

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
  status: IdeaStatus;
  attachment_url: string | null;
  evaluator_comment: string | null;
  created_at: string;
  updated_at: string;
}
