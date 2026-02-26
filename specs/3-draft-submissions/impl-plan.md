# Implementation Plan: Draft Idea Submissions

**Feature**: 3-draft-submissions
**Branch**: 3-draft-submissions
**Created**: 2026-02-26
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

- Database schema: `supabase/migrations/001_create_schema.sql` (profiles, ideas with status CHECK ['submitted','under_review','accepted','rejected'], single `attachment_url`, storage, triggers, indexes, RLS)
- Additional migrations: `002_fix_rls_policies.sql`, `003_add_category_fields.sql`, `004_add_idea_attachments.sql`
- Shared types: `src/types/index.ts` (Idea, IdeaAttachment, AttachmentResponse, IdeaWithAttachments, IdeaStatus = 4 values, UserProfile)
- Constants: `src/lib/constants.ts` (IDEA_CATEGORIES, MAX_FILE_SIZE=10MB, MAX_ATTACHMENTS=5, ALLOWED_FILE_TYPES=9, VALID_TRANSITIONS, CATEGORY_FIELD_DEFINITIONS)
- Validation: `src/lib/validation/idea.ts` (ideaSchema, validateFile, validateFiles), `src/lib/validation/status.ts` (statusUpdateSchema, isValidTransition), `src/lib/validation/category-fields.ts`
- Storage: `src/lib/supabase/storage.ts` (uploadIdeaAttachment, uploadMultipleAttachments, deleteAttachments, getAttachmentUrl, getAttachmentDownloadUrl)
- Queries: `src/lib/queries/ideas.ts` (listIdeas, getIdeaById, createIdea, updateIdeaStatus), `src/lib/queries/attachments.ts` (createAttachments, getAttachmentsByIdeaId, deleteAttachmentsByIdeaId), `src/lib/queries/profiles.ts` (getUserRole)
- API routes: GET/POST `/api/ideas` (multi-file), GET `/api/ideas/[id]` (with attachments), PATCH `/api/admin/ideas/[id]/status`
- Pages: idea submission form (`/ideas/new` — multi-file upload with FileUploadZone), idea listing, idea detail, admin review
- App shell: `src/components/app-shell.tsx` (Home, Ideas, Submit Idea, Admin Review nav links)
- UI components: FileUploadZone, UploadProgress, AttachmentList, AttachmentDetail, ImageLightbox
- Tests: unit + integration covering validation, queries, API routes, components, storage

### Key Changes Required

1. **Schema migration**: Add 'draft' to status CHECK, add `deleted_at` column, new partial index, modified RLS policies
2. **Types update**: Add "draft" to `IdeaStatus`, add `deleted_at` to `Idea`
3. **New constants**: `AUTOSAVE_DEBOUNCE_MS`, `DRAFT_STAGING_PREFIX`, updated `VALID_TRANSITIONS`
4. **New validation**: `draftSaveSchema` (relaxed), `draftSubmitSchema` (full)
5. **New query functions**: 7 draft-specific queries (create, update, get, list, soft-delete, submit, count)
6. **New storage operations**: Staging upload, move, cleanup, list
7. **Updated existing queries**: `listIdeas` to exclude drafts + soft-deleted
8. **7 new API routes**: CRUD for drafts, submit, count, staging upload
9. **New React hook**: `useAutoSave` with debounce, dirty check, status tracking
10. **New UI components**: `SaveStatusIndicator`, shared `IdeaForm`
11. **New pages**: My Drafts listing, draft edit
12. **Updated pages**: Idea submission form (draft support), app shell (nav badge)

## Constitution Check

| Principle          | Compliance | Notes                                                       |
| ------------------ | ---------- | ----------------------------------------------------------- |
| Simplicity First   | ✅ PASS    | Single Next.js app; draft is same entity as idea (no new tables); auto-save via simple debounce hook; staging uses existing storage bucket |
| Test-First (TDD)   | ✅ PLAN    | All tasks specify RED→GREEN→REFACTOR order; tests written before implementation; tasks.md has detailed test lists per task |
| Secure by Default  | ✅ PLAN    | RLS policies enforce draft visibility at DB level; server-side validation on all draft API routes; owner-only access control; Zod schemas for all input boundaries |
| Type Safety        | ✅ PLAN    | Updated `IdeaStatus` union; `deleted_at` typed field; new Zod schemas; strict mode; no `any` |
| Spec-Driven        | ✅ PASS    | Spec exists with 19 functional requirements, 6 NFRs, 9 edge cases; this plan references FR/NFR IDs throughout |

