-- ============================================================
-- Multi-Media Support: Add idea_attachment table
-- Feature: 2-multi-media-support
-- ============================================================
--
-- New table: idea_attachment (1:N from idea)
-- Stores metadata for file attachments uploaded via the new
-- multi-file model. Legacy single-file ideas retain
-- idea.attachment_url (read-only, unchanged).
--
-- Safe to run multiple times (idempotent drops before creates).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. TEARDOWN — drop policies, indexes, table if re-running
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can read all attachments" ON public.idea_attachment;
DROP POLICY IF EXISTS "Users can insert own idea attachments"        ON public.idea_attachment;
DROP POLICY IF EXISTS "Admins can delete attachments"                ON public.idea_attachment;

DROP INDEX IF EXISTS public.idx_idea_attachment_idea_id;
DROP INDEX IF EXISTS public.idx_idea_attachment_order;

DROP TABLE IF EXISTS public.idea_attachment;

-- ────────────────────────────────────────────────────────────
-- 1. CREATE TABLE: idea_attachment
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.idea_attachment (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id            UUID        NOT NULL REFERENCES public.idea(id) ON DELETE CASCADE,
  original_file_name TEXT        NOT NULL,
  file_size          BIGINT      NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  mime_type          TEXT        NOT NULL,
  storage_path       TEXT        NOT NULL UNIQUE,
  upload_order       INTEGER     NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.idea_attachment IS 'File attachment metadata for ideas (multi-file model)';
COMMENT ON COLUMN public.idea_attachment.file_size IS 'File size in bytes; max 10 MB enforced at DB + app level';
COMMENT ON COLUMN public.idea_attachment.storage_path IS 'Unique path in Supabase Storage bucket idea-attachments';
COMMENT ON COLUMN public.idea_attachment.upload_order IS '1-based sequence for display ordering';

-- ────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ────────────────────────────────────────────────────────────

-- FK index — PG doesn't auto-create; needed for fast JOINs and CASCADE deletes
CREATE INDEX idx_idea_attachment_idea_id
  ON public.idea_attachment (idea_id);

-- Composite index for ordered retrieval per idea
CREATE INDEX idx_idea_attachment_order
  ON public.idea_attachment (idea_id, upload_order);

-- ────────────────────────────────────────────────────────────
-- 3. ROW-LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.idea_attachment ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can read all attachments (matches idea visibility)
CREATE POLICY "Authenticated users can read all attachments"
  ON public.idea_attachment
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: User can only insert attachments for ideas they own
CREATE POLICY "Users can insert own idea attachments"
  ON public.idea_attachment
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.idea
      WHERE id = idea_id
        AND user_id = (SELECT auth.uid())
    )
  );

-- DELETE: Admins only (for potential cleanup; not exposed in UI)
CREATE POLICY "Admins can delete attachments"
  ON public.idea_attachment
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));
