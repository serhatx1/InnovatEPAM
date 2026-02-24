-- InnovatEPAM Portal - Database Schema
-- Migration 001: Create core tables for profiles and ideas

-- Enable UUID extension (usually enabled by default on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. User Profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profile (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'submitter' CHECK (role IN ('submitter', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for user_profile
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.user_profile FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profile FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.user_profile FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 2. Ideas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.idea (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.user_profile(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected')),
  attachment_url    TEXT,
  evaluator_comment TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for ideas
ALTER TABLE public.idea ENABLE ROW LEVEL SECURITY;

-- Submitters can view their own ideas
CREATE POLICY "Users can read own ideas"
  ON public.idea FOR SELECT
  USING (auth.uid() = user_id);

-- Submitters can insert their own ideas
CREATE POLICY "Users can insert own ideas"
  ON public.idea FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all ideas
CREATE POLICY "Admins can read all ideas"
  ON public.idea FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all ideas (status changes)
CREATE POLICY "Admins can update all ideas"
  ON public.idea FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 3. Storage bucket for idea attachments
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('idea-attachments', 'idea-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'idea-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can read own attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'idea-attachments'
    AND auth.role() = 'authenticated'
  );

-- ============================================================
-- 4. Function: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profile (id, email, role)
  VALUES (NEW.id, NEW.email, 'submitter');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. Function: auto-update updated_at on idea changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER idea_updated_at
  BEFORE UPDATE ON public.idea
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
