# Implementation Plan: Scoring System (1–5 Ratings)

**Feature**: 8-scoring-system
**Branch**: 8-scoring-system
**Created**: 2026-02-26
**Spec**: [spec.md](spec.md)

## Technical Context

| Area | Technology | Version |
| --- | --- | --- |
| Runtime | Next.js (App Router) | 16.1 |
| UI | React + shadcn/ui + Tailwind CSS | 19 / latest / 4 |
| Language | TypeScript (strict mode) | 5.x |
| Backend | Supabase (Postgres + RLS + Auth) | Latest |
| Validation | Zod | 4.x |
| Testing | Vitest + React Testing Library | 4.x |
| Deployment | Vercel | — |

### Existing System Baseline

- Multi-stage review (Feature 6): `review_workflow`, `review_stage`, `idea_stage_state`, `review_stage_event` tables with optimistic concurrency.
- Blind review (Feature 7): `portal_setting` table, `shouldAnonymize()` helper, API-layer anonymization of submitter identity.
- Visibility shaping (`src/lib/review/visibility.ts`) strips evaluator identity from submitter views during non-terminal review.
- Idea queries in `src/lib/queries/ideas.ts` — `listIdeas`, `getIdeaById`, `createIdea`, `updateIdeaStatus`.
- Stage state queries in `src/lib/queries/review-state.ts`.
- Role model: `admin` and `submitter` in `user_profile.role`; admins serve as evaluators.
- Existing migrations: 001–008 applied.

### Technical Unknowns Identified (Pre-Research)

- Score storage schema — **RESOLVED in research R1** (`idea_score` table with UNIQUE composite).
- Aggregate computation strategy — **RESOLVED in research R2** (query-time AVG/COUNT).
- Scoring vs stage independence — **RESOLVED in research R3** (independent, gated on terminal_outcome).
- Blind review integration — **RESOLVED in research R4** (reuse `shouldAnonymize()` pattern).
- Upsert pattern — **RESOLVED in research R5** (Supabase `.upsert()` with `onConflict`).
- RLS policies — **RESOLVED in research R6** (admin/evaluator read all, submitter reads own idea scores).
- Score sorting — **RESOLVED in research R7** (LEFT JOIN subquery or JS-merge fallback).

## Constitution Check (Pre-Design)

| Principle | Compliance | Notes |
| --- | --- | --- |
| Simplicity First | ✅ PASS | Single new table, query-time aggregates, reuse existing anonymization helper. No new services. |
| Test-First (TDD) | ✅ PLAN | Plan requires tests before query/API/UI changes for scoring paths. |
| Secure by Default | ✅ PLAN | Zod validation on score input. RLS on `idea_score`. Role check + terminal-outcome + self-score guards in API. |
| Type Safety | ✅ PLAN | `IdeaScore` interface in types. Zod schema for score submission. Typed query helpers. |
| Spec-Driven Development | ✅ PASS | Spec, research, and data model completed before implementation planning. |

### Gate Result: **PASS**

No constitutional violations identified.

## Phase 0: Research Output

Research completed in [research.md](research.md). All identified unknowns are resolved:

| Unknown | Decision | Research Reference |
| --- | --- | --- |
| Score storage | `idea_score` table with UUID PK + UNIQUE `(idea_id, evaluator_id)` | R1 |
| Aggregates | Query-time AVG/COUNT, no materialization | R2 |
| Stage independence | Scoring gated on `terminal_outcome IS NULL`, not stage position | R3 |
| Blind review | Reuse `shouldAnonymize()` pattern for evaluator identity on scores | R4 |
| Upsert | Supabase `.upsert()` with `onConflict: "idea_id,evaluator_id"` | R5 |
| RLS | Admin/evaluator read all; submitter reads own idea scores; upsert own only | R6 |
| Sorting | LEFT JOIN aggregated subquery or JS-merge fallback | R7 |

## Phase 1: Design Output

- Data model documented in [data-model.md](data-model.md)
- External interface contract documented in [contracts/api.md](contracts/api.md)
- Validation/runbook documented in [quickstart.md](quickstart.md)

## Implementation Strategy (Phase 2 Planning)

### Layer 1: Database & Types

1. **Migration `009_add_scoring_system.sql`**
   - Create `idea_score` table with PK, FKs, CHECK constraints, UNIQUE composite.
   - Add indexes on `idea_id` and `evaluator_id`.
   - Attach `update_updated_at()` trigger.
   - Enable RLS and create 4 policies (admin read, evaluator read, submitter read own, upsert own).

