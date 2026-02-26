-- Migration 009: Scoring System (1–5 Ratings)
-- Feature: 8-scoring-system
-- Creates idea_score table, indexes, trigger, and RLS policies.

-- ── Table ──────────────────────────────────────────────

CREATE TABLE public.idea_score (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id       UUID        NOT NULL REFERENCES public.idea(id) ON DELETE CASCADE,
  evaluator_id  UUID        NOT NULL REFERENCES public.user_profile(id) ON DELETE RESTRICT,
  score         INTEGER     NOT NULL CHECK (score >= 1 AND score <= 5),
  comment       TEXT        CHECK (comment IS NULL OR char_length(comment) <= 500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idea_id, evaluator_id)
);

-- ── Indexes ────────────────────────────────────────────

CREATE INDEX idx_idea_score_idea_id ON public.idea_score (idea_id);
CREATE INDEX idx_idea_score_evaluator_id ON public.idea_score (evaluator_id);

-- ── Trigger (reuse existing function from 001) ─────────

CREATE TRIGGER set_idea_score_updated_at
  BEFORE UPDATE ON public.idea_score
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ── RLS ────────────────────────────────────────────────

ALTER TABLE public.idea_score ENABLE ROW LEVEL SECURITY;

-- 1. Admins: full read access to all scores
CREATE POLICY "Admins can read all scores"
  ON public.idea_score FOR SELECT
  USING ((SELECT public.is_admin()));

-- 2. Evaluators (admins acting as evaluator): read all scores
-- Uses direct role check in case evaluator role is added later
CREATE POLICY "Evaluators can read all scores"
  ON public.idea_score FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'
    )
  );

-- 3. Submitters: read scores on their own ideas only
CREATE POLICY "Submitters can read scores on own ideas"
  ON public.idea_score FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.idea i
      WHERE i.id = idea_id
        AND i.user_id = (SELECT auth.uid())
    )
  );

-- 4. Evaluators/admins: insert their own scores only
CREATE POLICY "Evaluators and admins can insert own scores"
  ON public.idea_score FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = evaluator_id
    AND (SELECT public.is_admin())
  );

-- 5. Evaluators/admins: update their own scores only
CREATE POLICY "Evaluators and admins can update own scores"
  ON public.idea_score FOR UPDATE
  USING (
    (SELECT auth.uid()) = evaluator_id
    AND (SELECT public.is_admin())
  );
