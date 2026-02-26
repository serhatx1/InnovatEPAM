-- ============================================================
-- Add multi-stage review workflow schema
-- ============================================================

CREATE TABLE public.review_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.user_profile(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_review_workflow_active
  ON public.review_workflow (is_active)
  WHERE is_active = true;

CREATE TABLE public.review_stage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.review_workflow(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, name),
  UNIQUE (workflow_id, position),
  UNIQUE (workflow_id, id)
);

CREATE TABLE public.idea_stage_state (
  idea_id UUID PRIMARY KEY REFERENCES public.idea(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.review_workflow(id) ON DELETE RESTRICT,
  current_stage_id UUID NOT NULL,
  state_version INTEGER NOT NULL DEFAULT 1 CHECK (state_version > 0),
  terminal_outcome TEXT CHECK (terminal_outcome IN ('accepted', 'rejected')),
  updated_by UUID NOT NULL REFERENCES public.user_profile(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_idea_stage_state_stage_workflow
    FOREIGN KEY (workflow_id, current_stage_id)
    REFERENCES public.review_stage (workflow_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX idx_idea_stage_state_workflow_id
  ON public.idea_stage_state (workflow_id);

CREATE INDEX idx_idea_stage_state_current_stage_id
  ON public.idea_stage_state (current_stage_id);

CREATE TABLE public.review_stage_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.idea(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.review_workflow(id) ON DELETE RESTRICT,
  from_stage_id UUID,
  to_stage_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('advance', 'return', 'hold', 'terminal_accept', 'terminal_reject')),
  evaluator_comment TEXT,
  actor_id UUID NOT NULL REFERENCES public.user_profile(id) ON DELETE RESTRICT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_review_event_to_stage_workflow
    FOREIGN KEY (workflow_id, to_stage_id)
    REFERENCES public.review_stage (workflow_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_review_event_from_stage_workflow
    FOREIGN KEY (workflow_id, from_stage_id)
    REFERENCES public.review_stage (workflow_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX idx_review_stage_event_idea_id_occurred_at
  ON public.review_stage_event (idea_id, occurred_at DESC);

CREATE INDEX idx_review_stage_event_workflow_id
  ON public.review_stage_event (workflow_id);

ALTER TABLE public.review_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_stage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_stage_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_stage_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage review workflows"
  ON public.review_workflow FOR ALL
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can manage review stages"
  ON public.review_stage FOR ALL
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Reviewers can read stage state"
  ON public.idea_stage_state FOR SELECT
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.user_profile up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'evaluator'
    )
    OR EXISTS (
      SELECT 1
      FROM public.idea i
      WHERE i.id = idea_id
        AND i.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Reviewers can update stage state"
  ON public.idea_stage_state FOR UPDATE
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.user_profile up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'evaluator'
    )
  )
  WITH CHECK (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.user_profile up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'evaluator'
    )
  );

CREATE POLICY "Reviewers can insert stage state"
  ON public.idea_stage_state FOR INSERT
  WITH CHECK (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.user_profile up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'evaluator'
    )
  );

CREATE POLICY "Reviewers can read review events"
  ON public.review_stage_event FOR SELECT
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.user_profile up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'evaluator'
    )
    OR EXISTS (
      SELECT 1
      FROM public.idea i
      WHERE i.id = idea_id
        AND i.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Reviewers can insert review events"
  ON public.review_stage_event FOR INSERT
  WITH CHECK (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.user_profile up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'evaluator'
    )
  );

CREATE TRIGGER idea_stage_state_updated_at
  BEFORE UPDATE ON public.idea_stage_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
