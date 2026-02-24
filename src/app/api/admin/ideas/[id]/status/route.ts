import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, getIdeaById, updateIdeaStatus } from "@/lib/queries";
import { statusUpdateSchema, isValidTransition } from "@/lib/validation/status";

/**
 * PATCH /api/admin/ideas/[id]/status — Update idea status (admin only).
 * Body: { status: string, evaluatorComment?: string }
 *
 * Rules:
 *  - Only admin role can call this endpoint.
 *  - Status must be one of: under_review, accepted, rejected.
 *  - Status transition must be valid (no reversal or skipping).
 *  - Rejecting requires an evaluatorComment with minimum 10 characters.
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

  // Parse and validate body with Zod schema
  const body = await request.json();
  const parsed = statusUpdateSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { status, evaluatorComment } = parsed.data;

  // Fetch current idea to validate transition
  const { data: idea, error: fetchErr } = await getIdeaById(supabase, id);

  if (fetchErr || !idea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  // Validate status transition
  if (!isValidTransition(idea.status, status)) {
    return NextResponse.json(
      { error: `Invalid transition from "${idea.status}" to "${status}"` },
      { status: 400 }
    );
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
