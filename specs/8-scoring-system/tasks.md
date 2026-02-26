# Tasks: Scoring System (1–5 Ratings)

**Feature**: 8-scoring-system
**Created**: 2026-02-26
**Spec**: [spec.md](spec.md)
**Plan**: [impl-plan.md](impl-plan.md)

## Phase 1: Setup (Project Initialization)

- [x] T001 Create migration for `idea_score` table with constraints, indexes, trigger, and RLS policies in supabase/migrations/009_add_scoring_system.sql
- [x] T002 [P] Add `IdeaScore` and `ScoreAggregate` interfaces to shared types in src/types/index.ts
- [x] T003 [P] Create `scoreSubmissionSchema` Zod validation in src/lib/validation/score.ts

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Create score query module (`upsertScore`, `getScoresForIdea`, `getScoreAggregateForIdea`, `getScoreAggregatesForIdeas`) in src/lib/queries/idea-scores.ts
- [x] T005 [P] Create scoring eligibility helper (`checkScoringEligibility`) in src/lib/review/scoring-eligibility.ts
- [x] T006 [P] Create score anonymization helper (`anonymizeScoreEntry`) in src/lib/review/score-anonymize.ts

## Phase 3: User Story 1 — Score an Idea During Review (Priority: P1)

**Goal**: Evaluator submits a 1–5 score with optional comment for any idea under active review. Upsert replaces previous score. Terminal and self-score blocked.

**Independent Test Criteria**: Log in as evaluator, open an idea under review, submit score 4 with comment, confirm persisted. Re-submit score 3, confirm replaced. Attempt on terminal idea → 403. Attempt on own idea → 403.

- [x] T007 [P] [US1] Add unit tests for `scoreSubmissionSchema` validation (valid, out-of-range, non-integer, comment length, missing) in tests/unit/validation-score.test.ts
- [x] T008 [P] [US1] Add unit tests for `upsertScore` query helper (insert, update/upsert, mocked Supabase) in tests/unit/queries-idea-score.test.ts
- [x] T009 [P] [US1] Add unit tests for `checkScoringEligibility` (eligible, terminal blocked, self-score blocked, idea not found) in tests/unit/scoring-eligibility.test.ts
- [x] T010 [US1] Implement PUT /api/ideas/[id]/score endpoint (validate, check eligibility, upsert, return score) in src/app/api/ideas/[id]/score/route.ts
- [x] T011 [P] [US1] Add API route tests for PUT /api/ideas/[id]/score (success, validation error, terminal blocked, self-score blocked, auth required, forbidden role) in tests/unit/api-idea-score.test.ts
- [x] T012 [US1] Build score submission form component (1–5 selector + optional comment + submit) in src/components/score-form.tsx
- [x] T013 [P] [US1] Add UI tests for score form (render, submit, validation error, disabled on terminal, pre-filled on update) in tests/unit/score-form.test.tsx
- [x] T014 [US1] Integrate score form into idea detail page for admin/evaluator role in src/app/ideas/[id]/page.tsx

## Phase 4: User Story 2 — View Aggregate Scores on an Idea (Priority: P1)

**Goal**: Admin/evaluator views average score, count, and individual score entries on idea detail. Blind review masks evaluator identity. Empty state shown when no scores exist.

**Independent Test Criteria**: Three evaluators score an idea (3, 4, 5). Admin views detail and sees avg 4.0, count 3, three individual entries. Enable blind review → evaluator identities show "Anonymous Evaluator". Unscored idea shows "No scores yet".

- [x] T015 [P] [US2] Add unit tests for `getScoresForIdea` and `getScoreAggregateForIdea` query helpers in tests/unit/queries-idea-score.test.ts
- [x] T016 [P] [US2] Add unit tests for `anonymizeScoreEntry` with mask on/off in tests/unit/score-blind-review.test.ts
- [x] T017 [US2] Implement GET /api/ideas/[id]/scores endpoint (fetch scores + aggregate, apply blind review masking, include myScore) in src/app/api/ideas/[id]/scores/route.ts
- [x] T018 [P] [US2] Add API route tests for GET /api/ideas/[id]/scores (success, blind review masking, submitter own idea, forbidden for other ideas, empty state) in tests/unit/api-idea-scores-list.test.ts
- [x] T019 [US2] Modify GET /api/ideas/[id] to include `avgScore` and `scoreCount` in response in src/app/api/ideas/[id]/route.ts
- [x] T020 [P] [US2] Add API tests for idea detail response including score aggregate fields in tests/unit/api-idea-detail-scores.test.ts
- [x] T021 [US2] Build score aggregate display component (average badge + count label + empty state) in src/components/score-aggregate.tsx
- [x] T022 [US2] Build score listing component (individual score entries with evaluator name or anonymous) in src/components/score-list.tsx
- [x] T023 [P] [US2] Add UI tests for score aggregate display (with scores, empty state) in tests/unit/score-aggregate.test.tsx
- [x] T024 [P] [US2] Add UI tests for score listing (entries visible, blind review anonymized, own score highlighted) in tests/unit/score-list.test.tsx
- [x] T025 [US2] Integrate score aggregate and score list into idea detail page in src/app/ideas/[id]/page.tsx

