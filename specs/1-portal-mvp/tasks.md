# Tasks: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Generated**: 2026-02-24
**Spec**: [spec.md](spec.md)
**Plan**: [impl-plan.md](impl-plan.md)

---

## User Stories (from spec.md)

| ID  | Story | Priority | Scenarios |
| --- | ----- | -------- | --------- |
| US1 | Authentication (Register, Login, Logout) | P1 | S1, S2, S3 |
| US2 | Idea Submission with file attachment | P1 | S4 |
| US3 | Idea Browsing & Detail View | P1 | S5, S6 |
| US4 | Admin Evaluation Workflow (Accept, Reject, Dashboard) | P2 | S7, S8, S9 |

---

## Phase 1: Setup

> Verify existing project structure, dependencies, and baseline test suite.

- [x] T001 Verify project builds and existing 19 tests pass via `npm run build && npm test`
- [x] T002 Verify Supabase env vars are configured in `.env.local`

---

## Phase 2: Foundational — Constants & Validation Schemas (TDD)

> Blocking prerequisites for all user stories. Creates shared constants and validation schemas that every subsequent phase depends on.

**Goal**: Establish single-source-of-truth constants and Zod schemas matching all spec constraints.

**Independent test criteria**: All unit tests for constants, ideaSchema, fileSchema, statusUpdateSchema, and isValidTransition pass.

### Constants

- [x] T003 Write tests for shared constants (IDEA_CATEGORIES, MAX_FILE_SIZE, ALLOWED_FILE_TYPES, VALID_TRANSITIONS) in `tests/unit/constants.test.ts`
- [x] T004 [P] Create shared constants file `src/lib/constants.ts` with IDEA_CATEGORIES, MAX_FILE_SIZE, ALLOWED_FILE_TYPES, VALID_TRANSITIONS

### Idea Validation Schema

- [x] T005 Update tests for ideaSchema (title 5–100 chars, description 20–1000 chars, category as enum from IDEA_CATEGORIES) in `tests/unit/validation.test.ts`
- [x] T006 Update ideaSchema in `src/lib/validation/idea.ts` to use `z.enum(IDEA_CATEGORIES)`, `min(5).max(100)` for title, `min(20).max(1000)` for description

### File Validation Schema

- [x] T007 [P] Write tests for file validation (rejects >5 MB, rejects disallowed MIME types, accepts PDF/PNG/JPG/DOCX) in `tests/unit/validation.test.ts`
- [x] T008 [P] Implement `validateFile()` function and fileSchema in `src/lib/validation/idea.ts` using MAX_FILE_SIZE and ALLOWED_FILE_TYPES constants

### Status Update Schema & Transitions

- [x] T009 [P] Write tests for statusUpdateSchema (requires evaluatorComment min 10 chars when status=rejected, optional otherwise) in `tests/unit/validation.test.ts`
- [x] T010 [P] Create statusUpdateSchema in `src/lib/validation/status.ts` using Zod `.refine()` for conditional comment requirement
- [x] T011 [P] Write tests for `isValidTransition()` function (all valid/invalid transition combinations) in `tests/unit/status-transitions.test.ts`
- [x] T012 [P] Implement `isValidTransition()` function in `src/lib/validation/status.ts` using VALID_TRANSITIONS map

---

## Phase 3: US1 — Authentication (S1, S2, S3)

> Registration, Login, Logout flows. Already implemented — verify and add missing test coverage.

**Goal**: Ensure auth flows match spec (FR-01 through FR-08). Default role assignment, route protection, session refresh.

**Independent test criteria**: A user can register (assigned "submitter" role), log in, log out; unauthenticated users are redirected to login; admin routes are protected from submitters.

- [x] T013 [US1] Write tests for `isAdmin()` and role constants in `tests/unit/roles.test.ts` — verify existing coverage handles edge cases (null, undefined, empty string)
- [x] T014 [P] [US1] Verify middleware protects all routes except `/auth/login`, `/auth/register`, and `/` in `middleware.ts` — add test if missing in `tests/unit/middleware.test.ts`

---

## Phase 4: US2 — Idea Submission (S4)

> Submit an idea with title, description, category, and optional file attachment. Requires foundational schemas from Phase 2.

