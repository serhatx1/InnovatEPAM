import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ideaSchema, validateFiles } from "@/lib/validation/idea";
import { validateCategoryFieldsForCategory } from "@/lib/validation/category-fields";
import { uploadMultipleAttachments, deleteAttachments } from "@/lib/supabase/storage";
import { listIdeas, createIdea, createAttachments, bindSubmittedIdeaToWorkflow, getUserRole } from "@/lib/queries";
import { getBlindReviewEnabled } from "@/lib/queries/portal-settings";
import { getScoreAggregatesForIdeas } from "@/lib/queries/idea-scores";
import { anonymizeIdeaList } from "@/lib/review/blind-review";
import type { ReviewTerminalOutcome } from "@/types";

/**
 * GET /api/ideas — List all ideas for any authenticated user (FR-17).
 * Applies blind review anonymization when enabled (Feature 7).
 * Supports ?sortBy=avgScore&sortDir=desc|asc for score-based sorting (Feature 8).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: ideas, error } = await listIdeas(supabase);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  // ── Score aggregates ───────────────────────────────────
  const ideaIds = ideas.map((i) => i.id);
  const { data: scoreMap } = await getScoreAggregatesForIdeas(supabase, ideaIds);

  // Attach avgScore and scoreCount to each idea
  let enriched = ideas.map((idea) => {
    const agg = scoreMap.get(idea.id);
    return {
      ...idea,
      avgScore: agg?.avgScore ?? null,
      scoreCount: agg?.scoreCount ?? 0,
    };
  });

  // ── Score-based sorting ────────────────────────────────
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir") ?? "desc";

  if (sortBy === "avgScore") {
    enriched = enriched.sort((a, b) => {
      // Unscored ideas (null avgScore) sort to bottom always
      if (a.avgScore === null && b.avgScore === null) return 0;
      if (a.avgScore === null) return 1;
      if (b.avgScore === null) return -1;
      return sortDir === "asc" ? a.avgScore - b.avgScore : b.avgScore - a.avgScore;
    });
  }

  // ── Blind review anonymization ─────────────────────────
  const { enabled: blindReviewEnabled } = await getBlindReviewEnabled(supabase);

  if (blindReviewEnabled) {
    const viewerRole = (await getUserRole(supabase, user.id)) ?? "submitter";

    // Fetch terminal outcomes for listed ideas
    const terminalOutcomes = new Map<string, ReviewTerminalOutcome | null>();

    if (ideaIds.length > 0) {
      const { data: stageStates } = await supabase
        .from("idea_stage_state")
        .select("idea_id, terminal_outcome")
        .in("idea_id", ideaIds);

      for (const state of stageStates ?? []) {
        terminalOutcomes.set(state.idea_id, state.terminal_outcome);
      }
    }

    const anonymized = anonymizeIdeaList(enriched as any, viewerRole, user.id, true, terminalOutcomes);
    return NextResponse.json(anonymized);
  }

  return NextResponse.json(enriched);
}

/**
 * POST /api/ideas — Create a new idea (with optional file attachment).
 * Accepts multipart/form-data with fields: title, description, category, file? (optional)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const categoryFieldsRaw = formData.get("category_fields") as string | null;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  // Validate input
  const parsed = ideaSchema.safeParse({ title, description, category });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let parsedCategoryFieldsInput: unknown = {};
  if (categoryFieldsRaw) {
    try {
      parsedCategoryFieldsInput = JSON.parse(categoryFieldsRaw);
    } catch {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: {
            category_fields: ["Category fields must be a valid JSON object"],
          },
        },
        { status: 400 }
      );
    }
  }

  const categoryFieldsResult = validateCategoryFieldsForCategory(
    parsed.data.category,
    parsedCategoryFieldsInput
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

  // Validate files (multi-file: count, size, type)
  const filesValidation = validateFiles(files);
  if (filesValidation) {
    // Return first actionable error
    if (filesValidation.countError) {
      return NextResponse.json({ error: filesValidation.countError }, { status: 400 });
    }
    if (filesValidation.fileErrors && filesValidation.fileErrors.length > 0) {
      const first = filesValidation.fileErrors[0];
      return NextResponse.json(
        { error: first.error, file: first.name },
        { status: 400 }
      );
    }
    if (filesValidation.totalSizeError) {
      return NextResponse.json({ error: filesValidation.totalSizeError }, { status: 400 });
    }
  }

  // Upload files atomically (rollback on failure happens inside uploadMultipleAttachments)
  let storagePaths: string[] = [];
  if (files.length > 0) {
    try {
      storagePaths = await uploadMultipleAttachments(files, user.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Insert idea row (new model: attachment_url is null)
  const { data: idea, error } = await createIdea(supabase, {
    user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    category_fields: categoryFieldsResult.data,
    attachment_url: null,
  });

  if (error || !idea) {
    // Clean up uploaded files if DB insert fails
    if (storagePaths.length > 0) {
      try {
        await deleteAttachments(storagePaths);
      } catch {
        // Best-effort cleanup; log in production
      }
    }
    return NextResponse.json({ error: error ?? "Failed to create idea" }, { status: 500 });
  }

  // Insert attachment metadata
  let attachmentRecords = null;
  if (storagePaths.length > 0) {
    const attachmentInputs = files.map((file, i) => ({
      idea_id: idea.id,
      original_file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePaths[i],
      upload_order: i + 1,
    }));

    const { data: attachments, error: attError } = await createAttachments(
      supabase,
      attachmentInputs
    );

    if (attError) {
      // Clean up uploaded files if attachment insert fails
      try {
        await deleteAttachments(storagePaths);
      } catch {
        // Best-effort cleanup
      }
      return NextResponse.json({ error: attError }, { status: 500 });
    }

    attachmentRecords = attachments;
  }

  // Bind to active review workflow (best-effort — no error if no workflow exists)
  await bindSubmittedIdeaToWorkflow(supabase, idea.id, user.id).catch(() => {});

  return NextResponse.json(
    { ...idea, attachments: attachmentRecords ?? [] },
    { status: 201 }
  );
}
