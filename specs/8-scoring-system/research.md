# Research: Scoring System (1–5 Ratings)

**Feature**: 8-scoring-system
**Created**: 2026-02-26
**Status**: Complete

---

## R1: Score Storage Schema

**Decision**: Create a dedicated `idea_score` table with a composite UNIQUE constraint on `(idea_id, evaluator_id)`.

```sql
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

CREATE INDEX idx_idea_score_idea_id ON public.idea_score (idea_id);
CREATE INDEX idx_idea_score_evaluator_id ON public.idea_score (evaluator_id);
```

**Rationale**:
- **Surrogate PK (`id UUID`)**: Consistent with every other table in the project (`idea`, `review_stage_event`, etc.). Provides a stable opaque identifier for API responses and future references.
- **Composite UNIQUE `(idea_id, evaluator_id)`**: Enforces FR-002 (one score per evaluator per idea) at the database level. Enables Supabase `.upsert()` with `onConflict` targeting this pair.
- **`score INTEGER CHECK (1..5)`**: DB-level guard matches FR-001 / FR-009. Integer-only constraint prevents decimal values. The app validates too, but the CHECK is the last line of defense.
- **`comment TEXT` with length CHECK**: Nullable per FR-003. Max 500 chars enforced by CHECK constraint (mirrors the spec edge case). Using `TEXT` + CHECK rather than `VARCHAR(500)` follows the project convention (see `001_create_schema.sql` comment: "TEXT for strings — never varchar(n)").
- **`ON DELETE CASCADE` for idea FK**: When an idea is hard-deleted, scores are cleaned up automatically. Soft-deleted ideas (`deleted_at IS NOT NULL`) are filtered at query time, not cascade-deleted — consistent with current `listIdeas` which filters `is("deleted_at", null)`.
- **`ON DELETE RESTRICT` for evaluator FK**: Scores survive evaluator deactivation (spec edge case: "existing scores remain in the system"). RESTRICT prevents accidental deletion of user profiles that have associated scores.
- **Indexes**: `idx_idea_score_idea_id` accelerates aggregate queries per idea (the primary access pattern). `idx_idea_score_evaluator_id` supports "my scores" queries if ever needed. Both follow the project convention of explicit FK indexes (see `idx_idea_user_id` in `001_create_schema.sql`).
- **`updated_at` with trigger**: Reuses the existing `update_updated_at()` trigger function already defined in `001_create_schema.sql`.

**Alternatives considered**:
1. **JSONB column on `idea` table** — Embedding scores as a JSONB array on the idea row would avoid a new table but violates normalization, makes RLS per-score impossible, complicates upsert logic, and prevents efficient aggregate queries. Rejected.
2. **Composite PK `(idea_id, evaluator_id)` without surrogate `id`** — Viable and slightly simpler. Rejected because every other table in the project uses a surrogate UUID PK, and having a stable single-column identifier simplifies API responses and future references (e.g., "delete score by id").
3. **Separate `idea_score_comment` table** — Over-normalized for a single optional text field. Rejected.

---

## R2: Aggregate Computation Strategy

**Decision**: Compute aggregates at query time using inline SQL aggregation (`AVG`, `COUNT`). No materialized column, no separate table, no Postgres view.

**Rationale**:
- **Scale**: The spec describes hundreds of ideas and <20 evaluators. Maximum score rows ≈ hundreds × 20 = low thousands. `AVG()` and `COUNT()` over an indexed `idea_id` column on this scale complete in <1ms. No optimization needed.
- **Consistency**: Query-time computation is always up-to-date. No stale cache, no trigger-maintained denormalization, no eventual consistency concerns. When an evaluator updates their score, the next read reflects it immediately.
- **Simplicity**: Zero additional schema, zero triggers, zero maintenance burden. The spec explicitly calls out "Score Aggregate: Not a stored entity — derived at query time from individual scores" in Key Entities.
- **Supabase compatibility**: Supabase PostgREST doesn't natively support views with complex joins as first-class resources. Inline aggregation via `.rpc()` or in the API route handler is more natural.

