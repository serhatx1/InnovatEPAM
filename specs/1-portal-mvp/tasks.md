# Tasks: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Created**: 2026-02-24
**Plan**: [impl-plan.md](impl-plan.md)

---

## Phase 1: Foundation — Constants & Validation (TDD)

### T1: Create shared constants and update validation schemas [P]

- [X] Create `src/lib/constants.ts` with `IDEA_CATEGORIES`, `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES`, `VALID_TRANSITIONS`
- [X] Update `src/lib/validation/idea.ts`: `z.enum(IDEA_CATEGORIES)`, title 5–100, description 20–1000, add `validateFile()`
- [X] Create `src/lib/validation/status.ts`: `statusUpdateSchema`, conditional comment refinement
- [X] Write `tests/unit/constants.test.ts`
- [X] Update `tests/unit/validation.test.ts` with new constraint tests + file validation + statusUpdateSchema tests

### T2: Add status transition validation [P]

- [X] Implement `isValidTransition()` in `src/lib/validation/status.ts`
- [X] Write `tests/unit/status-transitions.test.ts` (13 test cases for valid/invalid transitions)

---

## Phase 2: API Route Hardening

### T3: Update POST /api/ideas with file validation

- [X] Add `validateFile()` call before upload in `src/app/api/ideas/route.ts`
- [X] Return 400 for invalid file size or type

### T4: Update PATCH /api/admin/ideas/[id]/status with transition & comment validation

- [X] Use `statusUpdateSchema.safeParse()` in `src/app/api/admin/ideas/[id]/status/route.ts`
- [X] Fetch current idea status via `getIdeaById` before update
- [X] Validate transition with `isValidTransition()` — return 400 for invalid

---

## Phase 3: Database & RLS Fix

### T5: Fix idea visibility & RLS (consolidated in 001_create_schema.sql)

- [X] Schema already includes all RLS fixes (single authenticated SELECT policy)
- [X] `GET /api/ideas`: Remove `userId` scoping — list all ideas
- [X] `src/app/ideas/page.tsx`: Remove `userId` parameter from `listIdeas()` call
- [X] `GET /api/ideas/[id]`: Remove owner/admin access check

---

## Phase 4: UI Alignment

### T6: Update categories in new idea form

- [X] Import `IDEA_CATEGORIES` from constants in `src/app/ideas/new/page.tsx`
- [X] Replace hardcoded `CATEGORIES` array with imported constant

### T7: Add client-side file validation feedback

- [X] Add `accept=".pdf,.png,.jpg,.jpeg,.docx"` to file input
- [X] Add client-side file size/type validation before form submission

### T8: Add client-side validation feedback for title/description

- [X] Add `minLength`/`maxLength` attributes to title input and description textarea
- [X] Enforce 10-char minimum for rejection comment in AdminActions component

---

## Phase 5: Testing Coverage

### T9: Expand unit test coverage for src/lib/

- [X] Write `tests/unit/queries-ideas.test.ts` (mocked Supabase — listIdeas, getIdeaById, createIdea, updateIdeaStatus, ideaExists)
- [X] Write `tests/unit/queries-profiles.test.ts` (mocked — getUserRole)
- [X] Write `tests/unit/storage.test.ts` (mocked — uploadIdeaAttachment, getAttachmentUrl)
- [X] Write `tests/unit/middleware.test.ts` (route protection — public routes pass, protected redirect)
- [X] Verify all tests pass and coverage ≥ 80% for src/lib/
