import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { draftSaveSchema } from "@/lib/validation/draft";
import {
  getDraftById,
  updateDraft,
  softDeleteDraft,
  getAttachmentsByIdeaId,
  createAttachments,
} from "@/lib/queries";
import { getAttachmentDownloadUrl, moveStagedFiles } from "@/lib/supabase/storage";

/**
 * GET /api/drafts/[id] — Get a single draft by ID.
 * Returns 404 if not found, not owned, soft-deleted, or not a draft.
 */
export async function GET(
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

  const { data: draft, error } = await getDraftById(supabase, id);

  if (error || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // Verify ownership
  if (draft.user_id !== user.id) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // Fetch attachments with signed URLs
  const { data: attachmentRecords } = await getAttachmentsByIdeaId(supabase, id);
  const records = attachmentRecords ?? [];

  const attachments = await Promise.all(
    records.map(async (att) => {
      const downloadUrl = await getAttachmentDownloadUrl(
        att.storage_path,
        att.original_file_name
      );
      return {
        id: att.id,
        original_file_name: att.original_file_name,
        file_size: att.file_size,
        mime_type: att.mime_type,
        upload_order: att.upload_order,
        download_url: downloadUrl,
      };
    })
  );

  return NextResponse.json({ ...draft, attachments });
}

/**
 * PATCH /api/drafts/[id] — Update an existing draft.
 * Returns 404 if not found/not owned, 403 if not a draft.
 */
export async function PATCH(
  request: NextRequest,
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
  const { data: existing } = await getDraftById(supabase, id);

  if (!existing) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Only drafts can be updated" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Empty body — no changes
  }

  const parsed = draftSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: updated, error } = await updateDraft(supabase, id, parsed.data);

  if (error || !updated) {
    return NextResponse.json(
      { error: error ?? "Failed to update draft" },
      { status: 500 }
    );
  }

  // Handle staged file attachments if provided
  const stagingSessionId = body.stagingSessionId as string | undefined;
  const stagingFiles = body.stagingFiles as Array<{
    storagePath: string;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
  }> | undefined;

  if (stagingSessionId && stagingFiles && stagingFiles.length > 0) {
    try {
      const newPaths = await moveStagedFiles(stagingSessionId, id);
      if (newPaths.length > 0) {
        // Get current max upload_order for this idea
        const { data: existingAtts } = await getAttachmentsByIdeaId(supabase, id);
        const maxOrder = existingAtts.reduce((max, a) => Math.max(max, a.upload_order), 0);

        const metaByFilename = new Map<string, { originalFileName: string; fileSize: number; mimeType: string }>();
        for (const sf of stagingFiles) {
          const filename = sf.storagePath.split("/").pop() ?? "";
          metaByFilename.set(filename, sf);
        }

        const attachmentInputs = newPaths.map((path, i) => {
          const filename = path.split("/").pop() ?? "attachment";
          const meta = metaByFilename.get(filename);
          return {
            idea_id: id,
            original_file_name: meta?.originalFileName ?? filename,
            file_size: meta?.fileSize ?? 1,
            mime_type: meta?.mimeType ?? "application/octet-stream",
            storage_path: path,
            upload_order: maxOrder + i + 1,
          };
        });
        await createAttachments(supabase, attachmentInputs);
      }
    } catch (err) {
      console.error("Failed to move staged files for draft update:", err);
    }
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/drafts/[id] — Soft-delete a draft.
 * Returns 404 if not found/not owned, 403 if not a draft.
 */
export async function DELETE(
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
  const { data: existing } = await getDraftById(supabase, id);

  if (!existing) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Only drafts can be deleted" }, { status: 403 });
  }

  const { error } = await softDeleteDraft(supabase, id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ message: "Draft deleted" });
}
