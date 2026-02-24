import { createClient } from "@/lib/supabase/server";

const BUCKET = "idea-attachments";

/**
 * Upload a single file to Supabase Storage and return the public path.
 * Files are stored under `<userId>/<timestamp>-<filename>` to avoid collisions.
 */
export async function uploadIdeaAttachment(
  file: File,
  userId: string
): Promise<string> {
  const supabase = await createClient();

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${timestamp}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }

  // Return the storage path (not a signed URL — we generate signed URLs on read)
  return filePath;
}

/**
 * Generate a temporary signed URL for downloading an attachment.
 */
export async function getAttachmentUrl(
  filePath: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!filePath) return null;

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error("Signed URL error:", error.message);
    return null;
  }

  return data.signedUrl;
}
