-- Migration 006: Allow empty category for draft ideas
-- The category CHECK constraint rejects empty strings, which breaks
-- draft creation (drafts don't require a category).
--
-- Fix: replace the simple CHECK with a conditional constraint that
-- allows empty string ONLY when status = 'draft'.

ALTER TABLE public.idea DROP CONSTRAINT idea_category_check;
ALTER TABLE public.idea ADD CONSTRAINT idea_category_check
  CHECK (
    category IN (
      'Process Improvement',
      'Technology Innovation',
      'Cost Reduction',
      'Customer Experience',
      'Employee Engagement'
    )
    OR (status = 'draft' AND category = '')
  );