### Gate Result: **PASS**

No violations. All principles addressed by design.

## Research Summary

All unknowns resolved — see [research.md](research.md) for full details.

| # | Decision | Impact |
|---|----------|--------|
| R1 | New migration drops/recreates status CHECK to include 'draft'; adds `deleted_at TIMESTAMPTZ` | High — schema change |
| R2 | Modified RLS: existing SELECT excludes drafts; new owner-only SELECT/UPDATE for drafts | High — security model |
| R3 | Soft-delete via `deleted_at` column; all queries filter `deleted_at IS NULL` | Medium — query changes |
| R4 | Custom `useAutoSave` hook: 3s debounce, deep equality dirty check, POST→PATCH pattern | Medium — new client-side logic |
| R5 | Staging area: `staging/{sessionId}/` in existing bucket; moved to permanent on draft create | Medium — storage operations |
| R6 | Dual validation: `draftSaveSchema` (relaxed), `draftSubmitSchema` (full ideaSchema) | Medium — validation layer |
| R7 | Shared `IdeaForm` component extracted from NewIdeaPage; used by both new and edit pages | Medium — UI refactoring |

---

## Implementation Tasks

### Phase 1: Foundation — Types, Constants & Validation (TDD)

#### T001: Add draft status to shared types

**Files**: `src/types/index.ts`
**Tests**: `tests/unit/types.test.ts`
**Spec refs**: Key Entity: Draft

1. **Write tests first** for:
   - `IdeaStatus` union includes "draft"
   - `Idea` interface has `deleted_at: string | null` field

2. **Implement**:
   - Add `"draft"` to `IdeaStatus` union: `"draft" | "submitted" | "under_review" | "accepted" | "rejected"`
   - Add `deleted_at: string | null` to `Idea` interface

3. **Verify**: Type tests pass; no downstream type errors (`npx tsc --noEmit`).

---

#### T002: Add draft constants

**Files**: `src/lib/constants.ts`
**Tests**: `tests/unit/constants.test.ts`
**Spec refs**: FR-16, FR-07

1. **Write tests first** for:
   - `AUTOSAVE_DEBOUNCE_MS` equals 3000
   - `VALID_TRANSITIONS` includes `draft: ["submitted"]`
   - `VALID_TRANSITIONS` does NOT allow draft → under_review/accepted/rejected
   - `DRAFT_STAGING_PREFIX` equals `"staging/"`

2. **Implement**:
   - Add `AUTOSAVE_DEBOUNCE_MS = 3000`
   - Add `draft: ["submitted"]` to `VALID_TRANSITIONS`
   - Add `DRAFT_STAGING_PREFIX = "staging/"`

3. **Verify**: All constants tests pass; existing transition tests updated.

---

#### T003: Create draft validation schemas (TDD)

**Files**: `src/lib/validation/draft.ts`
**Tests**: `tests/unit/validation-draft.test.ts`
**Spec refs**: FR-02, FR-05

1. **Write tests first** for:
   - `draftSaveSchema` accepts empty object
   - `draftSaveSchema` accepts title-only, partial fields, full payload
   - `draftSubmitSchema` rejects empty object (all required)
   - `draftSubmitSchema` rejects title < 5 / > 100, description < 20 / > 1000, missing category
   - `draftSubmitSchema` accepts valid full payload

2. **Implement**:
   - `draftSaveSchema`: all fields optional with max-length guards
   - `draftSubmitSchema`: reuses `ideaSchema` rules (title 5–100, description 20–1000, category required)

3. **Verify**: All validation-draft tests pass.

---

#### T004: Create database migration for draft support

**Files**: `supabase/migrations/005_add_draft_support.sql`
**Tests**: Manual verification via Supabase dashboard
**Spec refs**: FR-01, FR-06, FR-12, FR-13, FR-14

1. **Schema changes**:
   - Drop and recreate `idea_status_check` to include 'draft'
   - Add `deleted_at TIMESTAMPTZ DEFAULT NULL` column
   - Create partial index `idx_idea_drafts_by_user`

2. **RLS changes**:
   - Modify "Authenticated users can read all ideas" to exclude `status = 'draft'`
   - Add "Draft owners can read own drafts" (owner + draft + not deleted)
   - Add "Draft owners can update own drafts" (owner + draft + not deleted)

3. **Verify**: Migration runs without error; RLS policies tested manually.

---

