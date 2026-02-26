-- Migration 005: Add draft support
-- Feature: 3-draft-submissions
-- Adds 'draft' to idea status, deleted_at column, partial index, and RLS changes

-- 1. Expand status CHECK to include 'draft'
ALTER TABLE public.idea DROP CONSTRAINT idea_status_check;
ALTER TABLE public.idea ADD CONSTRAINT idea_status_check
  CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected'));

-- 2. Add soft-delete column
ALTER TABLE public.idea ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Create partial index for fast "My Drafts" listing
CREATE INDEX IF NOT EXISTS idx_idea_drafts_by_user
  ON public.idea (user_id, updated_at DESC)
  WHERE status = 'draft' AND deleted_at IS NULL;

-- 4. Modify existing RLS: exclude drafts from general SELECT
-- Drop the existing policy and recreate with draft exclusion
DROP POLICY IF EXISTS "Authenticated users can read all ideas" ON public.idea;
CREATE POLICY "Authenticated users can read all ideas"
  ON public.idea FOR SELECT
  USING (auth.role() = 'authenticated' AND status != 'draft');

-- 5. Add owner-only SELECT for draft rows
DROP POLICY IF EXISTS "Draft owners can read own drafts" ON public.idea;
CREATE POLICY "Draft owners can read own drafts"
  ON public.idea FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id
    AND status = 'draft'
    AND deleted_at IS NULL
  );

-- 6. Add owner-only UPDATE for draft rows
DROP POLICY IF EXISTS "Draft owners can update own drafts" ON public.idea;
CREATE POLICY "Draft owners can update own drafts"
  ON public.idea FOR UPDATE
  USING (
    (SELECT auth.uid()) = user_id
    AND status = 'draft'
    AND deleted_at IS NULL
  );

-- 7. Add owner-only DELETE (soft-delete via UPDATE) policy for draft rows
-- Note: Soft-delete is an UPDATE (setting deleted_at), covered by the UPDATE policy above.
-- The UPDATE USING clause requires deleted_at IS NULL, which means once soft-deleted,
-- the row can no longer be updated again — this is the desired behavior.

-- 8. Verify existing INSERT policy already covers status = 'draft'
-- The existing INSERT policy is: auth.uid() = user_id
-- This allows inserting drafts since it only checks ownership, not status.
-- No changes needed.