2. **Types extension**
   - Add `IdeaScore` interface to `src/types/index.ts`.
   - Add `ScoreAggregate` interface.
   - Add `IdeaWithScore` extension interface (idea + avgScore + scoreCount).

3. **Validation schema**
   - Create `scoreSubmissionSchema` in `src/lib/validation/score.ts` (Zod: score int 1–5, optional comment max 500).

### Layer 2: Queries & Helpers

4. **Score queries** (`src/lib/queries/idea-scores.ts`)
   - `upsertScore(supabase, { idea_id, evaluator_id, score, comment })` → IdeaScore
   - `getScoresForIdea(supabase, ideaId)` → IdeaScore[]
   - `getScoreAggregateForIdea(supabase, ideaId)` → ScoreAggregate
   - `getScoreAggregatesForIdeas(supabase, ideaIds)` → Map<ideaId, ScoreAggregate>

5. **Score anonymization helper** (`src/lib/review/score-anonymize.ts`)
   - `anonymizeScoreEntry(score, mask)` → score with evaluator_id masked
   - Reuse `shouldAnonymize()` pattern from blind review

6. **Scoring eligibility helper** (`src/lib/review/scoring-eligibility.ts`)
   - `checkScoringEligibility(supabase, ideaId, evaluatorId)` → { eligible: boolean, reason?: string }
   - Checks: idea exists, not soft-deleted, has stage state, not terminal, evaluator ≠ submitter

### Layer 3: API Endpoints

7. **Score submission endpoint**
   - `PUT /api/ideas/[id]/score/route.ts` — validate, check eligibility, upsert, return score

8. **Score listing endpoint**
   - `GET /api/ideas/[id]/scores/route.ts` — fetch scores + aggregate, apply blind review masking, return

9. **Modify existing idea endpoints**
   - `GET /api/ideas` — add avgScore/scoreCount to response (via secondary query or JOIN)
   - `GET /api/ideas/[id]` — add avgScore/scoreCount to response
   - Support `?sortBy=avgScore&sortDir=desc|asc` query parameter on listing

### Layer 4: UI

10. **Score submission form component**
    - Star/number selector (1–5) with optional comment textarea
    - Show current user's existing score pre-filled for update
    - Disable when idea is terminal

11. **Score aggregate display component**
    - Average badge + count label on idea detail
    - "No scores yet" empty state

12. **Score listing component on idea detail**
    - List individual scores with evaluator name (or anonymous)
    - Highlight the current evaluator's own score

13. **Admin listing enhancement**
    - Add avgScore column to admin ideas table
    - Sort toggle on the score column header

### Layer 5: Testing (TDD-first execution)

14. **Unit tests**
    - `scoreSubmissionSchema` validation (valid, out-of-range, non-integer, comment length)
    - `upsertScore` query helper (insert, update, mocked Supabase)
    - `getScoresForIdea` and aggregate queries (mocked Supabase)
    - `anonymizeScoreEntry` with mask on/off
    - `checkScoringEligibility` (eligible, terminal blocked, self-score blocked)

15. **API tests**
    - PUT score: success, validation error, terminal blocked, self-score blocked, auth required
    - GET scores: success, blind review masking, submitter own idea, forbidden for other ideas
    - GET ideas listing: avgScore/scoreCount present, sort by avgScore

16. **UI tests**
    - Score form renders, submits, shows validation error
    - Score aggregate display with scores and empty state
    - Admin listing score column and sort

## Post-Design Constitution Check

| Principle | Compliance | Notes |
| --- | --- | --- |
| Simplicity First | ✅ PASS | Single new table, query-time aggregates, reuse existing anonymization pattern. No new infrastructure. |
| Test-First (TDD) | ✅ PASS | Phase 2 strategy sequences tests before implementation in each layer (Layer 5). |
| Secure by Default | ✅ PASS | Zod validation, RLS policies, API-layer role/eligibility checks, blind review masking at API layer. |
| Type Safety | ✅ PASS | `IdeaScore` interface, Zod schema, typed query/helper functions. |
| Spec-Driven Development | ✅ PASS | All design artifacts trace to FR-001..FR-011 and research decisions R1..R7. |

### Gate Result: **PASS**

Design remains constitution-compliant and ready for `/speckit.tasks`.