### Phase 2: Foundational — Queries & Storage (TDD)

#### T005: Create draft query functions (TDD)

**Files**: `src/lib/queries/drafts.ts`, `src/lib/queries/index.ts`
**Tests**: `tests/unit/queries-drafts.test.ts`
**Spec refs**: FR-01, FR-03, FR-06, FR-08, FR-10, FR-11

1. **Write tests first** for all 7 functions:
   - `createDraft` — inserts with status "draft", handles empty title
   - `updateDraft` — updates fields, refreshes updated_at
   - `getDraftById` — returns owned draft; null for deleted/non-draft/other user
   - `listDrafts` — ordered by updated_at DESC, excludes soft-deleted
   - `softDeleteDraft` — sets deleted_at
   - `submitDraft` — transitions draft → submitted
   - `getDraftCount` — returns count, excludes deleted

2. **Implement**: All functions in `src/lib/queries/drafts.ts`

3. **Export**: Add to `src/lib/queries/index.ts`

4. **Verify**: All queries-drafts tests pass.

---

#### T006: Create staging file operations (TDD)

**Files**: `src/lib/supabase/storage.ts`
**Tests**: `tests/unit/storage-staging.test.ts`
**Spec refs**: FR-07, Clarification Q2, EC9

1. **Write tests first** for:
   - `uploadToStaging` — uploads to `staging/{sessionId}/` path
   - `moveStagedFiles` — moves to permanent path, returns updated paths
   - `cleanupStagedFiles` — removes all files in session prefix
   - `listStagedFiles` — lists files in staging area

2. **Implement**: Add 4 staging functions to existing storage.ts

3. **Verify**: All storage-staging tests pass.

---

#### T007: Update existing queries to filter out drafts (TDD)

**Files**: `src/lib/queries/ideas.ts`
**Tests**: `tests/unit/queries-ideas.test.ts`
**Spec refs**: FR-12, FR-13

1. **Write tests first** for:
   - `listIdeas()` excludes ideas with status "draft"
   - `listIdeas()` excludes soft-deleted ideas

2. **Implement**:
   - Add `.neq("status", "draft")` filter
   - Add `.is("deleted_at", null)` filter

3. **Verify**: Existing queries-ideas tests updated and passing.

---

#### T008: Verify admin review exclusion

**Tests**: `tests/unit/api-admin-status.test.ts`
**Spec refs**: FR-13

1. Verify admin review page query excludes draft-status ideas
2. Verify existing admin tests pass

---

### Phase 3: API Routes (TDD)

#### T009: Create POST /api/drafts (TDD)

**Files**: `src/app/api/drafts/route.ts`
**Tests**: `tests/unit/api-drafts-route.test.ts`
**Spec refs**: FR-01, FR-02, FR-07

1. **Write tests first**: 401 unauthenticated, 201 empty body, 201 title-only, 201 full payload, 201 with staged files
2. **Implement**: Auth → validate `draftSaveSchema` → `createDraft()` → move staged files if sessionId → return 201
3. **Verify**: All POST tests pass.

---

#### T010: Create GET /api/drafts (TDD)

**Files**: `src/app/api/drafts/route.ts`
**Tests**: `tests/unit/api-drafts-route.test.ts`
**Spec refs**: FR-08, FR-10

1. **Write tests first**: 401 unauthenticated, 200 with user's drafts, 200 empty array, ordered by updated_at DESC, excludes soft-deleted
2. **Implement**: Auth → `listDrafts(userId)` → return 200
3. **Verify**: All GET tests pass.

---

#### T011: Create GET /api/drafts/[id] (TDD)

**Files**: `src/app/api/drafts/[id]/route.ts`
**Tests**: `tests/unit/api-draft-detail.test.ts`
**Spec refs**: FR-08, FR-14

1. **Write tests first**: 401, 404 for not-found/other-user/soft-deleted/non-draft, 200 with attachments
2. **Implement**: Auth → `getDraftById()` → fetch attachments → return 200
3. **Verify**: All GET detail tests pass.

---

#### T012: Create PATCH /api/drafts/[id] (TDD)

**Files**: `src/app/api/drafts/[id]/route.ts`
**Tests**: `tests/unit/api-draft-detail.test.ts`
**Spec refs**: FR-03, FR-05

1. **Write tests first**: 401, 404 not-owned, 403 non-draft, 200 partial update, updated_at refresh
2. **Implement**: Auth → verify draft → validate `draftSaveSchema` → `updateDraft()` → return 200
3. **Verify**: All PATCH tests pass.

