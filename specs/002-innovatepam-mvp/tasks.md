# Tasks: InnovatEPAM Portal MVP

**Input**: Design documents from `/specs/002-innovatepam-mvp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Epic Task Files

- EPIC-01 tasks: `epics/EPIC-01-tasks.md`
- EPIC-02 tasks: `epics/EPIC-02-tasks.md`
- EPIC-03 tasks: `epics/EPIC-03-tasks.md`

## EPIC-01: Identity & Access

See detailed epic task file: `epics/EPIC-01-tasks.md`

### Foundation (Phase 2 + Setup dependency)

- [X] T005 [P] Configure role/authorization helpers in `src/lib/auth/`

### User Story 1 - Authentication & Access (Phase 3)

- [X] T007 [US1] Implement auth UI routes in `src/app/(auth)/`
- [X] T008 [US1] Implement sign-up/sign-in actions via Supabase Auth
- [X] T009 [US1] Implement logout and route protection middleware

## EPIC-02: Idea Submission & Discovery

See detailed epic task file: `epics/EPIC-02-tasks.md`

### Setup / Foundation Dependencies (Phases 1-2)

- [X] T001 Initialize Next.js app and dependencies in `package.json`
- [X] T002 Configure environment variables and Supabase clients in `src/lib/supabase/`
- [X] T003 [P] Create base app route structure in `src/app/`
- [ ] T004 Create DB schema for profiles and ideas (Supabase SQL migration)
- [X] T006 [P] Configure input validation schemas in `src/lib/validation/`

### User Story 2 - Submit Innovation Ideas (Phase 4)

**Goal**: Submit idea with required fields and one file.

- [X] T010 [US2] Build submit form page in `src/app/ideas/new/page.tsx`
- [ ] T011 [US2] Implement file upload to Supabase Storage in `src/lib/supabase/storage.ts`
- [ ] T012 [US2] Implement idea creation endpoint in `src/app/api/ideas/route.ts`
- [ ] T013 [US2] Implement idea list/detail pages in `src/app/ideas/`

## EPIC-03: Evaluation Workflow

See detailed epic task file: `epics/EPIC-03-tasks.md`

### User Story 3 - Review & Decide Ideas (Phase 5)

**Goal**: Admin reviews and sets status with comments.

- [ ] T014 [US3] Build admin review UI in `src/app/admin/review/`
- [ ] T015 [US3] Implement admin status update endpoint in `src/app/api/admin/ideas/[id]/status/route.ts`
- [ ] T016 [US3] Enforce reject-comment rule and role checks

## Cross-Epic: Documentation & Process

- [X] T020 Create ADRs (ADR-001 Framework, ADR-002 Supabase, ADR-003 Testing)
- [X] T021 Fill in constitution.md with real principles and testing guidelines
- [X] T022 Create PROJECT_SUMMARY.md scaffold
- [X] T023 Set up Vitest + React Testing Library infrastructure

## Cross-Epic: Polish (Phase 6)

- [ ] T017 [P] Add unit/integration smoke tests for core flows in `tests/`
- [ ] T018 Update README with run/deploy instructions
- [ ] T019 Validate quickstart flow and fix critical issues

## Execution Order (Phases)

- Phase 1 (Setup): T001-T003
- Phase 2 (Foundational): T004-T006
- Phase 3 (US1): T007-T009
- Phase 4 (US2): T010-T013
- Phase 5 (US3): T014-T016
- Phase 6 (Polish): T017-T019

## Dependencies & Parallelism

- Complete Phases 1-2 before story phases.
- Implement US1 before US2; US3 depends on US2 data flow.
- [P] tasks can run in parallel when files do not overlap.
