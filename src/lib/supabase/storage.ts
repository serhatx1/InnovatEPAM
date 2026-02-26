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

// ── Staging File Operations ─────────────────────────────

/**
 * Upload a file to the staging area before a draft exists.
 * Path: staging/{sessionId}/{timestamp}-{filename}
 */
export async function uploadToStaging(
  file: File,
  sessionId: string
): Promise<string> {
  const supabase = await createClient();

  const timestamp = Date.now();
  const safeName = sanitizeName(file.name);
  const filePath = `staging/${sessionId}/${timestamp}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Staging upload failed: ${error.message}`);
  }

  return filePath;
}

/**
 * Move staged files from staging area to permanent storage for an idea.
 * Returns the new permanent paths.
 */
export async function moveStagedFiles(
  sessionId: string,
  ideaId: string
): Promise<string[]> {
  const supabase = await createClient();
  const stagingPrefix = `staging/${sessionId}`;

  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(stagingPrefix);

  if (listError || !files || files.length === 0) {
    return [];
  }

  const newPaths: string[] = [];
  const oldPaths: string[] = [];

  for (const file of files) {
    const oldPath = `${stagingPrefix}/${file.name}`;
    const newPath = `${ideaId}/${file.name}`;

    const { error: copyError } = await supabase.storage
      .from(BUCKET)
      .copy(oldPath, newPath);

    if (copyError) {
      throw new Error(`Failed to move staged file: ${copyError.message}`);
    }

    newPaths.push(newPath);
    oldPaths.push(oldPath);
  }

  // Clean up staging files
  if (oldPaths.length > 0) {
    await supabase.storage.from(BUCKET).remove(oldPaths);
  }

  return newPaths;
}

/**
 * Remove all staged files for a session.
 */
export async function cleanupStagedFiles(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const stagingPrefix = `staging/${sessionId}`;

  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(stagingPrefix);

  if (listError || !files || files.length === 0) return;

  const paths = files.map((f) => `${stagingPrefix}/${f.name}`);
  await supabase.storage.from(BUCKET).remove(paths);
}

/**
 * List all staged files for a session.
 */
export async function listStagedFiles(
  sessionId: string
): Promise<Array<{ name: string }>> {
  const supabase = await createClient();
  const stagingPrefix = `staging/${sessionId}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(stagingPrefix);

  if (error || !data) return [];
  return data;
}

/**
 * Remove orphaned staging files older than maxAgeMs.
 * Default: 24 hours. Returns count of removed files and sessions.
 */
export async function cleanupOrphanedStagedFiles(
  maxAgeMs = 24 * 60 * 60 * 1000
): Promise<{ removed: number; sessions: number }> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - maxAgeMs);

  // List all session folders in staging/
  const { data: sessionFolders, error: listError } = await supabase.storage
    .from(BUCKET)
    .list("staging");

  if (listError || !sessionFolders || sessionFolders.length === 0) {
    return { removed: 0, sessions: 0 };
  }

  let totalRemoved = 0;
  let sessionsCleaned = 0;

  for (const folder of sessionFolders) {
    const folderDate = new Date(folder.created_at ?? 0);
    if (folderDate >= cutoff) continue;

    // List files in this old session folder
    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list(`staging/${folder.name}`);

    if (!files || files.length === 0) continue;

    const paths = files.map((f) => `staging/${folder.name}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(paths);

    totalRemoved += paths.length;
    sessionsCleaned++;
  }

  return { removed: totalRemoved, sessions: sessionsCleaned };
}
