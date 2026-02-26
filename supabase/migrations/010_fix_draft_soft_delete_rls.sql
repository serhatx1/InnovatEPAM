-- Migration 010: Fix draft soft-delete RLS
-- The "Draft owners can update own drafts" policy implicitly uses USING as WITH CHECK.
-- After soft-delete (setting deleted_at = now()), the new row fails deleted_at IS NULL.
-- Fix: add explicit WITH CHECK that permits setting deleted_at on own drafts.

DROP POLICY IF EXISTS "Draft owners can update own drafts" ON public.idea;

CREATE POLICY "Draft owners can update own drafts"
  ON public.idea FOR UPDATE
  USING (
    (SELECT auth.uid()) = user_id
    AND status = 'draft'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status IN ('draft', 'submitted')
  );

-- Fallback: SECURITY DEFINER function that bypasses RLS for soft-delete.
-- The API layer validates ownership before calling this.
CREATE OR REPLACE FUNCTION public.soft_delete_draft(draft_id UUID, owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.idea
     SET deleted_at = now()
   WHERE id = draft_id
     AND user_id = owner_id
     AND status = 'draft'
     AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;
