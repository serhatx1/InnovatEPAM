-- ============================================================
-- FIX: Re-create ALL RLS policies + helper functions
-- Safe to run multiple times (drops before creating)
-- Does NOT drop tables — preserves all data
-- ============================================================

-- ── 1. Drop all existing policies ──────────────────────────

-- user_profile policies (drop ALL possible names from old + new migrations)
DROP POLICY IF EXISTS "Users can read own profile"    ON public.user_profile;
DROP POLICY IF EXISTS "Users can insert own profile"  ON public.user_profile;
DROP POLICY IF EXISTS "Admins can read all profiles"  ON public.user_profile;
DROP POLICY IF EXISTS "Allow user to read own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Allow admins to read all profiles" ON public.user_profile;

-- idea policies
DROP POLICY IF EXISTS "Users can read own ideas"               ON public.idea;
DROP POLICY IF EXISTS "Admins can read all ideas"              ON public.idea;
DROP POLICY IF EXISTS "Authenticated users can read all ideas" ON public.idea;
DROP POLICY IF EXISTS "Users can insert own ideas"             ON public.idea;
DROP POLICY IF EXISTS "Admins can update all ideas"            ON public.idea;
DROP POLICY IF EXISTS "Anyone can read submitted ideas"        ON public.idea;
DROP POLICY IF EXISTS "Allow users to insert ideas"            ON public.idea;
DROP POLICY IF EXISTS "Allow admins to update ideas"           ON public.idea;

-- storage policies
DROP POLICY IF EXISTS "Users can upload attachments"   ON storage.objects;
DROP POLICY IF EXISTS "Users can read attachments"     ON storage.objects;
DROP POLICY IF EXISTS "Users can read own attachments" ON storage.objects;


-- ── 2. Drop + recreate helper functions ────────────────────

DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_profile
     WHERE id = (SELECT auth.uid())
       AND role = 'admin'
  );
$$;


-- ── 3. Ensure RLS is enabled ──────────────────────────────

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea ENABLE ROW LEVEL SECURITY;


-- ── 4. user_profile policies ──────────────────────────────

-- Users read own row
CREATE POLICY "Users can read own profile"
  ON public.user_profile FOR SELECT
  USING ((SELECT auth.uid()) = id);

-- Signup trigger / self-insert
CREATE POLICY "Users can insert own profile"
  ON public.user_profile FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

-- Admins read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.user_profile FOR SELECT
  USING ((SELECT public.is_admin()));


-- ── 5. idea policies ──────────────────────────────────────

-- All authenticated users can read all ideas (FR-17)
CREATE POLICY "Authenticated users can read all ideas"
  ON public.idea FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Submitters insert their own ideas
CREATE POLICY "Users can insert own ideas"
  ON public.idea FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Admins update any idea
CREATE POLICY "Admins can update all ideas"
  ON public.idea FOR UPDATE
  USING ((SELECT public.is_admin()));


-- ── 6. Storage policies ───────────────────────────────────

CREATE POLICY "Users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'idea-attachments'
    AND (SELECT auth.role()) = 'authenticated'
  );

CREATE POLICY "Users can read attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'idea-attachments'
    AND (SELECT auth.role()) = 'authenticated'
  );


-- ── 7. Triggers ───────────────────────────────────────────

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profile (id, email, role)
  VALUES (NEW.id, NEW.email, 'submitter');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS idea_updated_at ON public.idea;
CREATE TRIGGER idea_updated_at
  BEFORE UPDATE ON public.idea
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- ── 8. Verify ─────────────────────────────────────────────
SELECT tablename, policyname, cmd, permissive
  FROM pg_policies
 WHERE schemaname = 'public'
 ORDER BY tablename, policyname;
