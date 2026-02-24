import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, getIdeaById, updateIdeaStatus } from "@/lib/queries";
import { statusUpdateSchema, isValidTransition } from "@/lib/validation/status";

/**
 * PATCH /api/admin/ideas/[id]/status — Update idea status (admin only).
 * Body: { status: string, evaluatorComment?: string }
 *
 * Rules:
 *  - Only admin role can call this endpoint (FR-08).
 *  - Status transitions must be valid (FR-22).
 *  - Rejecting requires evaluatorComment ≥ 10 chars (FR-26).
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
  const { data: idea, error: fetchError } = await getIdeaById(supabase, id);

  if (fetchError || !idea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  // Validate status transition (FR-22)
  if (!isValidTransition(idea.status, status)) {
    return NextResponse.json(
      { error: `Invalid transition from '${idea.status}' to '${status}'` },
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
