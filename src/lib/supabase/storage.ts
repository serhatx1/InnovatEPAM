import { createClient } from "@/lib/supabase/server";

const BUCKET = "idea-attachments";

/**
 * Sanitize a filename for safe storage paths.
 */
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

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
  const safeName = sanitizeName(file.name);
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

  return filePath;
}

/**
 * Upload multiple files atomically. If any upload fails, all already-uploaded
 * files are deleted (rollback) and the error is re-thrown.
 */
export async function uploadMultipleAttachments(
  files: File[],
  userId: string
): Promise<string[]> {
  if (files.length === 0) return [];

  const supabase = await createClient();
  const uploadedPaths: string[] = [];

  for (const file of files) {
    const timestamp = Date.now();
    const safeName = sanitizeName(file.name);
    const filePath = `${userId}/${timestamp}-${safeName}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      // Rollback all previously uploaded files
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths);
      }
      throw new Error(`File upload failed: ${error.message}`);
    }

    uploadedPaths.push(filePath);
  }

  return uploadedPaths;
}

/**
 * Delete files from storage by their paths (for cleanup on failures).
 */
export async function deleteAttachments(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const supabase = await createClient();

  const { error } = await supabase.storage.from(BUCKET).remove(paths);

  if (error) {
    throw new Error(`Failed to delete attachments: ${error.message}`);
  }
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

/**
 * Generate a signed download URL with the original file name in Content-Disposition.
 */
export async function getAttachmentDownloadUrl(
  storagePath: string,
  originalName: string,
  expiresIn = 3600
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn, { download: originalName });

  if (error) {
    console.error("Signed URL error:", error.message);
    return null;
  }

  return data.signedUrl;
}
