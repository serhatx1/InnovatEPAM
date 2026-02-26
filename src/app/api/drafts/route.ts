import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { draftSaveSchema } from "@/lib/validation/draft";
import { createDraft, listDrafts, createAttachments } from "@/lib/queries";
import { moveStagedFiles } from "@/lib/supabase/storage";

/**
 * POST /api/drafts — Create a new draft idea.
 * All fields are optional (relaxed validation via draftSaveSchema).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine for drafts
  }

  const parsed = draftSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: draft, error } = await createDraft(supabase, {
    user_id: user.id,
    ...parsed.data,
  });

  if (error || !draft) {
    return NextResponse.json(
      { error: error ?? "Failed to create draft" },
      { status: 500 }
    );
  }

  // If staging session ID provided, move staged files and create attachment records
  const stagingSessionId = body.stagingSessionId as string | undefined;
  const stagingFiles = body.stagingFiles as Array<{
    storagePath: string;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
  }> | undefined;

  if (stagingSessionId) {
    try {
      const newPaths = await moveStagedFiles(stagingSessionId, draft.id);
      if (newPaths.length > 0) {
        // Build a lookup from staging filename to metadata
        const metaByFilename = new Map<string, { originalFileName: string; fileSize: number; mimeType: string }>();
        if (stagingFiles) {
          for (const sf of stagingFiles) {
            const filename = sf.storagePath.split("/").pop() ?? "";
            metaByFilename.set(filename, sf);
          }
        }

        const attachmentInputs = newPaths.map((path, i) => {
          const filename = path.split("/").pop() ?? "attachment";
          const meta = metaByFilename.get(filename);
          return {
            idea_id: draft.id,
            original_file_name: meta?.originalFileName ?? filename,
            file_size: meta?.fileSize ?? 1,
            mime_type: meta?.mimeType ?? "application/octet-stream",
            storage_path: path,
            upload_order: i + 1,
          };
        });
        await createAttachments(supabase, attachmentInputs);
      }
    } catch (err) {
      // Non-fatal: draft was created, staging move failed
      console.error("Failed to move staged files:", err);
    }
  }

  return NextResponse.json(draft, { status: 201 });
}

/**
 * GET /api/drafts — List all active drafts for the authenticated user.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: drafts, error } = await listDrafts(supabase, user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(drafts);
}
