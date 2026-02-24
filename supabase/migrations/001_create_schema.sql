-- ============================================================
-- InnovatEPAM Portal — Definitive Database Schema
-- ============================================================
--
-- Single migration: drop everything, rebuild from scratch.
-- Informed by:
--   • supabase-postgres-best-practices skill (31 rules)
--   • postgresql-table-design skill (core rules + gotchas)
--
-- Run in Supabase SQL Editor. Safe to re-run (idempotent drops).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. TEARDOWN — drop in dependency order
-- ────────────────────────────────────────────────────────────

-- 0a. Triggers (must drop before functions)
DROP TRIGGER IF EXISTS idea_updated_at       ON public.idea;
DROP TRIGGER IF EXISTS on_auth_user_created  ON auth.users;

-- 0b. Policies — idea
DROP POLICY IF EXISTS "Users can read own ideas"               ON public.idea;
DROP POLICY IF EXISTS "Admins can read all ideas"              ON public.idea;
DROP POLICY IF EXISTS "Authenticated users can read all ideas" ON public.idea;
DROP POLICY IF EXISTS "Users can insert own ideas"             ON public.idea;
DROP POLICY IF EXISTS "Admins can update all ideas"            ON public.idea;

-- 0c. Policies — user_profile
DROP POLICY IF EXISTS "Users can read own profile"   ON public.user_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profile;

-- 0d. Policies — storage
DROP POLICY IF EXISTS "Users can upload attachments"  ON storage.objects;
DROP POLICY IF EXISTS "Users can read own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can read attachments"     ON storage.objects;

-- 0e. Tables (child first, then parent)
DROP TABLE IF EXISTS public.idea          CASCADE;
DROP TABLE IF EXISTS public.user_profile  CASCADE;

-- 0f. Functions
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at();


-- ────────────────────────────────────────────────────────────
-- 1. HELPER: is_admin()
--    SECURITY DEFINER bypasses RLS → no infinite recursion
--    when user_profile policies reference user_profile.
--    search_path = '' prevents search-path injection.
--    (SELECT auth.uid()) caches the call — evaluated once.
--    Ref: security-rls-performance, security-privileges
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE                       -- same result within a single statement
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_profile
     WHERE id = (SELECT auth.uid())
       AND role = 'admin'
  );
$$;


-- ────────────────────────────────────────────────────────────
-- 2. USER PROFILES
--    • PK = auth.users FK (UUID, imposed by Supabase Auth)
--    • UNIQUE(email) — data integrity
--    • snake_case identifiers — schema-lowercase-identifiers
--    • TEXT for strings — never varchar(n)
--    • TIMESTAMPTZ — never bare timestamp
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.user_profile (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL UNIQUE,
  role       TEXT        NOT NULL DEFAULT 'submitter'
                         CHECK (role IN ('submitter', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- Users read own row  (cached uid — 100x+ faster on large tables)
CREATE POLICY "Users can read own profile"
  ON public.user_profile FOR SELECT
  USING ((SELECT auth.uid()) = id);

-- Signup trigger / self-insert
CREATE POLICY "Users can insert own profile"
  ON public.user_profile FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

-- Admins read all profiles (via SECURITY DEFINER helper — no recursion)
CREATE POLICY "Admins can read all profiles"
  ON public.user_profile FOR SELECT
  USING ((SELECT public.is_admin()));


-- ────────────────────────────────────────────────────────────
-- 3. IDEAS
--    • gen_random_uuid() — built-in since PG 13, no extension
--    • FK index on user_id — PG does NOT auto-create FK indexes
--    • CHECK on category — DB-level guard matching app constants
--    • CHECK on status  — state machine guard
--    • Indexes on status, created_at — query-missing-indexes
--    • Partial composite index — query-partial-indexes
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.idea (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL
                                REFERENCES public.user_profile(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL,
  category          TEXT        NOT NULL
                                CHECK (category IN (
                                  'Process Improvement',
                                  'Technology Innovation',
                                  'Cost Reduction',
                                  'Customer Experience',
                                  'Employee Engagement'
                                )),
  status            TEXT        NOT NULL DEFAULT 'submitted'
                                CHECK (status IN (
                                  'submitted',
                                  'under_review',
                                  'accepted',
                                  'rejected'
                                )),
  attachment_url    TEXT,                               -- nullable, storage path
  evaluator_comment TEXT,                               -- nullable, admin feedback
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────

-- FK index — 10-100x faster JOINs & CASCADE deletes
CREATE INDEX idx_idea_user_id
  ON public.idea (user_id);

-- Status filter — admin review filtering
CREATE INDEX idx_idea_status
  ON public.idea (status);

-- Listing pages — ORDER BY created_at DESC
CREATE INDEX idx_idea_created_at
  ON public.idea (created_at DESC);

-- Admin review queue — only pending ideas, composite
CREATE INDEX idx_idea_pending_review
  ON public.idea (status, created_at DESC)
  WHERE status IN ('submitted', 'under_review');

-- ── RLS ──────────────────────────────────────────────────
ALTER TABLE public.idea ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all ideas (FR-17)
CREATE POLICY "Authenticated users can read all ideas"
  ON public.idea FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Submitters insert their own ideas
CREATE POLICY "Users can insert own ideas"
  ON public.idea FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Admins update any idea (status + evaluator_comment)
CREATE POLICY "Admins can update all ideas"
  ON public.idea FOR UPDATE
  USING ((SELECT public.is_admin()));


-- ────────────────────────────────────────────────────────────
-- 4. STORAGE — idea attachments bucket
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('idea-attachments', 'idea-attachments', false)
ON CONFLICT (id) DO NOTHING;

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


-- ────────────────────────────────────────────────────────────
-- 5. TRIGGER: auto-create profile on signup
--    SECURITY DEFINER + search_path = '' — security hardening
-- ────────────────────────────────────────────────────────────
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- 6. TRIGGER: auto-update updated_at on idea changes
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER idea_updated_at
  BEFORE UPDATE ON public.idea
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
