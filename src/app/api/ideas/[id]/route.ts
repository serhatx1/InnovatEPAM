import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAttachmentUrl, getAttachmentDownloadUrl } from "@/lib/supabase/storage";
import { getIdeaById, getAttachmentsByIdeaId } from "@/lib/queries";

/**
 * GET /api/ideas/[id] — Get a single idea by ID.
 * Any authenticated user can view any idea (FR-17, FR-19).
 * Returns attachments[] with download_url for each, and legacy signed_attachment_url fallback.
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

  const { data: idea, error } = await getIdeaById(supabase, id);

  if (error || !idea) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  // Draft ideas are only visible to their owner
  if (idea.status === "draft" && idea.user_id !== user.id) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  // Resolve signed URL for legacy attachment_url if present
  let signedAttachmentUrl: string | null = null;
  if (idea.attachment_url) {
    signedAttachmentUrl = await getAttachmentUrl(idea.attachment_url);
  }

  // Fetch new-model attachment records
  const { data: attachmentRecords } = await getAttachmentsByIdeaId(supabase, id);
  const records = attachmentRecords ?? [];

  // Build attachments response with download URLs
  let attachments: Array<Record<string, unknown>> = [];

  if (records.length > 0) {
    // New model: generate signed download URL for each record
    attachments = await Promise.all(
      records.map(async (att) => {
        const downloadUrl = await getAttachmentDownloadUrl(
          att.storage_path,
          att.original_file_name
        );
        return { ...att, download_url: downloadUrl };
      })
    );
  } else if (idea.attachment_url && signedAttachmentUrl) {
    // Legacy fallback: render attachment_url as single attachment
    const fileName = (idea.attachment_url as string).split("/").pop() ?? "attachment";
    // Strip UUID prefix if present (e.g., "user-1/old-doc.pdf" → "old-doc.pdf")
    attachments = [
      {
        id: null,
        idea_id: id,
        original_file_name: fileName,
        file_size: null,
        mime_type: null,
        storage_path: idea.attachment_url,
        upload_order: 1,
        download_url: signedAttachmentUrl,
      },
    ];
  }

  return NextResponse.json({
    ...idea,
    signed_attachment_url: signedAttachmentUrl,
    attachments,
  });
}
