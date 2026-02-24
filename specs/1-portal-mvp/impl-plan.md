# Implementation Plan: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Branch**: 1-portal-mvp
**Created**: 2026-02-24
**Spec**: [spec.md](spec.md)

## Technical Context

| Area         | Technology                                  | Version  |
| ------------ | ------------------------------------------- | -------- |
| Runtime      | Next.js (App Router)                        | 16.1     |
| UI           | React + shadcn/ui + Tailwind CSS            | 19 / 0.x / 4 |
| Styling      | Tailwind CSS utility-first                  | 4        |
| Components   | shadcn/ui (Radix primitives, owned source)  | latest   |
| Language     | TypeScript (strict mode)                    | 5.9      |
| Backend      | Supabase (Postgres + RLS, Auth, Storage)    | Latest   |
| Validation   | Zod                                         | 4.3      |
| Testing      | Vitest + React Testing Library              | 4.0      |
| Auth         | Supabase Auth (email/password)              | via @supabase/ssr |
| Deployment   | Vercel                                      | —        |

### Existing Assets

- Database schema: `supabase/migrations/001_create_schema.sql` (profiles, ideas, storage, triggers, indexes, RLS — single definitive migration)
- Shared types: `src/types/index.ts` (Idea, UserProfile, IdeaStatus)
- Validation: `src/lib/validation/idea.ts` (ideaSchema — needs tightening)
- Auth: `src/lib/auth/roles.ts` (ROLES, isAdmin), Supabase client/server/middleware
- Queries: `src/lib/queries/` (listIdeas, getIdeaById, createIdea, updateIdeaStatus, getUserRole)
- API routes: GET/POST `/api/ideas`, GET `/api/ideas/[id]`, PATCH `/api/admin/ideas/[id]/status`
- Pages: register, login, logout, ideas list, idea detail, new idea, admin review
- Tests: 19 passing (unit + integration smoke)

## Constitution Check

| Principle          | Compliance | Notes                                                       |
| ------------------ | ---------- | ----------------------------------------------------------- |
| Simplicity First   | ✅ PASS    | Single Next.js app, no microservices                        |
| Test-First (TDD)   | ⚠️ GAP     | Validation schema doesn't match spec constraints; new schemas need tests first |
| Secure by Default  | ⚠️ GAP     | Missing file validation, incomplete status transition enforcement, RLS too restrictive |
| Type Safety        | ✅ PASS    | Strict mode, Zod schemas, shared types                      |
| Spec-Driven        | ✅ PASS    | Spec exists, ADRs documented                                |

### Gate Result: **PASS WITH CORRECTIVE TASKS**

Gaps are correctable. Tasks T1–T4 below address all violations as priority items.

## Research Summary

All unknowns resolved — see [research.md](research.md) for full details.

| # | Decision | Impact |
|---|----------|--------|
| R1 | Tighten ideaSchema to title 5–100, description 20–1000, category enum | Medium |
| R2 | Add file validation schema (5 MB max, PDF/PNG/JPG/DOCX) | Medium |
| R3 | Add status transition map + enforcement | Medium |
| R4 | Rejection comment min 10 chars via Zod | Low |
| R5 | Shared IDEA_CATEGORIES constant | Low |
| R6 | Explicit "Start Review" button (already exists) | None |
| R7 | Fix RLS so all authenticated users see all ideas | High |

---

## Implementation Tasks

### Phase 0: UI Foundation — Tailwind CSS + shadcn/ui Setup

#### T0: Install Tailwind CSS and shadcn/ui, configure design system

**Files**: `package.json`, `globals.css`, `tailwind.config.ts`, `components.json`, `src/components/ui/`, `src/lib/utils.ts`, `src/app/layout.tsx`
**ADR**: [ADR-004](../../docs/adr/ADR-004-shadcn-ui-design-system.md)
**Spec refs**: NFR-01 through NFR-06

