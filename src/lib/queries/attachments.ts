import { SupabaseClient } from "@supabase/supabase-js";
import type { IdeaAttachment } from "@/types";

// ── Create ──────────────────────────────────────────────

export interface CreateAttachmentInput {
  idea_id: string;
  original_file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  upload_order: number;
}

/**
 * Insert multiple attachment records in a single batch.
 */
export async function createAttachments(
  supabase: SupabaseClient,
  attachments: CreateAttachmentInput[]
): Promise<{ data: IdeaAttachment[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea_attachment")
    .insert(attachments)
    .select();

  return {
    data: (data as IdeaAttachment[] | null) ?? null,
    error: error?.message ?? null,
  };
}

// ── Read ────────────────────────────────────────────────

/**
 * Get all attachments for a single idea, ordered by upload_order.
 */
export async function getAttachmentsByIdeaId(
  supabase: SupabaseClient,
  ideaId: string
): Promise<{ data: IdeaAttachment[]; error: string | null }> {
  const { data, error } = await supabase
    .from("idea_attachment")
    .select("*")
    .eq("idea_id", ideaId)
    .order("upload_order", { ascending: true });

  return {
    data: (data ?? []) as IdeaAttachment[],
    error: error?.message ?? null,
  };
}

/**
 * Get attachments for multiple ideas, grouped by idea_id.
 * Useful for list pages to avoid N+1 queries.
 */
export async function getAttachmentsForIdeas(
  supabase: SupabaseClient,
  ideaIds: string[]
): Promise<{ data: Record<string, IdeaAttachment[]>; error: string | null }> {
  if (ideaIds.length === 0) {
    return { data: {}, error: null };
  }

  const { data, error } = await supabase
    .from("idea_attachment")
    .select("*")
    .in("idea_id", ideaIds)
    .order("upload_order", { ascending: true });

  const grouped: Record<string, IdeaAttachment[]> = {};
  for (const att of (data ?? []) as IdeaAttachment[]) {
    if (!grouped[att.idea_id]) {
      grouped[att.idea_id] = [];
    }
    grouped[att.idea_id].push(att);
  }

  return {
    data: grouped,
    error: error?.message ?? null,
  };
}

// ── Delete ──────────────────────────────────────────────

/**
 * Delete all attachments for a given idea.
 */
export async function deleteAttachmentsByIdeaId(
  supabase: SupabaseClient,
  ideaId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("idea_attachment")
    .delete()
    .eq("idea_id", ideaId);

  return {
    error: error?.message ?? null,
  };
}