---

#### T013: Create POST /api/drafts/[id]/submit (TDD)

**Files**: `src/app/api/drafts/[id]/submit/route.ts`
**Tests**: `tests/unit/api-draft-submit.test.ts`
**Spec refs**: FR-04, FR-05, EC1

1. **Write tests first**: 401, 404, 403 non-draft, 400 missing fields, 400 invalid fields, 200 success
2. **Implement**: Auth → verify draft → validate current data with `draftSubmitSchema` + category fields → `submitDraft()` → return 200
3. **Verify**: All submit tests pass.

---

#### T014: Create DELETE /api/drafts/[id] (TDD)

**Files**: `src/app/api/drafts/[id]/route.ts`
**Tests**: `tests/unit/api-draft-detail.test.ts`
**Spec refs**: FR-06, EC2

1. **Write tests first**: 401, 404, 403 non-draft, 200 soft-delete, attachments remain in storage
2. **Implement**: Auth → verify draft → `softDeleteDraft()` → return 200
3. **Verify**: All DELETE tests pass.

---

#### T015: Create GET /api/drafts/count (TDD)

**Files**: `src/app/api/drafts/count/route.ts`
**Tests**: `tests/unit/api-drafts-count.test.ts`
**Spec refs**: FR-11

1. **Write tests first**: 401, 200 returns `{ count: 0 }`, 200 returns correct count
2. **Implement**: Auth → `getDraftCount(userId)` → return `{ count }`
3. **Verify**: Count tests pass.

---

#### T016: Create POST /api/drafts/staging/upload (TDD)

**Files**: `src/app/api/drafts/staging/upload/route.ts`
**Tests**: `tests/unit/api-drafts-staging.test.ts`
**Spec refs**: FR-07, Clarification Q2

1. **Write tests first**: 401, 400 invalid file, 201 with storage path
2. **Implement**: Auth → validateFile → `uploadToStaging(file, sessionId)` → return 201
3. **Verify**: Staging upload tests pass.

---

#### T017: Create API integration tests

**Files**: `tests/integration/api-drafts-flow.test.ts`
**Spec refs**: S1–S7, EC1–EC5

1. Integration tests for full draft lifecycle:
   - Create → update → submit → verify status transition
   - Create → soft-delete → verify excluded from list
   - Create with staged files → verify files moved
   - Cross-user access → 404
   - Submit with missing fields → 400
2. **Verify**: All integration tests pass.

---

### Phase 4: UI — Auto-Save & Form Infrastructure (TDD)

#### T018: Create useAutoSave hook (TDD)

**Files**: `src/lib/hooks/use-auto-save.ts`
**Tests**: `tests/unit/use-auto-save.test.ts`
**Spec refs**: FR-16, FR-17, FR-18, FR-19

1. **Write tests first** for:
   - Calls save after AUTOSAVE_DEBOUNCE_MS debounce
   - Skips save when data unchanged (dirty check)
   - POST on first save (new), PATCH on subsequent
   - saveStatus transitions: idle → saving → saved / error
   - Error handling with retry on next change

2. **Implement**: Custom hook with debounce, deep equality, status tracking

3. **Verify**: All use-auto-save tests pass.

---

#### T019: Create SaveStatusIndicator component (TDD)

**Files**: `src/components/ui/save-status-indicator.tsx`
**Tests**: `tests/unit/save-status-indicator.test.tsx`
**Spec refs**: FR-17, NFR-02

1. **Write tests first**: idle renders nothing, "Saving..." + spinner, "Saved" + checkmark, "Save failed" + warning
2. **Implement**: Subtle text/icon component with status prop
3. **Verify**: All indicator tests pass.

---

#### T020: Extract shared IdeaForm component (TDD)

**Files**: `src/components/idea-form.tsx`
**Tests**: `tests/unit/idea-form.test.tsx`
**Spec refs**: NFR-01

1. **Write tests first**: renders in "new" mode, renders in "draft-edit" mode with data, shows correct buttons per mode, calls callbacks
2. **Implement**: Extract from `NewIdeaPage`, accept mode/data/callbacks props, integrate auto-save + indicator
3. **Refactor**: Update `/ideas/new/page.tsx` to use `IdeaForm`
4. **Verify**: All idea-form tests pass; no regressions on existing submission tests.

---

### Phase 5: UI — Draft Pages (TDD)

#### T021: Update idea submission form for draft mode