1. **Install Tailwind CSS v4** and configure with Next.js App Router.
2. **Initialize shadcn/ui** (`npx shadcn@latest init`) — select "New York" style, zinc base color, CSS variables enabled.
3. **Add required components** via CLI:
   - `button`, `input`, `textarea`, `select`, `label`, `card`, `badge`, `dialog`, `alert-dialog`, `toast` (sonner), `form`, `separator`, `dropdown-menu`
4. **Update `globals.css`** with Tailwind directives and shadcn CSS variables (minimalist neutral palette).
5. **Create `src/lib/utils.ts`** with `cn()` helper (clsx + tailwind-merge).
6. **Update `src/app/layout.tsx`** to include Inter/Geist font and Toaster provider.
7. **Verify**: `npm run dev` renders cleanly with new styling base.

---

### Phase 1: Foundation — Constants & Validation (TDD)

#### T1: Create shared constants and update validation schemas

**Files**: `src/lib/constants.ts`, `src/lib/validation/idea.ts`, `src/lib/validation/status.ts`
**Tests**: `tests/unit/validation.test.ts`, `tests/unit/constants.test.ts`
**Spec refs**: FR-10, FR-11, FR-12, FR-14, FR-15, FR-26

1. **Write tests first** for:
   - IDEA_CATEGORIES contains exactly 5 expected values
   - `ideaSchema` rejects title < 5 chars and > 100 chars
   - `ideaSchema` rejects description < 20 chars and > 1000 chars
   - `ideaSchema` rejects invalid category
   - `ideaSchema` accepts valid input with valid category
   - `fileSchema` rejects files > 5 MB
   - `fileSchema` rejects disallowed MIME types
   - `fileSchema` accepts valid files (pdf, png, jpg, docx)
   - `statusUpdateSchema` requires evaluatorComment (min 10 chars) when status = "rejected"
   - `statusUpdateSchema` allows no comment when status = "accepted"
   - `statusUpdateSchema` rejects invalid status values

2. **Implement**:
   - Create `src/lib/constants.ts` with `IDEA_CATEGORIES`, `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES`, `VALID_TRANSITIONS`
   - Update `src/lib/validation/idea.ts`: use `z.enum(IDEA_CATEGORIES)`, add `min(5).max(100)` for title, `min(20).max(1000)` for description
   - Create `src/lib/validation/status.ts` with `statusUpdateSchema` using `.refine()` for conditional comment requirement
   - Add file validation function `validateFile(file: File)` using constants

3. **Verify**: All new tests pass, existing tests updated to match new constraints.

---

#### T2: Add status transition validation

**Files**: `src/lib/validation/status.ts`
**Tests**: `tests/unit/status-transitions.test.ts`
**Spec refs**: FR-22

1. **Write tests first** for:
   - `isValidTransition("submitted", "under_review")` → true
   - `isValidTransition("submitted", "accepted")` → true
   - `isValidTransition("submitted", "rejected")` → true
   - `isValidTransition("under_review", "accepted")` → true
   - `isValidTransition("under_review", "rejected")` → true
   - `isValidTransition("accepted", "submitted")` → false
   - `isValidTransition("rejected", "accepted")` → false
   - `isValidTransition("accepted", "rejected")` → false

2. **Implement**: `isValidTransition(currentStatus, newStatus)` function using `VALID_TRANSITIONS` map.

3. **Verify**: All transition tests pass.

---

### Phase 2: API Route Hardening

#### T3: Update POST /api/ideas with file validation

**Files**: `src/app/api/ideas/route.ts`
**Tests**: `tests/integration/ideas-api.test.ts`
**Spec refs**: FR-14, FR-15

1. **Write tests first** for:
   - POST with valid input → 201
   - POST with title < 5 chars → 400
   - POST with oversized file → 400 with file size error
   - POST with invalid file type → 400 with file type error
   - POST without auth → 401

