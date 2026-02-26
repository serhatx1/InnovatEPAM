import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, getIdeaById } from "@/lib/queries";
import { getScoresForIdea, getScoreAggregateForIdea } from "@/lib/queries/idea-scores";
import { getBlindReviewEnabled } from "@/lib/queries/portal-settings";
import { getIdeaStageState } from "@/lib/queries/review-state";
import { anonymizeScoreEntry } from "@/lib/review/score-anonymize";

/**
 * GET /api/ideas/[id]/scores — Retrieve all scores + aggregate for an idea.
 * Role: admin or submitter (own idea only).
 * Blind review masking applied to evaluator identities.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ideaId } = await params;
  const supabase = await createClient();

  // ── Auth ───────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Fetch idea ─────────────────────────────────────────
  const { data: idea, error: ideaError } = await getIdeaById(supabase, ideaId);

  if (ideaError || !idea || idea.deleted_at) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  // ── Authorization ──────────────────────────────────────
  const role = await getUserRole(supabase, user.id);
  const isAdmin = role === "admin";

  // Submitters can only view scores on their own ideas
  if (!isAdmin && idea.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Fetch scores + aggregate ───────────────────────────
  const [scoresResult, aggregateResult] = await Promise.all([
    getScoresForIdea(supabase, ideaId),
    getScoreAggregateForIdea(supabase, ideaId),
  ]);

  const scores = scoresResult.data;
  const aggregate = aggregateResult.data;

  // ── Blind review anonymization ─────────────────────────
  const { enabled: blindReviewEnabled } = await getBlindReviewEnabled(supabase);
  const { data: stageState } = await getIdeaStageState(supabase, ideaId);
  const terminalOutcome = stageState?.terminal_outcome ?? null;
  const isTerminal = terminalOutcome !== null;

  // Determine whether to mask evaluator identities
  const shouldMask = blindReviewEnabled && !isAdmin && !isTerminal;

  // Fetch evaluator display names
  const evaluatorIds = [...new Set(scores.map((s) => s.evaluator_id))];
  const evaluatorNames = new Map<string, string>();

  if (evaluatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profile")
      .select("id, email")
      .in("id", evaluatorIds);

    for (const p of profiles ?? []) {
      evaluatorNames.set(p.id, p.email);
    }
  }

  // Build response scores with anonymization
  const responseScores = scores.map((score) => {
    const isSelfScore = score.evaluator_id === user.id;
    // Self-view exemption: don't mask own score
    const mask = shouldMask && !isSelfScore;
    const anonymized = anonymizeScoreEntry(score, mask);

    return {
      id: anonymized.id,
      evaluatorId: anonymized.evaluator_id,
      evaluatorDisplayName: mask
        ? "Anonymous Evaluator"
        : evaluatorNames.get(score.evaluator_id) ?? "Unknown",
      score: anonymized.score,
      comment: anonymized.comment,
      createdAt: anonymized.created_at,
      updatedAt: anonymized.updated_at,
    };
  });

  // ── Build myScore ──────────────────────────────────────
  const myScoreEntry = scores.find((s) => s.evaluator_id === user.id);
  const myScore = myScoreEntry
    ? {
        id: myScoreEntry.id,
        score: myScoreEntry.score,
        comment: myScoreEntry.comment,
        updatedAt: myScoreEntry.updated_at,
      }
    : null;

  return NextResponse.json({
    ideaId,
    aggregate,
    scores: responseScores,
    myScore,
  });
}
