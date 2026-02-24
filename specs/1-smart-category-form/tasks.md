# Tasks: Smart Category-Based Submission Form

**Feature**: 1-smart-category-form  
**Created**: 2026-02-24  
**Plan**: [impl-plan.md](impl-plan.md)

---

## Phase 1: Setup

- [X] T001 Create migration to add `category_fields` JSONB to ideas in supabase/migrations/003_add_category_fields.sql
- [X] T002 Add category field-definition mapping constants in src/lib/constants.ts
- [X] T003 Create shared category-field types in src/types/index.ts
- [X] T004 [P] Add quickstart scenario references for dynamic field QA in specs/1-smart-category-form/quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T005 Implement dynamic category-field Zod schema builder in src/lib/validation/category-fields.ts
- [X] T006 Update idea validation exports to include dynamic category validation in src/lib/validation/idea.ts
- [X] T007 Update idea query create payload typing for `category_fields` in src/lib/queries/ideas.ts
- [X] T008 Update API contract examples to include `category_fields` request/response shape in specs/1-smart-category-form/contracts/api.md

---

## Phase 3: User Story 1 - Category selection reveals relevant fields (Priority: P1)

**Goal**: Show only selected-category additional fields on the existing single submission page.

**Independent Test Criteria**: On /ideas/new, selecting a category renders only that category’s configured dynamic fields without navigating away.

- [X] T009 [US1] Add unit test for dynamic field visibility by selected category in tests/unit/new-idea-dynamic-form.test.tsx
- [X] T010 [US1] Extend existing submit page state to track selected category in src/app/ideas/new/page.tsx
- [X] T011 [US1] Render category-specific dynamic inputs from constants mapping in src/app/ideas/new/page.tsx
- [X] T012 [US1] Keep base fields unchanged while dynamic section updates in src/app/ideas/new/page.tsx

---

## Phase 4: User Story 2 - Changing category updates visible fields (Priority: P2)

**Goal**: Replace old dynamic fields when category changes and prevent irrelevant hidden values from submission.

**Independent Test Criteria**: Enter values in category A, switch to category B, and verify only category B fields remain visible and included in submit payload.

- [X] T013 [US2] Add unit test for category-switch field replacement behavior in tests/unit/new-idea-dynamic-form.test.tsx
- [X] T014 [US2] Add unit test ensuring stale hidden values are excluded from payload in tests/unit/new-idea-dynamic-form.test.tsx
- [X] T015 [US2] Clear inactive category-specific form state on category change in src/app/ideas/new/page.tsx
- [X] T016 [US2] Build `category_fields` payload from active category keys only in src/app/ideas/new/page.tsx

---

## Phase 5: User Story 3 - Simple validation for required category fields (Priority: P3)

**Goal**: Block invalid category-specific submissions with clear inline errors for required/format/range rules.

**Independent Test Criteria**: Missing required dynamic field or invalid numeric value shows inline error and blocks submission.

- [X] T017 [P] [US3] Add unit tests for required/format/range dynamic validation rules in tests/unit/validation-dynamic-fields.test.ts
- [X] T018 [P] [US3] Add API integration test for dynamic-field validation failures in tests/integration/api-ideas-dynamic-fields.test.ts
- [X] T019 [US3] Implement client-side dynamic field validation and inline errors in src/app/ideas/new/page.tsx
- [X] T020 [US3] Implement server-side dynamic category validation in POST handler in src/app/api/ideas/route.ts
- [X] T021 [US3] Return field-level validation details for dynamic errors in src/app/api/ideas/route.ts

---

## Phase 6: User Story 4 - Successful submission from dynamic form (Priority: P4)

**Goal**: Save base + category-specific data in one submission flow on the same page.

**Independent Test Criteria**: Valid dynamic submission returns success and persisted idea includes selected category with matching `category_fields` JSON only.

- [X] T022 [P] [US4] Add integration test for successful dynamic submission persistence in tests/integration/api-ideas-dynamic-fields.test.ts
- [X] T023 [P] [US4] Add query-level test covering `category_fields` insert mapping in tests/unit/queries-ideas-dynamic.test.ts
- [X] T024 [US4] Persist validated `category_fields` in createIdea input flow in src/app/api/ideas/route.ts
- [X] T025 [US4] Update Idea type and API response typing to include `category_fields` in src/types/index.ts
- [X] T026 [US4] Ensure idea detail rendering can safely read `category_fields` without UI redesign in src/app/ideas/[id]/page.tsx

---

## Final Phase: Polish & Cross-Cutting Concerns

- [X] T027 Run and fix targeted unit/integration tests for dynamic form feature in tests/unit and tests/integration
- [X] T028 [P] Add/refresh developer notes for dynamic field config maintenance in specs/1-smart-category-form/quickstart.md
- [X] T029 Validate no regressions to base submission rules in tests/unit/validation.test.ts
- [X] T030 Confirm lint and typecheck pass for touched files via package scripts in package.json

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) -> Foundational (Phase 2) -> US1 (Phase 3) -> US2 (Phase 4) -> US3 (Phase 5) -> US4 (Phase 6) -> Polish

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational phase
- **US2 (P2)**: Depends on US1 dynamic rendering state
- **US3 (P3)**: Depends on US1/US2 form state + Foundational validation modules
- **US4 (P4)**: Depends on US3 validation/payload integrity

### Task-Level Dependency Graph

- T001-T008 must complete before story phases.
- T009-T012 (US1) precede T013-T016 (US2).
- T017-T021 (US3) require T005-T007 and US2 payload shaping.
- T022-T026 (US4) require T020 and T024.
- T027-T030 run after all stories.

---

## Parallel Execution Examples

### US1

- Run T009 in parallel with T010 (tests vs state wiring in different files).

### US2

- Run T013 and T014 in parallel (same test file but distinct cases can be authored independently before merge).

### US3

- Run T017 and T018 in parallel (`tests/unit` vs `tests/integration`).

### US4

- Run T022 and T023 in parallel (`tests/integration` vs `tests/unit`).

---

## Implementation Strategy

### MVP-First Slice

1. Complete Phase 1 and Phase 2.
2. Deliver US1 only (dynamic field visibility on existing page) as MVP increment.
3. Validate with independent test criteria for US1.

### Incremental Delivery

1. Add US2 (category switching + stale value prevention).
2. Add US3 (client/server validation and error messaging).
3. Add US4 (persistence and typed read path).
4. Finish polish/regression checks.