2. **Implement**: Add `validateFile()` call before `uploadIdeaAttachment()` in the POST handler. Return 400 with clear error for invalid files.

3. **Verify**: All integration tests pass.

---

#### T4: Update PATCH /api/admin/ideas/[id]/status with transition & comment validation

**Files**: `src/app/api/admin/ideas/[id]/status/route.ts`
**Tests**: `tests/integration/admin-status-api.test.ts`
**Spec refs**: FR-22, FR-26

1. **Write tests first** for:
   - PATCH with valid transition → 200
   - PATCH with invalid transition (e.g., accepted → submitted) → 400
   - PATCH rejected without comment → 400
   - PATCH rejected with comment < 10 chars → 400
   - PATCH rejected with comment ≥ 10 chars → 200
   - PATCH without admin role → 403
   - PATCH with nonexistent idea → 404

2. **Implement**:
   - Use `statusUpdateSchema.safeParse()` for body validation
   - Fetch current idea status before update
   - Call `isValidTransition(current, new)` — return 400 if invalid
   - Apply update on success

3. **Verify**: All integration tests pass.

---

### Phase 3: Database & RLS Fix

#### T5: Fix idea visibility & RLS (consolidated in 001_create_schema.sql)

**Files**: `supabase/migrations/001_create_schema.sql` (single migration, drop-and-rebuild)
**Tests**: Manual verification via Supabase dashboard + existing listing tests
**Spec refs**: FR-17

1. **Schema already includes all fixes**:
   - `is_admin()` SECURITY DEFINER helper — no RLS infinite recursion
   - `(SELECT auth.uid())` wrapping — cached, 100x+ faster on large tables
   - Single `"Authenticated users can read all ideas"` SELECT policy (FR-17)
   - FK index on `idea.user_id`, indexes on `status`, `created_at`
   - `UNIQUE` on `user_profile.email`, `CHECK` on `idea.category`
   - `search_path = ''` on all SECURITY DEFINER functions

2. **Update code**:
   - `GET /api/ideas`: Remove `userId` scoping — always list all ideas
   - `src/app/ideas/page.tsx`: Remove `userId` parameter from `listIdeas()` call
   - `GET /api/ideas/[id]`: Remove owner/admin check — all authenticated users can view any idea detail

3. **Verify**: All authenticated users see all ideas in listing and detail views.

---

### Phase 4: UI Overhaul — shadcn/ui Component Migration

#### T6: Refactor auth pages (login, register) with shadcn components

**Files**: `src/app/auth/login/page.tsx`, `src/app/auth/register/page.tsx`, `src/app/auth/verify-email/page.tsx`, `src/app/auth/confirmed/page.tsx`, `src/app/auth/confirm/route.ts`
**Spec refs**: NFR-01, NFR-02, NFR-03, FR-01, FR-02

1. Replace raw HTML form elements with shadcn `Card`, `Input`, `Button`, `Label`, `Form` components.
2. Add `Toast` notifications for login/register errors and success.
3. Clean minimalist layout: centered card, generous padding, neutral colors.
4. Add email confirmation flow: redirect post-signup to verify-email page, handle callback in `/auth/confirm`, show success page at `/auth/confirmed`.
5. **Verify**: Auth pages render with shadcn components; login/register/confirmation flows work end-to-end.

---

#### T7: Refactor idea submission form with shadcn components

**Files**: `src/app/ideas/new/page.tsx`
**Spec refs**: NFR-01, NFR-03, FR-09 through FR-16, EC2, EC3, EC4

1. Replace raw inputs/selects with shadcn `Input`, `Textarea`, `Select`, `Button`, `Label`.
2. Import `IDEA_CATEGORIES` from constants for category `Select`.
3. Add client-side file validation with `Toast` feedback for size/type errors.
4. Add character count display for title and description.
5. Use `Card` wrapper for the form with clean spacing.
6. **Verify**: Form renders with shadcn components; validation feedback uses toasts + inline errors.

