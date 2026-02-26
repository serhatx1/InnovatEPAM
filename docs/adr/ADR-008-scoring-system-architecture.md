# ADR-008: Scoring System Architecture

**Status**: Accepted  
**Date**: 2026-02-27  
**Context**: InnovatEPAM Portal – Feature 8 (Scoring System)

## Decision

Implement a 1–5 integer scoring system using a dedicated `idea_score` table with query-time aggregate computation, stage-independent scoring gated on terminal review outcome, and blind-review-aware evaluator identity handling.

## Context

The evaluation workflow needs structured quantitative feedback beyond binary accept/reject decisions. Evaluators must assign numeric scores (1–5) to ideas under active review, with aggregated metrics (average, count) visible to administrators for data-driven prioritization. The system must integrate with the existing multi-stage review pipeline (ADR-007) and blind review anonymization (Feature 7) without coupling scoring to specific review stages.

Key requirements:
- One score per evaluator per idea, replaceable (upsert semantics)
- Optional comment (max 500 chars) per score
- Aggregate display: average (1 decimal), count, distribution
- Scoring blocked after terminal review outcome
- Evaluators cannot score their own ideas
- Blind review mode hides evaluator identity on score entries

## Considered Options

### Score Storage

| Option | Pros | Cons |
|--------|------|------|
| **Dedicated `idea_score` table** | Normalized, RLS per-score, efficient upsert, clean aggregation | Additional table and migration |
| JSONB array on `idea` table | No new table | No per-score RLS, complex upsert, poor aggregate queries |
| EAV pattern | Flexible | Over-engineered for a fixed schema (score + comment) |

### Aggregate Computation

| Option | Pros | Cons |
|--------|------|------|
| **Query-time AVG/COUNT** | Always consistent, zero maintenance, simple | Recomputed on each read |
| Materialized column + trigger | Fast reads | Trigger complexity, drift risk, overkill at MVP scale |
| Materialized view | Encapsulated | Staleness, REFRESH overhead, Supabase PostgREST friction |

### Scoring Eligibility

| Option | Pros | Cons |
|--------|------|------|
| **Stage-independent, gated on terminal_outcome** | Matches spec ("any idea currently under review"), simple guard | Evaluators can score at any stage |
| Stage-coupled (per-stage `scoreable` flag) | Fine-grained control | Schema changes to `review_stage`, spec doesn't require it |
| Status-based (`idea.status = 'under_review'`) | Simple | Fragile — doesn't reflect multi-stage state accurately |

## Architecture

### Data Model

Single new table — `idea_score`:
- UUID primary key (consistent with all project tables)
- Composite UNIQUE on `(idea_id, evaluator_id)` enabling `.upsert()` with `onConflict`
- `score INTEGER CHECK (1..5)` for DB-level validation
- `comment TEXT CHECK (length <= 500)` — nullable
- CASCADE on idea delete, RESTRICT on evaluator delete (scores survive deactivation)
- RLS: admins/evaluators read all scores; submitters read scores on own ideas; evaluators upsert own scores only

### Aggregation

Computed inline at query time:
```sql
SELECT idea_id, ROUND(AVG(score)::NUMERIC(3,1), 1) AS avg_score, COUNT(*) AS score_count
FROM idea_score WHERE idea_id = $1 GROUP BY idea_id
```

At MVP scale (hundreds of ideas × ~20 evaluators = low thousands of rows), indexed `AVG`/`COUNT` completes in <1ms. No materialization needed.

### Blind Review Integration

Reuses the existing `shouldAnonymize()` helper from Feature 7. When blind review is enabled and the idea is non-terminal:
- Evaluator identity on score entries is replaced with "Anonymous Evaluator"
- Admins always see full identity
- Own scores always show own identity

### Scoring Guard

```
IF idea_stage_state.terminal_outcome IS NOT NULL → 403 (terminal)
IF evaluator_id = idea.user_id → 403 (self-scoring)
ELSE → allow upsert
```

## Consequences

- Migration `009_add_scoring_system.sql` adds `idea_score` table with RLS policies
- Types extended with `IdeaScore`, `ScoreAggregate`, `IdeaWithScore` interfaces
- Zod schema validates score input (integer 1–5, optional comment ≤500 chars)
- Score queries in `src/lib/queries/idea-scores.ts` provide upsert, fetch, and aggregate helpers
- Admin listing gains sort-by-average-score capability via LEFT JOIN subquery
- Blind review anonymization applied to score entries consistent with existing pattern
- Future enhancements (weighted scores, multi-criteria rubrics) can extend `idea_score` without breaking aggregation
