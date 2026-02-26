import { SupabaseClient } from "@supabase/supabase-js";
import type { Idea } from "@/types";

// ── Types ───────────────────────────────────────────────

export interface DraftInput {
  title?: string;
  description?: string;
  category?: string;
  category_fields?: Record<string, unknown>;
}

// ── Create ──────────────────────────────────────────────

/**
 * Create a new draft idea with relaxed field requirements.
 */
export async function createDraft(
  supabase: SupabaseClient,
  input: DraftInput & { user_id: string }
): Promise<{ data: Idea | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea")
    .insert({
      user_id: input.user_id,
      title: input.title ?? "",
      description: input.description ?? "",
      category: input.category ?? "",
      category_fields: input.category_fields ?? {},
      status: "draft",
    })
    .select()
    .single();

  return {
    data: data as Idea | null,
    error: error?.message ?? null,
  };
}

// ── Update ──────────────────────────────────────────────

/**
 * Update an existing draft's fields.
 */
export async function updateDraft(
  supabase: SupabaseClient,
  id: string,
  input: DraftInput
): Promise<{ data: Idea | null; error: string | null }> {
  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.category_fields !== undefined) updateData.category_fields = input.category_fields;

  const { data, error } = await supabase
    .from("idea")
    .update(updateData)
    .eq("id", id)
    .eq("status", "draft")
    .is("deleted_at", null)
    .select()
    .single();

  return {
    data: data as Idea | null,
    error: error?.message ?? null,
  };
}

// ── Read ────────────────────────────────────────────────

/**
 * Get a single draft by ID, owned by the current user.
 * Returns null for soft-deleted, non-draft, or non-owned ideas.
 */
export async function getDraftById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: Idea | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea")
    .select("*")
    .eq("id", id)
    .eq("status", "draft")
    .is("deleted_at", null)
    .single();

  return {
    data: data as Idea | null,
    error: error?.message ?? null,
  };
}

/**
 * List all active drafts for a user, ordered by most recently updated.
 */
export async function listDrafts(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: Idea[]; error: string | null }> {
  const { data, error } = await supabase
    .from("idea")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "draft")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  return {
    data: (data ?? []) as Idea[],
    error: error?.message ?? null,
  };
}

// ── Soft Delete ─────────────────────────────────────────

/**
 * Soft-delete a draft by setting deleted_at to now.
 */
export async function softDeleteDraft(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: Idea | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft")
    .is("deleted_at", null)
    .select()
    .single();

  return {
    data: data as Idea | null,
    error: error?.message ?? null,
  };
}

// ── Submit ──────────────────────────────────────────────

/**
 * Transition a draft to submitted status.
 */
export async function submitDraft(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: Idea | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea")
    .update({ status: "submitted" })
    .eq("id", id)
    .eq("status", "draft")
    .is("deleted_at", null)
    .select()
    .single();

  return {
    data: data as Idea | null,
    error: error?.message ?? null,
  };
}

// ── Count ───────────────────────────────────────────────

/**
 * Return the count of active (non-deleted) drafts for a user.
 */
export async function getDraftCount(
  supabase: SupabaseClient,
  userId: string
): Promise<{ count: number; error: string | null }> {
  const { count, error } = await supabase
    .from("idea")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "draft")
    .is("deleted_at", null);

  return {
    count: count ?? 0,
    error: error?.message ?? null,
  };
}