---

#### T8: Refactor idea listing and detail pages with shadcn components

**Files**: `src/app/ideas/page.tsx`, `src/app/ideas/[id]/page.tsx`
**Spec refs**: NFR-01, NFR-04, NFR-05, FR-17 through FR-20, FR-23

1. Render each idea as a shadcn `Card` with `Badge` for status (color-coded per NFR-05).
2. Use `Separator` between sections on detail page.
3. Attachment download as a `Button` variant link.
4. Admin comments displayed in a distinct `Card` section.
5. **Verify**: Listing shows card grid/list; detail page uses proper components.

---

#### T8b: Refactor admin review page with shadcn components

**Files**: `src/app/admin/review/page.tsx`, `src/app/admin/review/AdminActions.tsx`
**Spec refs**: NFR-01, NFR-03, FR-24 through FR-28

1. Replace raw HTML with shadcn `Card`, `Button`, `Textarea`, `Badge`.
2. Use `AlertDialog` for reject confirmation (with mandatory comment textarea).
3. Use `Toast` for accept/reject success/error feedback.
4. Enforce 10-char minimum on rejection comment via form validation.
5. **Verify**: Admin actions use modals/dialogs; feedback appears as toasts.

---

### Phase 5: Testing Coverage

#### T9: Expand unit test coverage for src/lib/

**Files**: `tests/unit/`
**Spec refs**: SC-10

1. Verify existing tests still pass after changes
2. Add tests for `src/lib/queries/` functions (mocked Supabase client):
   - `listIdeas` returns ideas ordered by newest first
   - `createIdea` returns created idea
   - `updateIdeaStatus` updates status and evaluator_comment
   - `getUserRole` returns role string or null
3. Add tests for `src/lib/supabase/storage.ts` (mocked):
   - `uploadIdeaAttachment` constructs correct path
   - `getAttachmentUrl` returns signed URL or null
4. **Target**: ≥ 80% coverage for `src/lib/`

---

## Task Dependency Graph

```
T0 (Tailwind + shadcn setup) — MUST BE FIRST, blocks all UI work

T1 (constants + validation schemas)
├── T2 (status transitions) — depends on VALID_TRANSITIONS from T1
├── T3 (POST /api/ideas file validation) — depends on fileSchema from T1
├── T4 (PATCH admin status validation) — depends on T1 + T2
├── T6 (auth pages UI) — depends on T0 + shadcn components
├── T7 (idea form UI) — depends on T0 + T1 constants
├── T8 (listing/detail UI) — depends on T0 + shadcn components
└── T8b (admin review UI) — depends on T0 + shadcn components

T5 (RLS — already consolidated in 001_create_schema.sql) — independent, can run in parallel with T1–T4

T9 (test coverage) — runs last, after all code changes
```

## Execution Order

1. **T0** (Tailwind + shadcn install — must be first)
2. **T1** → **T2** (foundation constants + validation)
3. **T3** → **T4** (API hardening, depends on T1+T2)
4. **T5** (RLS fix, independent — can overlap with API work)
5. **T6** → **T7** → **T8** → **T8b** (UI overhaul with shadcn, depends on T0+T1)
6. **T9** (coverage sweep, last)

---

## Generated Artifacts

| Artifact | Path |
| -------- | ---- |
| Feature Spec | [specs/1-portal-mvp/spec.md](spec.md) |
| Research | [specs/1-portal-mvp/research.md](research.md) |
| Data Model | [specs/1-portal-mvp/data-model.md](data-model.md) |
| API Contracts | [specs/1-portal-mvp/contracts/api.md](contracts/api.md) |
| Quickstart | [specs/1-portal-mvp/quickstart.md](quickstart.md) |
| Checklist | [specs/1-portal-mvp/checklists/requirements.md](checklists/requirements.md) |
| This Plan | [specs/1-portal-mvp/impl-plan.md](impl-plan.md) |