**Files**: `src/app/ideas/new/page.tsx`
**Tests**: `tests/unit/new-idea-draft.test.tsx`
**Spec refs**: S1, S7, FR-01, FR-16, NFR-01

1. **Write tests first**: "Save Draft" button present, draft creation on click, auto-save indicator, staging for pre-draft files
2. **Implement**: Integrate `IdeaForm` in "new" mode with draft support
3. **Verify**: All new-idea-draft tests pass.

---

#### T022: Create My Drafts listing page (TDD)

**Files**: `src/app/ideas/drafts/page.tsx`
**Tests**: `tests/unit/drafts-page.test.tsx`
**Spec refs**: S2, FR-08, FR-09, FR-10, NFR-04

1. **Write tests first**: draft list rendering, "Untitled Draft" display, ordering, delete with AlertDialog, empty state, auth redirect
2. **Implement**: Authenticated page, fetch from GET /api/drafts, render with shadcn Cards, delete with AlertDialog + Toast
3. **Verify**: All drafts-page tests pass.

---

#### T023: Add "My Drafts" nav link with count badge (TDD)

**Files**: `src/components/app-shell.tsx`
**Tests**: `tests/unit/app-shell-drafts.test.tsx`
**Spec refs**: FR-11, NFR-06

1. **Write tests first**: nav link present, badge with count, badge hidden when zero
2. **Implement**: Add "My Drafts" link with Badge from GET /api/drafts/count
3. **Verify**: All app-shell-drafts tests pass.

---

#### T024: Update middleware for draft routes

**Files**: `middleware.ts`
**Tests**: `tests/unit/middleware.test.ts`
**Spec refs**: FR-08

1. **Write tests first**: authenticated access to `/ideas/drafts` paths, unauthenticated redirect
2. **Implement**: Update route matcher to include `/ideas/drafts`
3. **Verify**: Middleware tests pass.

---

#### T025: Create draft edit page (TDD)

**Files**: `src/app/ideas/drafts/[id]/page.tsx`
**Tests**: `tests/unit/draft-edit-page.test.tsx`
**Spec refs**: S3, S4, S5, FR-03, FR-04, FR-05, FR-15, EC4

1. **Write tests first**: data pre-population, save draft → PATCH, submit → POST submit, validation errors, redirect for non-draft, auth redirect, auto-save indicator
2. **Implement**: `IdeaForm` in "draft-edit" mode, "Delete Draft" button, submit flow
3. **Verify**: All draft-edit-page tests pass.

---

### Phase 6: UI — Delete Actions & Polish (TDD)

#### T026: Implement delete draft actions (TDD)

**Files**: `src/app/ideas/drafts/page.tsx`, `src/app/ideas/drafts/[id]/page.tsx`
**Tests**: `tests/unit/drafts-page-delete.test.tsx`, `tests/unit/draft-edit-delete.test.tsx`
**Spec refs**: S6, FR-06, NFR-03, EC2

1. **Write tests first**: AlertDialog trigger, confirmation calls DELETE, success Toast + list refresh, cancel does nothing
2. **Implement**: Delete on listing page (per card) + delete on edit page (destructive button)
3. **Verify**: All delete tests pass.

---

#### T027: Status display and transition updates

**Files**: `src/app/ideas/page.tsx`, `src/lib/validation/status.ts`
**Tests**: `tests/unit/status-transitions.test.ts`
**Spec refs**: FR-04

1. Add "draft" to STATUS_VARIANT/STATUS_LABEL maps (defensive — in case draft appears)
2. Verify draft → submitted transition works via `isValidTransition`
3. **Verify**: All status-transitions tests pass.

---

#### T028: Idea detail page draft visibility

**Tests**: `tests/unit/api-idea-detail.test.ts`
**Spec refs**: FR-14, FR-15, EC3, EC4

1. Verify draft visible to owner only via GET /api/ideas/[id]
2. Verify non-owner gets 404 for drafts
3. Verify edit route for submitted idea redirects to detail view

---

#### T029: Loading, error states, and responsiveness

**Files**: `src/app/ideas/drafts/page.tsx`, `src/app/ideas/drafts/[id]/page.tsx`
**Spec refs**: NFR-05

1. Add loading and error states consistent with existing pages
2. Verify responsive on 375px–1440px+ viewports

---

#### T030: Orphan staging cleanup (TDD)

