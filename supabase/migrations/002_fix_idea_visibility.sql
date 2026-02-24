-- InnovatEPAM Portal - RLS Fix for Idea Visibility
-- Migration 002: All authenticated users can read all ideas (FR-17)
--
-- Previously, submitters could only see their own ideas and admins
-- could see all via separate policies. The spec requires ALL
-- authenticated users to see ALL ideas.

-- Drop restrictive per-user SELECT policies
DROP POLICY IF EXISTS "Users can read own ideas" ON public.idea;
DROP POLICY IF EXISTS "Admins can read all ideas" ON public.idea;

-- Replace with single authenticated-user policy
CREATE POLICY "Authenticated users can read all ideas"
  ON public.idea FOR SELECT
  USING (auth.role() = 'authenticated');