**Implementation pattern** (in API route or query helper):
```sql
SELECT idea_id, AVG(score)::NUMERIC(3,1) AS avg_score, COUNT(*) AS score_count
FROM idea_score
WHERE idea_id = ANY($1)
GROUP BY idea_id
```

For the listing page (R7), a LEFT JOIN with a subquery provides per-idea aggregates efficiently.

**Alternatives considered**:
1. **Materialized column on `idea` table** (`avg_score NUMERIC`, `score_count INTEGER`) updated by trigger — Adds complexity (trigger function, edge cases on delete/update), risk of drift. Only justified at >>10K scores per idea. Rejected at this scale.
2. **Postgres materialized view** — `REFRESH MATERIALIZED VIEW` is expensive and introduces staleness. Regular views are aliases for query-time computation anyway, offering no performance gain over inline SQL. A regular view could be useful for encapsulation but adds schema surface area for minimal benefit. Rejected.
3. **Application-level caching** (e.g., React Query stale-while-revalidate) — Already happens at the client layer via Next.js data fetching. Orthogonal to the DB strategy and doesn't replace correct server-side computation. Not an alternative, but complementary.

---

## R3: Scoring vs Stage Transition Independence

**Decision**: Scoring is **independent of specific stages** but **gated on active review status**. An evaluator can score any idea that has an `idea_stage_state` record with `terminal_outcome IS NULL` (i.e., the idea is somewhere in the review pipeline and hasn't reached a terminal decision). Scoring is NOT coupled to a specific stage position.

**Rationale**:
- **Spec alignment**: FR-001 says "any idea currently under review." FR-004 says "prevent scoring of ideas that have already reached a terminal review outcome." The spec does not mention stage-specific scoring eligibility — it treats scoring as a cross-cutting evaluator action available throughout the review lifecycle.
- **Simplicity**: Coupling scores to specific stages would require tracking which stages allow scoring, introducing a `scoreable` flag on `review_stage` and conditional logic. The spec's assumptions state scoring "integrates as an evaluator action available during active review stages" (plural), not a per-stage capability.
- **User experience**: Evaluators don't need to wait for an idea to reach a specific stage before scoring. They can score as soon as the idea enters review, and update their score at any point until terminal outcome.

**Guard logic** (in API route):
```typescript
// Fetch idea_stage_state for the target idea
const { data: stageState } = await supabase
  .from("idea_stage_state")
  .select("terminal_outcome")
  .eq("idea_id", ideaId)
  .maybeSingle();

// Score is allowed if: stage state exists AND no terminal outcome
if (!stageState) return error(400, "Idea is not under review");
if (stageState.terminal_outcome) return error(403, "Idea has reached a terminal outcome");
```

**Alternatives considered**:
1. **Stage-coupled scoring** (only allow scoring at specific stages) — More complex, requires `review_stage` schema changes, and the spec doesn't call for it. Rejected.
2. **Status-based gating** (check `idea.status = 'under_review'`) — Fragile because it doesn't account for the multi-stage state machine. An idea's `status` column may not perfectly reflect stage state. Using `idea_stage_state.terminal_outcome IS NULL` is the authoritative source. Rejected as sole check, but `idea.status` can be a supplementary sanity guard.
3. **No gating** (allow scoring at any time) — Violates FR-004. Rejected.

---

## R4: Blind Review Integration for Scores

**Decision**: Reuse the existing `shouldAnonymize()` pattern from `src/lib/review/blind-review.ts`. Apply the same logic to score entries: when blind review is ON, strip `evaluator_id` from individual score entries returned to non-admin viewers. No separate anonymization mechanism.

**Rationale**:
- **Consistency**: The project already has a well-tested `shouldAnonymize()` function with clear rules: (1) blind review enabled, (2) not admin, (3) not self-view, (4) not terminal. Score anonymization follows the same rules — FR-007 says "individual score entries MUST NOT reveal evaluator identity to other evaluators or submitters. Administrators always see full identity."
- **Implementation**: The API route handler that returns scores will call `shouldAnonymize()` (or a scores-specific variant) and replace `evaluator_id` with `"anonymous"` on each score entry when masking is required. The existing `anonymizeIdeaResponse` masks `user_id` → `"anonymous"` — the score equivalent masks `evaluator_id` → `"anonymous"`.
- **No DB-level anonymization**: RLS policies don't need to hide `evaluator_id` from the raw row. The API layer handles masking, consistent with how idea `user_id` anonymization works today (the DB returns full data; the API route strips identity before response).

**Score-specific anonymization function**:
```typescript
export function anonymizeScoreEntry(
  score: IdeaScore,
  mask: boolean
): IdeaScore & { evaluator_display_name?: string } {
  if (!mask) return score;
  return {
    ...score,
    evaluator_id: "anonymous",
    evaluator_display_name: "Anonymous Evaluator",
  };
}
```

**Blind review condition for scores** (adapted from `shouldAnonymize`):
- Blind review is ON
- Viewer is NOT an admin
- Idea does NOT have a terminal outcome
- (Self-view exemption does not apply to scores: an evaluator can always see their own score's evaluator_id is themselves, but other evaluators' scores are masked)

**Alternatives considered**:
1. **Postgres VIEW that conditionally hides evaluator_id** — Would require `current_setting()` or a function parameter to determine blind review state. Complex, hard to test, and inconsistent with the existing pattern where anonymization is an application-layer concern. Rejected.
2. **Separate RLS policy that omits evaluator_id column for non-admins** — RLS operates at row level, not column level. Would require a separate limited view or function. Over-engineering. Rejected.
3. **Store scores without evaluator_id when blind review is ON** — Destructive anonymization prevents toggling blind review off and makes data integrity impossible (can't enforce one-per-evaluator). Rejected.

---

## R5: Supabase Upsert Pattern for Scores

**Decision**: Use Supabase `.upsert()` with `onConflict: "idea_id, evaluator_id"` targeting the composite UNIQUE constraint. This is the idiomatic Supabase pattern — the same approach used for `portal_setting` upsert in `src/lib/queries/portal-settings.ts`.

**Implementation**:
```typescript
export async function upsertScore(
  supabase: SupabaseClient,
  input: { idea_id: string; evaluator_id: string; score: number; comment: string | null }
): Promise<{ data: IdeaScore | null; error: string | null }> {
  const { data, error } = await supabase
    .from("idea_score")
    .upsert(
      {
        idea_id: input.idea_id,
        evaluator_id: input.evaluator_id,
        score: input.score,
        comment: input.comment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "idea_id,evaluator_id" }
    )
    .select()
    .single();

  return {
    data: data as IdeaScore | null,
    error: error?.message ?? null,
  };
}
```

**Rationale**:
- **Atomic**: Postgres `INSERT ... ON CONFLICT DO UPDATE` is a single atomic statement. No race condition between concurrent evaluators scoring the same idea.
- **Idiomatic**: Matches the existing `setBlindReviewEnabled` upsert in `portal-settings.ts` line-for-line in structure. Developers won't encounter a new pattern.
- **Simple**: One DB round-trip, no check-then-insert (which requires a transaction wrapper and is prone to TOCTOU races).
- **`updated_at` explicit set**: The upsert sends `updated_at` explicitly because on INSERT the `DEFAULT now()` applies, but on UPDATE (conflict) Supabase sends only the upsert payload. The trigger `update_updated_at()` will also fire on UPDATE, but explicitly setting it in the payload makes the intent clear and works in both insert and update paths.

**Alternatives considered**:
1. **Check-then-insert** (SELECT existing → INSERT or UPDATE) — Two round-trips, requires a transaction to avoid race conditions, and is more code. Rejected.
2. **Raw SQL via `.rpc()`** — Avoids PostgREST limitations, but the `.upsert()` method handles this case cleanly and is more maintainable. Raw SQL would be warranted only if PostgREST upsert didn't support composite conflict targets — but it does. Rejected.
3. **Delete-then-insert** — Loses the original `created_at` timestamp and generates unnecessary delete events if audit logging is ever added. Rejected.

---

## R6: RLS Policies for Score Table

**Decision**: Four RLS policies covering the access patterns defined in the spec.

```sql
ALTER TABLE public.idea_score ENABLE ROW LEVEL SECURITY;

-- 1. Admins: full read access to all scores
CREATE POLICY "Admins can read all scores"
  ON public.idea_score FOR SELECT
  USING ((SELECT public.is_admin()));

-- 2. Evaluators: read all scores (needed for aggregate display and to see own score)
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

-- 4. Evaluators/admins: insert and update their own scores only
CREATE POLICY "Evaluators and admins can upsert own scores"
  ON public.idea_score FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = evaluator_id
    AND (
      (SELECT public.is_admin())
      OR EXISTS (
        SELECT 1 FROM public.user_profile up
        WHERE up.id = (SELECT auth.uid())
          AND up.role = 'admin'
      )
    )
  );

CREATE POLICY "Evaluators and admins can update own scores"
  ON public.idea_score FOR UPDATE
  USING (
    (SELECT auth.uid()) = evaluator_id
    AND (
      (SELECT public.is_admin())
      OR EXISTS (
        SELECT 1 FROM public.user_profile up
        WHERE up.id = (SELECT auth.uid())
          AND up.role = 'admin'
      )
    )
  );
```

**Important note on roles**: The current `user_profile` schema has `role IN ('submitter', 'admin')` but the multi-stage review RLS policies (migration 007) reference `role = 'evaluator'`. This suggests admins serve as evaluators in the current implementation. The RLS policies above should mirror the pattern used in `007_add_multi_stage_review.sql` — checking for `role = 'admin'` OR `role = 'evaluator'` to be forward-compatible if an evaluator role is added.

**Rationale**:
- **Follows existing patterns**: Matches the RLS structure in `007_add_multi_stage_review.sql` exactly — same `is_admin()` helper, same evaluator role check subquery pattern, same submitter-via-idea-join pattern.
- **`evaluator_id = auth.uid()` on INSERT/UPDATE**: Prevents an evaluator from submitting scores on behalf of another evaluator. Combined with the role check, this means only authorized roles can insert and only for themselves.
- **No DELETE policy**: Scores are not deletable per spec. If soft-delete is ever needed, an UPDATE policy would handle it. Omitting DELETE policy means RLS will block all deletes by default.
- **Cached `(SELECT auth.uid())`**: Uses subselect caching pattern per the `001_create_schema.sql` comment: "100x+ faster on large tables."

**Alternatives considered**:
1. **Single permissive SELECT policy** (`authenticated` can read all) — Too broad; submitters would see all scores across all ideas, not just their own. Rejected.
2. **Column-level security** (hide `evaluator_id` at RLS level for blind review) — RLS operates on rows, not columns. Would require a view or function. Anonymization at the API layer is the established pattern. Rejected.
3. **Service-role bypass** (skip RLS, use service key in API route) — Less secure and forfeits the defense-in-depth that RLS provides. The project consistently uses RLS as a security boundary. Rejected.

---

## R7: Score Sorting on Listing

**Decision**: LEFT JOIN with an aggregated subquery in the ideas listing query. The API route handler joins the ideas query with a subquery that computes `AVG(score)` and `COUNT(*)` per idea, enabling `ORDER BY avg_score DESC NULLS LAST`.

**Implementation** (Postgres SQL, called via Supabase `.rpc()`):

```sql
CREATE OR REPLACE FUNCTION public.list_ideas_with_scores(
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_dir TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  status TEXT,
  category TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ,
  avg_score NUMERIC(3,1),
  score_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    i.id, i.title, i.status, i.category, i.user_id, i.created_at,
    ROUND(s.avg_score, 1) AS avg_score,
    COALESCE(s.score_count, 0) AS score_count
  FROM public.idea i
  LEFT JOIN (
    SELECT idea_id, AVG(score)::NUMERIC(3,1) AS avg_score, COUNT(*) AS score_count
    FROM public.idea_score
    GROUP BY idea_id
  ) s ON s.idea_id = i.id
  WHERE i.status != 'draft'
    AND i.deleted_at IS NULL
  ORDER BY
    CASE WHEN p_sort_by = 'avg_score' AND p_sort_dir = 'desc'
         THEN COALESCE(s.avg_score, 0) END DESC,
    CASE WHEN p_sort_by = 'avg_score' AND p_sort_dir = 'asc'
         THEN COALESCE(s.avg_score, 0) END ASC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'desc'
         THEN i.created_at END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'asc'
         THEN i.created_at END ASC;
$$;
```

**Alternatively** (simpler, no RPC): If the listing remains a simple Supabase PostgREST query, compute aggregates in a second query and merge in the API route:

```typescript
// 1. Fetch ideas
const { data: ideas } = await supabase.from("idea").select("*")...

// 2. Fetch aggregates for all idea IDs
const { data: aggregates } = await supabase.rpc("get_score_aggregates", {
  idea_ids: ideas.map(i => i.id)
});

// 3. Merge and sort in JS
const merged = ideas.map(idea => ({
  ...idea,
  avg_score: aggregates.find(a => a.idea_id === idea.id)?.avg_score ?? null,
  score_count: aggregates.find(a => a.idea_id === idea.id)?.score_count ?? 0,
}));
merged.sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0));
```

**Rationale**:
- **RPC function preferred**: A Postgres function via `.rpc()` keeps sorting in the database where it's most efficient and supports pagination correctly. PostgREST doesn't natively support ordering by a computed join column.
- **`SECURITY INVOKER`**: The function respects the caller's RLS policies. Ideas the caller can't see are still filtered out by the idea table's RLS policies.
- **`NULLS LAST` via `COALESCE(avg_score, 0)`**: Unscored ideas sort to the bottom when sorting descending, which matches the spec acceptance scenario: "unscored ideas appear at the bottom of the list."
- **Scale**: At hundreds of ideas, either the RPC or the two-query + JS-merge approach works fine. The RPC approach is cleaner and more future-proof.

**Alternatives considered**:
1. **Materialized `avg_score` column on `idea` table** — Would allow direct PostgREST ordering but requires trigger maintenance. Over-engineering at this scale. Rejected.
2. **Postgres VIEW** (`idea_with_scores`) — Viable, but Supabase treats views as virtual tables in PostgREST, and complex view joins can conflict with RLS. RPC functions are the recommended Supabase approach for complex queries. Rejected.
3. **Application-level sort only** (fetch all, sort in JS) — Works at small scale. The second "simpler" approach above does this. Acceptable as a first implementation if RPC is deferred, but doesn't support DB-level pagination. Acceptable fallback.
4. **Window function** (`RANK() OVER (ORDER BY AVG(...))`) — Adds rank/position metadata but doesn't fundamentally change the query pattern. Useful for leaderboard scenarios but not required by the spec. Rejected as unnecessary complexity.

---

## Summary of Decisions

| # | Question | Decision |
|---|----------|----------|
| R1 | Score storage schema | `idea_score` table with surrogate UUID PK + UNIQUE `(idea_id, evaluator_id)`, integer CHECK 1–5, optional 500-char comment |
| R2 | Aggregate computation | Query-time `AVG`/`COUNT` — no materialization |
| R3 | Scoring vs stages | Independent of stage position; gated on `terminal_outcome IS NULL` |
| R4 | Blind review integration | Reuse `shouldAnonymize()` pattern; strip `evaluator_id` in API layer |
| R5 | Upsert pattern | Supabase `.upsert()` with `onConflict: "idea_id,evaluator_id"` |
| R6 | RLS policies | Admin/evaluator read all; submitter reads own idea scores; insert/update own scores only |
| R7 | Score sorting | Postgres RPC function with LEFT JOIN aggregated subquery; JS-merge fallback acceptable |
