# Implementation Plan: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Branch**: 1-portal-mvp
**Created**: 2026-02-24
**Spec**: [spec.md](spec.md)

## Technical Context

| Area         | Technology                                  | Version  |
| ------------ | ------------------------------------------- | -------- |
| Runtime      | Next.js (App Router)                        | 16.1     |
| UI           | React                                       | 19       |
| Language     | TypeScript (strict mode)                    | 5.9      |
| Backend      | Supabase (Postgres + RLS, Auth, Storage)    | Latest   |
| Validation   | Zod                                         | 4.3      |
| Testing      | Vitest + React Testing Library              | 4.0      |
| Auth         | Supabase Auth (email/password)              | via @supabase/ssr |
| Deployment   | Vercel                                      | —        |

### Existing Assets

- Database schema: `supabase/migrations/001_create_schema.sql` (profiles, ideas, storage, triggers)
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

#### T5: Fix idea visibility (RLS migration)

**Files**: `supabase/migrations/002_fix_idea_visibility.sql`
**Tests**: Manual verification via Supabase dashboard + existing listing tests
**Spec refs**: FR-17

1. **Write migration**:
   ```sql
   -- Drop restrictive per-user policies
   DROP POLICY IF EXISTS "Users can read own ideas" ON public.idea;
   DROP POLICY IF EXISTS "Admins can read all ideas" ON public.idea;

   -- Replace with single authenticated-user policy
   CREATE POLICY "Authenticated users can read all ideas"
     ON public.idea FOR SELECT
     USING (auth.role() = 'authenticated');
   ```

2. **Update code**:
   - `GET /api/ideas`: Remove `userId` scoping — always list all ideas
   - `src/app/ideas/page.tsx`: Remove `userId` parameter from `listIdeas()` call
   - `GET /api/ideas/[id]`: Remove owner/admin check — all authenticated users can view any idea detail

3. **Verify**: All authenticated users see all ideas in listing and detail views.

---

### Phase 4: UI Alignment

#### T6: Update categories in new idea form

**Files**: `src/app/ideas/new/page.tsx`
**Spec refs**: FR-12, R5

1. Import `IDEA_CATEGORIES` from `src/lib/constants.ts`
2. Replace hardcoded `CATEGORIES` array with imported constant
3. **Verify**: Form dropdown shows spec-defined categories

---

#### T7: Add client-side file validation feedback

**Files**: `src/app/ideas/new/page.tsx`
**Spec refs**: FR-14, FR-15, EC3, EC4

1. Import `MAX_FILE_SIZE` and `ALLOWED_FILE_TYPES` from constants
2. Add `accept` attribute to file input: `accept=".pdf,.png,.jpg,.jpeg,.docx"`
3. Add client-side validation on form submit (before fetch): check file size and type, show inline error
4. **Verify**: Invalid files show error without network request

---

#### T8: Add client-side validation feedback for title/description

**Files**: `src/app/ideas/new/page.tsx`
**Spec refs**: FR-10, FR-11, EC2

1. Add `minLength={5}` `maxLength={100}` to title input
2. Add `minLength={20}` `maxLength={1000}` to description textarea
3. Optionally add character count display
4. **Verify**: Form shows validation hints for constraint violations

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
T1 (constants + validation schemas)
├── T2 (status transitions) — depends on VALID_TRANSITIONS from T1
├── T3 (POST /api/ideas file validation) — depends on fileSchema from T1
├── T4 (PATCH admin status validation) — depends on T1 + T2
├── T6 (UI categories) — depends on IDEA_CATEGORIES from T1
├── T7 (UI file validation) — depends on constants from T1
└── T8 (UI input validation) — depends on constraints from T1

T5 (RLS migration) — independent, can run in parallel with T1–T4

T9 (test coverage) — runs last, after all code changes
```

## Execution Order

1. **T1** → **T2** (foundation, must be first)
2. **T3** → **T4** (API hardening, depends on T1+T2)
3. **T5** (RLS fix, independent — can overlap with API work)
4. **T6** → **T7** → **T8** (UI alignment, depends on T1)
5. **T9** (coverage sweep, last)

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