**Goal**: Server validates all inputs per spec (FR-09 through FR-16). File validation rejects oversized/invalid files. Client provides inline feedback.

**Independent test criteria**: POST /api/ideas returns 201 for valid input, 400 for invalid title/description/category/file, 401 for unauthenticated; UI form uses spec categories and shows client-side validation.

### API Layer

- [x] T015 [US2] Write integration tests for POST /api/ideas (valid→201, invalid title→400, invalid description→400, oversized file→400, invalid file type→400, no auth→401) in `tests/integration/ideas-api.test.ts`
- [x] T016 [US2] Update POST handler in `src/app/api/ideas/route.ts` to call `validateFile()` before `uploadIdeaAttachment()`, return 400 for invalid files

### UI Layer

- [x] T017 [P] [US2] Replace hardcoded CATEGORIES with imported IDEA_CATEGORIES from `src/lib/constants.ts` in `src/app/ideas/new/page.tsx`
- [x] T018 [P] [US2] Add `accept=".pdf,.png,.jpg,.jpeg,.docx"` attribute and client-side file size/type validation with inline error in `src/app/ideas/new/page.tsx`
- [x] T019 [P] [US2] Add `minLength={5} maxLength={100}` to title input and `minLength={20} maxLength={1000}` to description textarea with character count display in `src/app/ideas/new/page.tsx`

---

## Phase 5: US3 — Idea Browsing & Detail View (S5, S6)

> All authenticated users see all ideas. Detail view shows full info including admin comments and attachment download link.

**Goal**: Fix RLS to allow all authenticated users to read all ideas (FR-17). Remove userId scoping from API and pages. Remove owner/admin access check from detail view (FR-19).

**Independent test criteria**: Any authenticated user can list all ideas and view any idea detail; GET /api/ideas returns all ideas regardless of role; detail view shows attachment download link and evaluator comments.

### Database

- [x] T020 [US3] Create RLS migration `supabase/migrations/002_fix_idea_visibility.sql` — drop restrictive per-user SELECT policies and replace with single "Authenticated users can read all ideas" policy

### API Layer

- [x] T021 [US3] Update GET handler in `src/app/api/ideas/route.ts` — remove role check and userId scoping, always call `listIdeas(supabase)` without userId filter
- [x] T022 [P] [US3] Update GET handler in `src/app/api/ideas/[id]/route.ts` — remove owner/admin access check, allow any authenticated user to view any idea

### UI Layer

- [x] T023 [US3] Update ideas listing page `src/app/ideas/page.tsx` — remove role check, remove userId parameter from `listIdeas()` call, remove "(Admin View)" label
- [x] T024 [P] [US3] Update idea detail page `src/app/ideas/[id]/page.tsx` — remove owner/admin access check that returns "Access Denied"

---

## Phase 6: US4 — Admin Evaluation Workflow (S7, S8, S9)

> Admins can accept/reject ideas with proper status transition enforcement and comment validation. Admin dashboard shows actionable ideas.

**Goal**: PATCH endpoint validates status transitions (FR-22), enforces 10-char min comment on rejection (FR-26), uses Zod schema. Dashboard filters to actionable statuses (FR-24).

**Independent test criteria**: PATCH returns 200 for valid transitions, 400 for invalid transitions/missing comment/short comment, 403 for non-admin, 404 for missing idea; admin dashboard shows only submitted/under_review ideas.

### API Layer

- [x] T025 [US4] Write integration tests for PATCH /api/admin/ideas/[id]/status (valid transition→200, invalid transition→400, reject without comment→400, reject with <10 char comment→400, reject with valid comment→200, accept without comment→200, non-admin→403, missing idea→404) in `tests/integration/admin-status-api.test.ts`
- [x] T026 [US4] Update PATCH handler in `src/app/api/admin/ideas/[id]/status/route.ts` — use `statusUpdateSchema.safeParse()` for body validation, fetch current status, call `isValidTransition()`, return 400 for invalid transitions

### UI Layer

- [x] T027 [P] [US4] Update AdminActions component in `src/app/admin/review/AdminActions.tsx` — enforce min 10-char comment for reject client-side, show inline validation error with character count
- [x] T028 [P] [US4] Update admin review page `src/app/admin/review/page.tsx` — filter idea list to only show "submitted" and "under_review" statuses (FR-24)

