import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, ideaExists, updateIdeaStatus } from "@/lib/queries";

const VALID_STATUSES = ["under_review", "accepted", "rejected"];

/**
 * PATCH /api/admin/ideas/[id]/status — Update idea status (admin only).
 * Body: { status: string, evaluatorComment?: string }
 *
 * Rules:
 *  - Only admin role can call this endpoint.
 *  - Status must be one of: under_review, accepted, rejected.
 *  - Rejecting requires a non-empty evaluatorComment.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role check — admin only
  const role = await getUserRole(supabase, user.id);

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  // Parse body
  const body = await request.json();
  const { status, evaluatorComment } = body as {
    status?: string;
    evaluatorComment?: string;
  };

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // Reject-comment rule: rejecting requires a comment
  if (status === "rejected" && (!evaluatorComment || !evaluatorComment.trim())) {
    return NextResponse.json(
      { error: "A comment is required when rejecting an idea" },
      { status: 400 }
    );
  }

  // Verify idea exists
  const exists = await ideaExists(supabase, id);
  if (!exists) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  // Update idea
  const { data: updated, error: updateErr } = await updateIdeaStatus(supabase, id, {
    status,
    evaluator_comment: evaluatorComment,
  });

  if (updateErr) {
    return NextResponse.json({ error: updateErr }, { status: 500 });
  }

  return NextResponse.json(updated);
}
