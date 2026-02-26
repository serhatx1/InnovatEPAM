# Tasks: Multi-Stage Review Workflow

**Feature**: 6-multi-stage-review
**Created**: 2026-02-26
**Spec**: [spec.md](spec.md)
**Plan**: [impl-plan.md](impl-plan.md)

## Phase 1: Setup (Project Initialization)

- [X] T001 Add review workflow types in src/types/index.ts
- [X] T002 [P] Add review constants and action enums in src/lib/constants.ts
- [X] T003 [P] Add stage/workflow Zod schemas in src/lib/validation/review-workflow.ts
- [X] T004 [P] Add transition request/response Zod schemas in src/lib/validation/review-transition.ts
- [X] T005 Create migration for review workflow/state/event tables in supabase/migrations/007_add_multi_stage_review.sql

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T006 Add RLS policies for review tables in supabase/migrations/007_add_multi_stage_review.sql
- [X] T007 Create workflow/stage query module in src/lib/queries/review-workflow.ts
- [X] T008 [P] Create stage state/event query module in src/lib/queries/review-state.ts
- [X] T009 Export review query modules in src/lib/queries/index.ts
- [X] T010 [P] Add optimistic concurrency helper in src/lib/review/concurrency.ts
- [X] T011 [P] Add workflow version binding helper in src/lib/review/workflow-binding.ts
- [X] T012 Add visibility shaping helper for review progress in src/lib/review/visibility.ts

## Phase 3: User Story 1 - Configure Review Stages (Priority: P1)

**Goal**: Admin can create/update/activate ordered stage workflows (3-7 stages) used by new ideas.

**Independent Test Criteria**: Admin saves a 3-stage workflow, sees active version, and newly submitted ideas bind to the first stage of that active workflow.

- [X] T013 [P] [US1] Add unit tests for workflow schema and stage rules in tests/unit/validation-review-workflow.test.ts
- [X] T014 [P] [US1] Add unit tests for workflow query operations in tests/unit/queries-review-workflow.test.ts
- [X] T015 [US1] Implement GET active workflow endpoint in src/app/api/admin/review/workflow/route.ts
- [X] T016 [US1] Implement PUT activate workflow endpoint in src/app/api/admin/review/workflow/route.ts
- [X] T017 [P] [US1] Add API route tests for admin workflow config in tests/unit/api-admin-review-workflow.test.ts
- [X] T018 [US1] Build admin workflow configuration UI in src/app/admin/review/workflow/page.tsx
- [X] T019 [P] [US1] Add UI tests for admin workflow configuration page in tests/unit/admin-review-workflow-page.test.tsx
- [X] T020 [US1] Bind newly submitted ideas to active workflow first stage in src/lib/queries/ideas.ts

## Phase 4: User Story 2 - Advance Ideas Through Stages (Priority: P2)

**Goal**: Evaluator/admin can transition ideas through valid stage actions with immutable history and conflict safety.

**Independent Test Criteria**: Evaluator transitions one idea across multiple stages, receives `409` on stale state version, and final stage enforces terminal outcome.

- [X] T021 [P] [US2] Add unit tests for transition rules and terminal constraints in tests/unit/review-transition-rules.test.ts
- [X] T022 [P] [US2] Add unit tests for optimistic concurrency helper in tests/unit/review-concurrency.test.ts
- [X] T023 [US2] Implement GET full stage state endpoint in src/app/api/admin/review/ideas/[id]/stage/route.ts
- [X] T024 [US2] Implement POST transition endpoint with `expectedStateVersion` in src/app/api/admin/review/ideas/[id]/transition/route.ts
- [X] T025 [P] [US2] Add API tests for transition success/invalid/conflict/auth in tests/unit/api-admin-review-transition.test.ts
- [X] T026 [US2] Update admin review page with stage action controls in src/app/admin/review/page.tsx
- [X] T027 [P] [US2] Add UI tests for admin staged transitions in tests/unit/admin-review-stage-actions.test.tsx
- [X] T028 [US2] Record immutable stage decision events on each transition in src/lib/queries/review-state.ts

## Phase 5: User Story 3 - Track Stage Progress (Priority: P3)

**Goal**: Submitter/reviewer can view current stage and timeline, with role-based field visibility during non-terminal review.

**Independent Test Criteria**: Submitter sees stage+timestamps only during non-terminal review; admin/evaluator sees full history including actor/comments.

- [X] T029 [P] [US3] Add unit tests for progress visibility shaping by role/status in tests/unit/review-visibility.test.ts
- [X] T030 [US3] Implement submitter/reviewer progress endpoint in src/app/api/ideas/[id]/review-progress/route.ts
- [X] T031 [P] [US3] Add API tests for role-shaped progress payload in tests/unit/api-idea-review-progress.test.ts
- [X] T032 [US3] Render stage progress timeline on idea detail page in src/app/ideas/[id]/page.tsx
- [X] T033 [P] [US3] Add UI tests for idea detail stage timeline visibility in tests/unit/idea-detail-review-progress.test.tsx

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T034 [P] Add integration tests for workflow-config to transition lifecycle in tests/integration/api-review-stages-flow.test.ts
- [X] T035 [P] Add integration tests for version-binding continuity in tests/integration/api-review-versioning.test.ts
- [X] T036 Add migration verification notes and runbook updates in specs/6-multi-stage-review/quickstart.md
- [X] T037 Add/update ADR for multi-stage review architecture in docs/adr/ADR-007-multi-stage-review-workflow.md
- [X] T038 Run full quality sweep and document results in specs/6-multi-stage-review/quickstart.md

## Dependencies

### Phase Dependencies

- Phase 1 must complete before Phase 2.
- Phase 2 must complete before any user story phases.
- User Story order: US1 (P1) -> US2 (P2) -> US3 (P3).
- US2 depends on US1 active workflow configuration and idea stage binding.
- US3 depends on US2 stage events and state transitions.

### User Story Completion Order

1. US1 - Configure Review Stages
2. US2 - Advance Ideas Through Stages
3. US3 - Track Stage Progress

## Parallel Execution Examples

### US1 Parallel Example

- Run T013 and T014 together (validation/query tests in separate files).
- Run T017 and T019 together after endpoints/UI exist.

### US2 Parallel Example

- Run T021 and T022 together (rule/concurrency units).
- Run T025 and T027 together after endpoint/UI implementations.

### US3 Parallel Example

- Run T029 and T031 together (visibility logic + API response tests).
- Run T032 and T033 as implement+verify pair for detail page behavior.

## Implementation Strategy

### MVP First (Recommended)

- Deliver US1 first as MVP: configurable active workflow with binding for new ideas.
- Validate with independent test criteria, then release internally.

### Incremental Delivery

1. Ship US1 (admin workflow config + active version).
2. Ship US2 (stage transitions + immutable events + conflict handling).
3. Ship US3 (submitter/reviewer progress timeline + visibility shaping).
4. Execute polish/integration/ADR updates.
