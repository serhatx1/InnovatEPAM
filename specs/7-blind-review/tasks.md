# Tasks: Blind Review (Anonymous Evaluation)

**Feature**: 7-blind-review
**Created**: 2026-02-26
**Spec**: [spec.md](spec.md)
**Plan**: [impl-plan.md](impl-plan.md)

## Phase 1: Setup (Project Initialization)

- [X] T001 Add `PortalSetting` interface to shared types in src/types/index.ts
- [X] T002 [P] Add `blindReviewSettingSchema` Zod validation in src/lib/validation/blind-review.ts
- [X] T003 Create migration for `portal_setting` table with RLS policies in supabase/migrations/008_add_blind_review.sql

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T004 Create portal setting query module (`getBlindReviewEnabled`, `setBlindReviewEnabled`) in src/lib/queries/portal-settings.ts
- [X] T005 Export portal setting queries from barrel in src/lib/queries/index.ts
- [X] T006 Create `shouldAnonymize` decision helper in src/lib/review/blind-review.ts
- [X] T007 [P] Create `anonymizeIdeaResponse` and `anonymizeIdeaList` helpers in src/lib/review/blind-review.ts

## Phase 3: User Story 1 — Enable Blind Review Mode (Priority: P1)

**Goal**: Admin can toggle blind review on/off via a settings endpoint; the setting persists and is immediately readable.

**Independent Test Criteria**: Admin enables blind review via PUT, reads it back via GET, disables it, and confirms the toggle persists across requests. Non-admin receives 403.

- [X] T008 [P] [US1] Add unit tests for `blindReviewSettingSchema` validation in tests/unit/validation-blind-review.test.ts
- [X] T009 [P] [US1] Add unit tests for portal setting query functions in tests/unit/queries-portal-setting.test.ts
- [X] T010 [US1] Implement GET /api/admin/settings/blind-review endpoint in src/app/api/admin/settings/blind-review/route.ts
- [X] T011 [US1] Implement PUT /api/admin/settings/blind-review endpoint in src/app/api/admin/settings/blind-review/route.ts
- [X] T012 [P] [US1] Add API route tests for admin blind review settings in tests/unit/api-admin-blind-review.test.ts
- [X] T013 [US1] Build admin blind review toggle UI on review settings page in src/app/admin/review/settings/page.tsx
- [X] T014 [P] [US1] Add UI tests for admin blind review toggle in tests/unit/admin-blind-review-settings.test.tsx

## Phase 4: User Story 2 — Anonymous Idea Evaluation (Priority: P1)

**Goal**: Evaluators see "Anonymous Submitter" on idea listing and detail when blind review is ON and idea is non-terminal. Identity revealed on terminal ideas. Stage transitions work identically.

**Independent Test Criteria**: Submit an idea, enable blind review, call GET /api/ideas as evaluator and confirm `user_id` is `"anonymous"` and `submitter_display_name` is `"Anonymous Submitter"`. Advance idea to terminal → identity revealed. Toggle blind review OFF → identity visible.

- [X] T015 [P] [US2] Add unit tests for `shouldAnonymize` with all role/state/toggle combinations in tests/unit/blind-review-anonymize.test.ts
- [X] T016 [P] [US2] Add unit tests for `anonymizeIdeaResponse` field masking in tests/unit/blind-review-anonymize.test.ts
- [X] T017 [US2] Modify GET /api/ideas to apply anonymization pass before response in src/app/api/ideas/route.ts
- [X] T018 [US2] Modify GET /api/ideas/[id] to apply anonymization pass before response in src/app/api/ideas/[id]/route.ts
- [X] T019 [P] [US2] Add API tests for idea listing with blind review ON/OFF in tests/unit/api-ideas-blind-review.test.ts
- [X] T020 [P] [US2] Add API tests for idea detail with blind review ON (non-terminal and terminal) in tests/unit/api-ideas-blind-review.test.ts
- [X] T021 [US2] Update idea listing UI to display `submitter_display_name` when present in src/app/ideas/page.tsx
- [X] T022 [US2] Update idea detail UI to display anonymous placeholder when `submitter_display_name` is set in src/app/ideas/[id]/page.tsx

## Phase 5: User Story 3 — Submitter Self-View During Blind Review (Priority: P2)

**Goal**: Submitters always see their own identity on their own ideas, even when blind review is ON.

**Independent Test Criteria**: Enable blind review, call GET /api/ideas as the idea owner and confirm full `user_id` and real name are present. Call GET /api/ideas/[id] as owner and confirm same.

- [X] T023 [P] [US3] Add unit tests for submitter self-view exemption in `shouldAnonymize` in tests/unit/blind-review-anonymize.test.ts
- [X] T024 [US3] Verify GET /api/ideas preserves owner identity when viewer is submitter in src/app/api/ideas/route.ts
- [X] T025 [P] [US3] Add API tests for submitter self-view with blind review ON in tests/unit/api-ideas-blind-review.test.ts
- [X] T026 [P] [US3] Add UI tests confirming submitter sees own identity on listing and detail in tests/unit/idea-submitter-self-view.test.tsx

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T027 [P] Add integration test for full blind review toggle → evaluator listing → detail → terminal reveal flow in tests/integration/api-blind-review-flow.test.ts
- [X] T028 [P] Add integration test for admin exemption and submitter self-view during blind review in tests/integration/api-blind-review-flow.test.ts
- [X] T029 Update migration verification notes and runbook in specs/7-blind-review/quickstart.md
- [X] T030 Run full test suite quality sweep and confirm all tests pass

## Dependencies

### Phase Dependencies

- Phase 1 (Setup) must complete before Phase 2 (Foundational).
- Phase 2 must complete before any user story phases.
- US1 (Phase 3) and US2 (Phase 4) are both P1 but US2 depends on US1 admin setting endpoints.
- US3 (Phase 5) depends on US2 anonymization helpers being in place.

### User Story Completion Order

1. US1 — Enable Blind Review Mode (admin toggle + persistence)
2. US2 — Anonymous Idea Evaluation (evaluator-facing anonymization + terminal reveal)
3. US3 — Submitter Self-View (self-view exemption verification)

## Parallel Execution Examples

### Phase 1 Parallel

- T001 and T002 can run together (types and validation in separate files).
- T003 depends on T001 for `PortalSetting` type awareness but can proceed independently at migration level.

### US1 Parallel (Phase 3)

- T008 and T009 together (validation + query unit tests in separate files).
- T012 and T014 together after endpoints and UI exist.

### US2 Parallel (Phase 4)

- T015 and T016 together (same test file, different test suites).
- T019 and T020 together after endpoint modifications.

### US3 Parallel (Phase 5)

- T023 and T025 together (unit + API test for self-view).
- T026 independently (UI test).

### Polish Parallel (Phase 6)

- T027 and T028 together (integration tests in same file).

## Implementation Strategy

### MVP First (Recommended)

- Deliver US1 first as MVP: admin can toggle blind review, setting persists.
- Validate with independent test criteria, then proceed.

### Incremental Delivery

1. Ship US1 (admin blind review toggle + API + UI).
2. Ship US2 (evaluator anonymization on listing + detail + terminal reveal).
3. Ship US3 (submitter self-view exemption verification).
4. Execute polish phase (integration tests, runbook, quality sweep).
