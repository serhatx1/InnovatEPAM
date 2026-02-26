import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateFile } from "@/lib/validation/idea";
import { uploadToStaging } from "@/lib/supabase/storage";

/**
 * POST /api/drafts/staging/upload — Upload a file to temporary staging area.
 * Used for pre-draft file uploads before a draft record exists.
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
  const file = formData.get("file") as File | null;
  const sessionId = formData.get("sessionId") as string | null;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing sessionId" },
      { status: 400 }
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing file" },
      { status: 400 }
    );
  }

  // Validate the file
  const fileError = validateFile(file);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  try {
    const storagePath = await uploadToStaging(file, sessionId);
    return NextResponse.json(
      {
        storagePath,
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
