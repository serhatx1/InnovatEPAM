import { SupabaseClient } from "@supabase/supabase-js";
import type { Idea } from "@/types";

// ── List ────────────────────────────────────────────────

export interface ListIdeasOptions {
  /** When set, only return ideas owned by this user */
  userId?: string;
}

/**
 * List ideas ordered by newest first.
 * Pass `userId` to scope results to a single submitter;
 * omit it (admin view) to fetch all.
 */
export async function listIdeas(
  supabase: SupabaseClient,
  options: ListIdeasOptions = {}
): Promise<{ data: Idea[]; error: string | null }> {
  let query = supabase
    .from("idea")
    .select("*")
    .order("created_at", { ascending: false });

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data, error } = await query;

  return {
    data: (data ?? []) as Idea[],
    error: error?.message ?? null,
  };
}

// ── Single ──────────────────────────────────────────────

/**
 * Fetch a single idea by its ID.
 */
export async function getIdeaById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: Idea | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea")
    .select("*")
    .eq("id", id)
    .single();

  return {
    data: data as Idea | null,
    error: error?.message ?? null,
  };
}

// ── Create ──────────────────────────────────────────────

export interface CreateIdeaInput {
  user_id: string;
  title: string;
  description: string;
  category: string;
  attachment_url: string | null;
}

/**
 * Insert a new idea and return the created row.
 */
export async function createIdea(
  supabase: SupabaseClient,
  input: CreateIdeaInput
): Promise<{ data: Idea | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea")
    .insert(input)
    .select()
    .single();

  return {
    data: data as Idea | null,
    error: error?.message ?? null,
  };
}

// ── Update status ───────────────────────────────────────

export interface UpdateIdeaStatusInput {
  status: string;
  evaluator_comment?: string;
}

/**
 * Update an idea's status (and optionally the evaluator comment).
 */
export async function updateIdeaStatus(
  supabase: SupabaseClient,
  id: string,
  input: UpdateIdeaStatusInput
): Promise<{ data: Idea | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  return {
    data: data as Idea | null,
    error: error?.message ?? null,
  };
}

// ── Exists ──────────────────────────────────────────────

/**
 * Check whether an idea with the given ID exists.
 */
export async function ideaExists(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("idea")
    .select("id")
    .eq("id", id)
    .single();

  return !error && !!data;
}
