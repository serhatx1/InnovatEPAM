import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ideaSchema, validateFile } from "@/lib/validation/idea";
import { validateCategoryFieldsForCategory } from "@/lib/validation/category-fields";
import { uploadIdeaAttachment } from "@/lib/supabase/storage";
import { listIdeas, createIdea } from "@/lib/queries";

/**
 * GET /api/ideas — List all ideas for any authenticated user (FR-17).
 */
export async function GET() {
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
  const categoryFieldsRaw = formData.get("category_fields") as string | null;
  const file = formData.get("file") as File | null;

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

  // Validate and upload file if provided
  let attachmentUrl: string | null = null;
  if (file && file.size > 0) {
    const fileError = validateFile(file);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }
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
    category_fields: categoryFieldsResult.data,
    attachment_url: attachmentUrl,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(idea, { status: 201 });
}