---

## Phase 7: Polish & Cross-Cutting Concerns

> Expand test coverage, verify edge cases, ensure ≥80% coverage for `src/lib/`.

- [x] T029 Write unit tests for `src/lib/queries/ideas.ts` (mocked Supabase client) — listIdeas returns ordered results, createIdea returns created idea, updateIdeaStatus updates fields — in `tests/unit/queries-ideas.test.ts`
- [x] T030 [P] Write unit tests for `src/lib/queries/profiles.ts` (mocked Supabase client) — getUserRole returns correct role or null — in `tests/unit/queries-profiles.test.ts`
- [x] T031 [P] Write unit tests for `src/lib/supabase/storage.ts` (mocked Supabase client) — uploadIdeaAttachment constructs correct path, getAttachmentUrl returns signed URL — in `tests/unit/storage.test.ts`
- [x] T032 Run full test suite and measure coverage via `npm test -- --coverage` — verify ≥80% for `src/lib/` per SC-10
- [x] T033 Verify all edge cases (EC1–EC8) from spec are handled — empty idea list, unauthorized admin access, session expiration redirect

---

## Dependency Graph

```
Phase 1: Setup
  └── Phase 2: Foundational (T003–T012)
        ├── Phase 3: US1 — Auth (T013–T014) [independent of Phase 2 if no schema changes needed]
        ├── Phase 4: US2 — Idea Submission (T015–T019) [depends on ideaSchema + fileSchema from Phase 2]
        ├── Phase 5: US3 — Idea Browsing (T020–T024) [depends on Phase 2 only for constants; RLS is independent]
        └── Phase 6: US4 — Admin Evaluation (T025–T028) [depends on statusUpdateSchema + isValidTransition from Phase 2]
              └── Phase 7: Polish (T029–T033) [runs after all code changes]
```

### Story-Level Dependencies

| Story | Depends On | Can Parallel With |
| ----- | ---------- | ----------------- |
| US1 (Auth) | Phase 2 (partial) | US2, US3, US4 (after Phase 2) |
| US2 (Submission) | Phase 2 (ideaSchema, fileSchema) | US3, US4 (after Phase 2) |
| US3 (Browsing) | Phase 2 (constants); independent RLS | US2, US4 (after Phase 2) |
| US4 (Admin Eval) | Phase 2 (statusUpdateSchema, transitions) | US2, US3 (after Phase 2) |

---

## Parallel Execution Examples

### After Phase 2 completes, these can run concurrently:

**Worker A**: US2 (T015–T019) — Idea Submission API + UI
**Worker B**: US3 (T020–T024) — RLS fix + Idea Browsing
**Worker C**: US4 (T025–T028) — Admin Evaluation

### Within Phase 2, parallelizable tasks (different files):

- T004 (constants.ts) can run in parallel with test-writing tasks
- T007+T008 (file validation) || T009+T010 (status schema) || T011+T012 (transitions)

### Within each User Story phase:

- UI tasks marked [P] can run in parallel with each other after API tasks complete

---

## Implementation Strategy

1. **MVP Scope**: Complete Phases 1–2, then US2 (Idea Submission) + US3 (Idea Browsing) for a minimal working increment
2. **Incremental Delivery**: Each User Story phase produces a testable, deployable increment
3. **TDD Approach**: Write tests (RED) → implement (GREEN) → refactor for every production code change
4. **Risk Mitigation**: US3 (RLS fix) is highest-risk change — test on staging Supabase instance before production
5. **Suggested First Sprint**: Phase 1 + Phase 2 + Phase 4 (US2) + Phase 5 (US3) = core submission + browsing flow

---

## Summary

| Metric | Value |
| ------ | ----- |
| Total tasks | 33 |
| Phase 1 (Setup) | 2 |
| Phase 2 (Foundational) | 10 |
| Phase 3 / US1 (Auth) | 2 |
| Phase 4 / US2 (Submission) | 5 |
| Phase 5 / US3 (Browsing) | 5 |
| Phase 6 / US4 (Admin Eval) | 4 |
| Phase 7 (Polish) | 5 |
| Parallelizable tasks | 18 (marked [P]) |
