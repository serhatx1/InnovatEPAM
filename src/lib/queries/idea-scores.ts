import { SupabaseClient } from "@supabase/supabase-js";
import type { IdeaScore, ScoreAggregate } from "@/types";

// ── Upsert ──────────────────────────────────────────────

export interface UpsertScoreInput {
  idea_id: string;
  evaluator_id: string;
  score: number;
  comment: string | null;
}

/**
 * Insert or update an evaluator's score for an idea.
 * Uses Supabase `.upsert()` with `onConflict: "idea_id,evaluator_id"`.
 */
export async function upsertScore(
  supabase: SupabaseClient,
  input: UpsertScoreInput
): Promise<{ data: IdeaScore | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea_score")
    .upsert(
      {
        idea_id: input.idea_id,
        evaluator_id: input.evaluator_id,
        score: input.score,
        comment: input.comment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "idea_id,evaluator_id" }
    )
    .select()
    .single();

  return {
    data: data as IdeaScore | null,
    error: error?.message ?? null,
  };
}

// ── Read ────────────────────────────────────────────────

/**
 * Fetch all individual scores for a given idea.
 */
export async function getScoresForIdea(
  supabase: SupabaseClient,
  ideaId: string
): Promise<{ data: IdeaScore[]; error: string | null }> {
  const { data, error } = await supabase
    .from("idea_score")
    .select("*")
    .eq("idea_id", ideaId)
    .order("created_at", { ascending: false });

  return {
    data: (data ?? []) as IdeaScore[],
    error: error?.message ?? null,
  };
}

/**
 * Compute aggregate (avg + count) for a single idea.
 * Returns { avgScore: null, scoreCount: 0 } if no scores exist.
 */
export async function getScoreAggregateForIdea(
  supabase: SupabaseClient,
  ideaId: string
): Promise<{ data: ScoreAggregate; error: string | null }> {
  const { data, error } = await supabase
    .from("idea_score")
    .select("score")
    .eq("idea_id", ideaId);

  if (error) {
    return {
      data: { avgScore: null, scoreCount: 0 },
      error: error.message,
    };
  }

  const scores = data ?? [];
  if (scores.length === 0) {
    return {
      data: { avgScore: null, scoreCount: 0 },
      error: null,
    };
  }

  const sum = scores.reduce((acc, row) => acc + row.score, 0);
  const avg = Math.round((sum / scores.length) * 10) / 10; // 1 decimal

  return {
    data: { avgScore: avg, scoreCount: scores.length },
    error: null,
  };
}

/**
 * Compute aggregates for multiple ideas at once (batch).
 * Returns a Map<ideaId, ScoreAggregate>.
 */
export async function getScoreAggregatesForIdeas(
  supabase: SupabaseClient,
  ideaIds: string[]
): Promise<{ data: Map<string, ScoreAggregate>; error: string | null }> {
  const result = new Map<string, ScoreAggregate>();

  if (ideaIds.length === 0) {
    return { data: result, error: null };
  }

  const { data, error } = await supabase
    .from("idea_score")
    .select("idea_id, score")
    .in("idea_id", ideaIds);

  if (error) {
    return { data: result, error: error.message };
  }

  // Group scores by idea_id and compute aggregates
  const grouped = new Map<string, number[]>();
  for (const row of data ?? []) {
    const scores = grouped.get(row.idea_id) ?? [];
    scores.push(row.score);
    grouped.set(row.idea_id, scores);
  }

  for (const ideaId of ideaIds) {
    const scores = grouped.get(ideaId);
    if (!scores || scores.length === 0) {
      result.set(ideaId, { avgScore: null, scoreCount: 0 });
    } else {
      const sum = scores.reduce((acc, s) => acc + s, 0);
      const avg = Math.round((sum / scores.length) * 10) / 10;
      result.set(ideaId, { avgScore: avg, scoreCount: scores.length });
    }
  }

  return { data: result, error: null };
}
