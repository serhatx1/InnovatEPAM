# Tasks: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Created**: 2026-02-24
**Plan**: [impl-plan.md](impl-plan.md)

---

## Phase 0: UI Foundation — Tailwind CSS + shadcn/ui Setup

### T0: Install Tailwind CSS + shadcn/ui and configure design system

- [X] Install Tailwind CSS v4 and configure with Next.js App Router
- [X] Initialize shadcn/ui (`npx shadcn@latest init`) — New York style, zinc base, CSS variables
- [X] Add required shadcn components: button, input, textarea, select, label, card, badge, dialog, alert-dialog, toast (sonner), form, separator, dropdown-menu
- [X] Update `globals.css` with Tailwind directives and shadcn CSS variables (minimalist neutral palette)
- [X] Create `src/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)
- [X] Update `src/app/layout.tsx` with font + Toaster provider
- [X] Verify `npm run dev` renders cleanly with new styling base

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

## Phase 4: UI Overhaul — shadcn/ui Component Migration

### T6: Refactor auth pages (login, register) with shadcn components

- [X] Replace raw HTML form elements with shadcn Card, Input, Button, Label, Form
- [X] Add Toast notifications for login/register errors and success
- [X] Clean minimalist layout: centered card, generous padding, neutral colors
- [X] Add email confirmation flow pages (`/auth/verify-email`, `/auth/confirmed`) and callback route (`/auth/confirm`)
- [X] Verify auth pages render with shadcn components; flows work end-to-end

### T7: Refactor idea submission form with shadcn components

- [X] Replace raw inputs/selects with shadcn Input, Textarea, Select, Button, Label
- [X] Import IDEA_CATEGORIES from constants for category Select
- [X] Add client-side file validation with Toast feedback for size/type errors
- [X] Add character count display for title and description
- [X] Use Card wrapper for the form with clean spacing
- [X] Verify form renders with shadcn components; validation uses toasts + inline errors

### T8: Refactor idea listing and detail pages with shadcn components

- [X] Render each idea as a shadcn Card with Badge for status (color-coded per NFR-05)
- [X] Use Separator between sections on detail page
- [X] Attachment download as Button variant link
- [X] Admin comments displayed in a distinct Card section
- [X] Verify listing shows cards; detail page uses proper components

### T8b: Refactor admin review page with shadcn components

- [X] Replace raw HTML with shadcn Card, Button, Textarea, Badge
- [X] Use AlertDialog for reject confirmation (with mandatory comment textarea)
- [X] Use Toast for accept/reject success/error feedback
- [X] Enforce 10-char minimum on rejection comment via form validation
- [X] Verify admin actions use modals/dialogs; feedback appears as toasts

---

## Phase 5: Testing Coverage

### T9: Expand unit test coverage for src/lib/

- [X] Write `tests/unit/queries-ideas.test.ts` (mocked Supabase — listIdeas, getIdeaById, createIdea, updateIdeaStatus, ideaExists)
- [X] Write `tests/unit/queries-profiles.test.ts` (mocked — getUserRole)
- [X] Write `tests/unit/storage.test.ts` (mocked — uploadIdeaAttachment, getAttachmentUrl)
- [X] Write `tests/unit/middleware.test.ts` (route protection — public routes pass, protected redirect)
- [X] Verify all tests pass and coverage ≥ 80% for src/lib/

---

## Phase 6: API Route & Extended Testing Coverage

### T10: Add behavioral tests for GET/POST /api/ideas route

- [X] Write `tests/unit/api-ideas-route.test.ts` (mocked — auth 401, GET list, GET DB error 500, POST validation 400, POST malformed JSON, POST file validation, POST upload failure 500, POST DB error 500, POST success 201 with/without file)

### T11: Add behavioral tests for GET /api/ideas/[id] route

- [X] Write `tests/unit/api-idea-detail.test.ts` (mocked — auth 401, not found 404, DB error 404, success without attachment, success with signed URL, attachment URL failure)

### T12: Add behavioral tests for PATCH /api/admin/ideas/[id]/status route

- [X] Write `tests/unit/api-admin-status.test.ts` (mocked — auth 401, role 403, invalid status 400, submitted target 400, reject without comment 400, reject short comment 400, idea not found 404, invalid transition 400, success accept/review/reject, DB error 500)

### T13: Add CATEGORY_FIELD_DEFINITIONS tests and expand existing gaps

- [X] Extend `tests/unit/constants.test.ts` with CATEGORY_FIELD_DEFINITIONS coverage (all 5 categories, field properties, select options, number ranges, uniqueness)
- [X] Write `tests/unit/validation-all-categories.test.ts` (all 5 categories validation: Process Improvement, Customer Experience, Employee Engagement + edge cases: null/array/undefined input, stale key stripping, numeric conversion)
- [X] Add createIdea and updateIdeaStatus error cases to `tests/unit/queries-ideas.test.ts`
