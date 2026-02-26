# Data Model: Scoring System (1–5 Ratings)

**Feature**: 8-scoring-system
**Created**: 2026-02-26

## Entities

### 1) idea_score

Stores one evaluator's rating for a given idea. Enforces one score per evaluator per idea via a composite UNIQUE constraint.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | UUID | PK DEFAULT gen_random_uuid() | Surrogate identifier |
| idea_id | UUID | FK → idea.id ON DELETE CASCADE, NOT NULL | Target idea |
| evaluator_id | UUID | FK → user_profile.id ON DELETE RESTRICT, NOT NULL | Evaluator who scored |
| score | INTEGER | NOT NULL CHECK (score >= 1 AND score <= 5) | Rating value (1–5) |
| comment | TEXT | CHECK (comment IS NULL OR char_length(comment) <= 500) | Optional justification |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | First score timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Last update timestamp |

**Composite UNIQUE**: `(idea_id, evaluator_id)` — enforces FR-002 (one score per evaluator per idea) at the database level and enables Supabase `.upsert()` with `onConflict`.

**Indexes**:
- `idx_idea_score_idea_id` on `(idea_id)` — accelerates per-idea aggregate queries (primary access pattern)
- `idx_idea_score_evaluator_id` on `(evaluator_id)` — supports "evaluator's scores" queries

Validation rules:
- `score` must be an integer between 1 and 5 inclusive (CHECK constraint).
- `comment` is nullable; when present, max 500 characters (CHECK constraint).
- `evaluator_id` must reference a user with role `admin` (evaluator) — enforced by RLS, not FK.
- Evaluator cannot score their own idea (`evaluator_id != idea.user_id`) — enforced in application logic and optionally by RLS/check.
- Scores on soft-deleted ideas (`idea.deleted_at IS NOT NULL`) are excluded at query time, not cascade-deleted.

---

### Score Aggregate (Computed — No Table)

Aggregates are computed at query time via SQL `AVG()` and `COUNT()`. Not a stored entity.

| Derived Field | Computation | Notes |
| --- | --- | --- |
| avg_score | `ROUND(AVG(score)::NUMERIC(3,1), 1)` | Rounded to one decimal |
| score_count | `COUNT(*)` | Number of evaluators who scored |

Access pattern:
```sql
SELECT idea_id,
       ROUND(AVG(score)::NUMERIC(3,1), 1) AS avg_score,
       COUNT(*) AS score_count
FROM idea_score
WHERE idea_id = $1
GROUP BY idea_id
```

---

## Relationships

- `idea 1:N idea_score` — one idea can have many scores (one per evaluator)
- `user_profile 1:N idea_score` — one evaluator can score many ideas
- `idea_score.idea_id → idea.id` (CASCADE delete on hard-delete)
- `idea_score.evaluator_id → user_profile.id` (RESTRICT delete)

No relationship to `review_workflow`, `review_stage`, or `portal_setting` at the storage level. Scoring eligibility (active review, not terminal) is checked at application/API layer via `idea_stage_state`.

---

## State Transitions

### Score lifecycle

1. **Create**: Evaluator submits a score (1–5) for an idea under active review → `INSERT` into `idea_score`.
2. **Update**: Evaluator re-scores the same idea → `UPSERT` replaces `score`, `comment`, and `updated_at` on existing row.
3. **Read aggregates**: Any authorized viewer queries `AVG`/`COUNT` per idea at view time.
4. **Become read-only**: When idea reaches terminal outcome (`idea_stage_state.terminal_outcome IS NOT NULL`), scoring is blocked at the API layer. Existing scores remain for aggregate display.

### Scoring eligibility guard

```
IF idea_stage_state.terminal_outcome IS NOT NULL → BLOCK scoring (403)
IF evaluator_id = idea.user_id → BLOCK scoring (403, self-scoring)
ELSE → ALLOW upsert
```

---

## Visibility Model (Role-Oriented)

Extends the existing blind review visibility model from Feature 7:

| Viewer | Blind Review OFF | Blind Review ON (non-terminal) | Blind Review ON (terminal) |
| --- | --- | --- | --- |
| Admin | Full scores + evaluator identity | Full scores + evaluator identity | Full scores + evaluator identity |
| Evaluator (other) | Scores + evaluator identity | Scores + "Anonymous Evaluator" | Scores + evaluator identity |
| Evaluator (own score) | Own score + own identity | Own score + own identity | Own score + own identity |
| Submitter (own idea) | Aggregate only (avg, count) | Aggregate only (avg, count) | Aggregate + evaluator identity |
| Submitter (other idea) | N/A (can't view other ideas' scores) | N/A | N/A |

**Note**: Submitters see aggregates on their own ideas but individual evaluator identities are only visible after terminal outcome (when blind review reveal applies).

---

## Migration Plan

Migration file: `supabase/migrations/009_add_scoring_system.sql`

Sequence:
1. Create `idea_score` table with constraints and indexes.
2. Add `updated_at` trigger (reuse existing `update_updated_at()` function).
3. Enable RLS and create policies.
4. Optionally create `get_score_aggregates` RPC function for listing queries.
