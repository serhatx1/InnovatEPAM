import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/queries";
import { upsertScore } from "@/lib/queries/idea-scores";
import { scoreSubmissionSchema } from "@/lib/validation/score";
import { checkScoringEligibility } from "@/lib/review/scoring-eligibility";

/**
 * PUT /api/ideas/[id]/score — Submit or update the authenticated evaluator's score.
 * Role: admin (evaluator). Returns the upserted score.
 */
export async function PUT(
  request: NextRequest,
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

  // ── Role check ─────────────────────────────────────────
  const role = await getUserRole(supabase, user.id);

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Validate body ──────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Validation failed", details: ["Invalid JSON"] },
      { status: 400 }
    );
  }

  const parsed = scoreSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.issues.map((i) => i.message),
      },
      { status: 400 }
    );
  }

  // ── Eligibility ────────────────────────────────────────
  const eligibility = await checkScoringEligibility(supabase, ideaId, user.id);

  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: eligibility.reason },
      { status: eligibility.status ?? 403 }
    );
  }

  // ── Upsert score ───────────────────────────────────────
  const { data: score, error } = await upsertScore(supabase, {
    idea_id: ideaId,
    evaluator_id: user.id,
    score: parsed.data.score,
    comment: parsed.data.comment ?? null,
  });

  if (error || !score) {
    return NextResponse.json(
      { error: error ?? "Failed to save score" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: score.id,
    ideaId: score.idea_id,
    evaluatorId: score.evaluator_id,
    score: score.score,
    comment: score.comment,
    createdAt: score.created_at,
    updatedAt: score.updated_at,
  });
}