**Files**: `src/lib/supabase/storage.ts`, `src/app/api/admin/cleanup-staging/route.ts`
**Tests**: `tests/unit/storage-staging.test.ts`
**Spec refs**: EC9

1. Implement `cleanupOrphanedStagedFiles(maxAgeMs)` — delete staged files older than 24h
2. Create admin-only API route `POST /api/admin/cleanup-staging`
3. **Verify**: Cleanup tests pass.

---

#### T031: Coverage sweep

**Tests**: All `tests/`
**Spec refs**: Constitution — Test-First (TDD)

1. Run full test suite: `npm test -- --coverage`
2. Verify ≥ 80% coverage for `src/lib/`
3. Verify no regressions in existing features
4. Run `npm run lint && npx tsc --noEmit`

---

## Task Dependency Graph

```
T001 (types) ──────────┐
T002 (constants) ──────┤
                       ├── T003 (validation schemas)
                       ├── T004 (migration)
                       │
T003 + T004 ───────────┼── T005 (draft queries)
                       ├── T006 (staging ops)
                       ├── T007 (filter ideas)
                       └── T008 (verify admin)
                             │
T005 + T006 + T007 ─────────┼── T009-T016 (API routes)
                             └── T017 (integration tests)
                                        │
T018 (useAutoSave hook) ────────────────┤
T019 (SaveStatusIndicator) ────────────┤
                                       │
T020 (shared IdeaForm) ── T021 (new form update)
                        └── T025 (draft edit page)
                                        │
T022 (drafts list page) ── T026 (delete actions)
T023 (nav badge) ── requires T015
T024 (middleware) ── independent
                                        │
T027-T031 (polish — last) ─────────────┘
```

## Execution Order

1. **T001 + T002** (types + constants — independent files)
2. **T003 + T004** (validation schemas + migration — can parallel)
3. **T005 + T006 + T007 + T008** (queries, staging, filter updates — depend on T001-T004)
4. **T009–T016** (API routes — depend on T003, T005, T006)
5. **T017** (API integration tests — depend on T009–T016)
6. **T018 + T019** (hook + indicator — can parallel with T009–T016)
7. **T020** (shared form — depends on T018, T019)
8. **T021 + T022 + T023 + T024** (pages + nav + middleware — depend on APIs + form)
9. **T025** (draft edit page — depends on T011, T020)
10. **T026** (delete actions — depends on T022, T025)
11. **T027–T031** (polish — last)

---

## Post-Design Constitution Re-evaluation

| Principle          | Status   | Evidence                                                    |
| ------------------ | -------- | ----------------------------------------------------------- |
| Simplicity First   | ✅ PASS  | Draft reuses existing `idea` table (no new entity tables); auto-save via lightweight custom hook (no external library); staging uses existing storage bucket; shared `IdeaForm` component reduces duplication |
| Test-First (TDD)   | ✅ PASS  | All 31 tasks specify "Write tests first" before implementation; T031 dedicated coverage sweep targeting ≥80% for `src/lib/`; detailed test cases in tasks.md |
| Secure by Default  | ✅ PASS  | 5 RLS policy changes enforce draft visibility at DB level (R2); server-side Zod validation on all 7 new API routes; owner-only access enforced at both RLS and application layer; file validation reuses existing secure pipeline |
| Type Safety        | ✅ PASS  | Updated `IdeaStatus` union type (T001); `deleted_at` typed field; new Zod schemas for draft save/submit (T003); strict mode; no `any` types |
| Spec-Driven        | ✅ PASS  | All tasks reference FR/NFR IDs; full artifact chain: spec → research → data-model → contracts → impl-plan → tasks; 19 FRs + 6 NFRs + 9 edge cases covered |

**Post-Design Gate: PASS** — No regressions from initial check.

---

## Generated Artifacts

| Artifact | Path |
| -------- | ---- |
| Feature Spec | [specs/3-draft-submissions/spec.md](spec.md) |
| Research | [specs/3-draft-submissions/research.md](research.md) |
| Data Model | [specs/3-draft-submissions/data-model.md](data-model.md) |
| API Contracts | [specs/3-draft-submissions/contracts/api.md](contracts/api.md) |
| Quickstart | [specs/3-draft-submissions/quickstart.md](quickstart.md) |
| Tasks | [specs/3-draft-submissions/tasks.md](tasks.md) |
| Checklist | [specs/3-draft-submissions/checklists/requirements.md](checklists/requirements.md) |
| This Plan | [specs/3-draft-submissions/impl-plan.md](impl-plan.md) |
