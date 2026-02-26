import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { draftSubmitSchema } from "@/lib/validation/draft";
import { validateCategoryFieldsForCategory } from "@/lib/validation/category-fields";
import { getDraftById, submitDraft, bindSubmittedIdeaToWorkflow } from "@/lib/queries";

/**
 * POST /api/drafts/[id]/submit — Submit a draft for review.
 * Full validation against draftSubmitSchema + category fields.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the idea exists and is a draft owned by user
  const { data: draft } = await getDraftById(supabase, id);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (draft.user_id !== user.id) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (draft.status !== "draft") {
    return NextResponse.json(
      { error: "Only drafts can be submitted" },
      { status: 403 }
    );
  }

  // Validate current draft data against full submission rules
  const parsed = draftSubmitSchema.safeParse({
    title: draft.title,
    description: draft.description,
    category: draft.category,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: "Validation failed", details: fieldErrors },
      { status: 400 }
    );
  }

  // Validate category-specific fields
  const categoryFieldsResult = validateCategoryFieldsForCategory(
    parsed.data.category,
    draft.category_fields ?? {}
  );

  if (!categoryFieldsResult.success) {
    const details = Object.fromEntries(
      Object.entries(categoryFieldsResult.errors).map(([key, value]) => [
        key === "category" ? key : `category_fields.${key}`,
        value,
      ])
    );
    return NextResponse.json(
      { error: "Validation failed", details },
      { status: 400 }
    );
  }

  // Transition draft → submitted
  const { data: submitted, error } = await submitDraft(supabase, id);

  if (error || !submitted) {
    return NextResponse.json(
      { error: error ?? "Failed to submit draft" },
      { status: 500 }
    );
  }

  // Bind to active review workflow (best-effort — no error if no workflow exists)
  await bindSubmittedIdeaToWorkflow(supabase, submitted.id, user.id).catch(() => {});

  return NextResponse.json(submitted);
}
