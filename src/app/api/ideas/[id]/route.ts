import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAttachmentUrl } from "@/lib/supabase/storage";
import { getUserRole, getIdeaById } from "@/lib/queries";

/**
 * GET /api/ideas/[id] — Get a single idea by ID.
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

  // Check access: owner or admin
  const role = await getUserRole(supabase, user.id);

  if (idea.user_id !== user.id && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Resolve signed URL for attachment if present
  let signedAttachmentUrl: string | null = null;
  if (idea.attachment_url) {
    signedAttachmentUrl = await getAttachmentUrl(idea.attachment_url);
  }

  return NextResponse.json({ ...idea, signed_attachment_url: signedAttachmentUrl });
}
