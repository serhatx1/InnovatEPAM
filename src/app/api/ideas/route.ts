import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ideaSchema } from "@/lib/validation/idea";
import { uploadIdeaAttachment } from "@/lib/supabase/storage";
import { getUserRole, listIdeas, createIdea } from "@/lib/queries";

/**
 * GET /api/ideas — List ideas for the current user (or all if admin).
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRole(supabase, user.id);
  const isAdmin = role === "admin";

  const { data: ideas, error } = await listIdeas(supabase, {
    userId: isAdmin ? undefined : user.id,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(ideas);
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
  const file = formData.get("file") as File | null;

  // Validate input
  const parsed = ideaSchema.safeParse({ title, description, category });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Upload file if provided
  let attachmentUrl: string | null = null;
  if (file && file.size > 0) {
    try {
      attachmentUrl = await uploadIdeaAttachment(file, user.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const { data: idea, error } = await createIdea(supabase, {
    user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    attachment_url: attachmentUrl,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(idea, { status: 201 });
}