## Phase 5: User Story 3 — Compare Ideas by Score (Priority: P2)

**Goal**: Admin listing shows avgScore/scoreCount per idea and supports sorting by average score. Unscored ideas sort to bottom.

**Independent Test Criteria**: Score several ideas with varying ratings. Open admin listing, sort by avgScore desc, confirm correct order. Unscored ideas at bottom.

- [x] T026 [P] [US3] Add unit tests for `getScoreAggregatesForIdeas` (batch aggregate query) in tests/unit/queries-idea-score.test.ts
- [x] T027 [US3] Modify GET /api/ideas to include `avgScore` and `scoreCount` per idea and support `?sortBy=avgScore&sortDir=desc|asc` in src/app/api/ideas/route.ts
- [x] T028 [P] [US3] Add API tests for idea listing with score aggregates and sort by avgScore in tests/unit/api-ideas-score-sorting.test.ts
- [x] T029 [US3] Add avgScore column and sort toggle to admin review listing in src/app/admin/review/page.tsx
- [x] T030 [P] [US3] Add UI tests for admin listing score column and sort behavior in tests/unit/admin-review-score-sort.test.tsx

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T031 [P] Add integration test for full scoring flow (submit score → view aggregate → update score → verify) in tests/integration/api-scoring-flow.test.ts
- [x] T032 [P] Add integration test for scoring + blind review (score with blind ON → verify anonymous evaluator → toggle OFF → verify revealed) in tests/integration/api-scoring-flow.test.ts
- [x] T033 [P] Add integration test for terminal idea scoring block and self-score prevention in tests/integration/api-scoring-flow.test.ts
- [x] T034 Update quickstart validation checklist with test results in specs/8-scoring-system/quickstart.md
- [x] T035 Run full test suite quality sweep and confirm all tests pass via npm test

## Dependencies

### Phase Dependencies

- Phase 1 (Setup) must complete before Phase 2 (Foundational).
- Phase 2 must complete before any user story phases.
- US1 (Phase 3) depends on Phase 2 queries, eligibility helper, and validation schema.
- US2 (Phase 4) depends on US1 score submission endpoint being functional (scores must exist to view aggregates).
- US3 (Phase 5) depends on US2 aggregate query helpers.
- Phase 6 (Polish) runs after all user story phases.

### User Story Completion Order

1. US1 — Score an Idea During Review (evaluator score submission, upsert, guards)
2. US2 — View Aggregate Scores on an Idea (aggregate display, individual scores, blind review)
3. US3 — Compare Ideas by Score (admin listing with score sorting)

## Parallel Execution Examples

### Phase 1 Parallel

- T002 and T003 can run together (types and validation in separate files).
- T001 is independent (migration file, no TS dependencies).

### Phase 2 Parallel

- T005 and T006 can run together (eligibility and anonymization in separate files).
- T004 should complete first as T005 may reference query patterns.

### US1 Parallel (Phase 3)

- T007, T008, T009 together (validation, query, and eligibility unit tests in separate files).
- T011 and T013 together after endpoint and component implementation.

### US2 Parallel (Phase 4)

- T015 and T016 together (query and anonymize tests in separate files).
- T018 and T020 together after endpoint modifications.
- T023 and T024 together (UI component tests in separate files).

### US3 Parallel (Phase 5)

- T026 and T028 together after listing endpoint modification.
- T030 independently (UI test).

### Polish Parallel (Phase 6)

- T031, T032, and T033 together (integration tests in same file, different describe blocks).

## Implementation Strategy

### MVP First (Recommended)

- Deliver US1 first as MVP: evaluator can score ideas 1–5 with upsert.
- Validate with independent test criteria, then proceed.

### Incremental Delivery

1. Ship US1 (score submission endpoint + form + guards).
2. Ship US2 (aggregate display + individual scores + blind review masking).
3. Ship US3 (admin listing with score column + sort).
4. Execute polish phase (integration tests, quickstart update, quality sweep).
