# Tasks: Draft Idea Submissions

**Feature**: 3-draft-submissions
**Created**: 2026-02-26
**Spec**: [spec.md](spec.md)

---

## Phase 1: Setup — Types, Constants, Validation & Migration

- [X] T001 [P] Add draft status to shared types in src/types/index.ts
  - [X] Write test that `IdeaStatus` union includes "draft" in tests/unit/types.test.ts
  - [X] Write test that `Idea` interface has `deleted_at: string | null` field in tests/unit/types.test.ts
  - [X] Add "draft" to `IdeaStatus` union type in src/types/index.ts
  - [X] Add `deleted_at` field (`string | null`) to `Idea` interface in src/types/index.ts
  - [X] Verify type tests pass; no downstream type errors (`npx tsc --noEmit`)

- [X] T002 [P] Add draft constants in src/lib/constants.ts
  - [X] Write test for `AUTOSAVE_DEBOUNCE_MS` equals 3000 in tests/unit/constants.test.ts
  - [X] Write test for `VALID_TRANSITIONS` including "draft" → ["submitted"] in tests/unit/constants.test.ts
  - [X] Write test that `VALID_TRANSITIONS` does not allow "draft" → "under_review", "accepted", or "rejected" in tests/unit/constants.test.ts
  - [X] Write test for `DRAFT_STAGING_PREFIX` constant (temp upload prefix) in tests/unit/constants.test.ts
  - [X] Add `AUTOSAVE_DEBOUNCE_MS = 3000` constant in src/lib/constants.ts
  - [X] Add "draft" → ["submitted"] entry to `VALID_TRANSITIONS` in src/lib/constants.ts
  - [X] Add `DRAFT_STAGING_PREFIX = "staging/"` constant in src/lib/constants.ts
  - [X] Verify all constants tests pass

- [X] T003 Create draft validation schemas in src/lib/validation/draft.ts
  - [ ] Write test that `draftSaveSchema` accepts empty object (no required fields) in tests/unit/validation-draft.test.ts
  - [ ] Write test that `draftSaveSchema` accepts title-only payload in tests/unit/validation-draft.test.ts
  - [ ] Write test that `draftSaveSchema` accepts partial fields (title + description, no category) in tests/unit/validation-draft.test.ts
  - [ ] Write test that `draftSaveSchema` accepts full payload in tests/unit/validation-draft.test.ts
  - [ ] Write test that `draftSubmitSchema` rejects empty object (all fields required) in tests/unit/validation-draft.test.ts
  - [ ] Write test that `draftSubmitSchema` rejects title < 5 chars in tests/unit/validation-draft.test.ts
  - [ ] Write test that `draftSubmitSchema` rejects title > 100 chars in tests/unit/validation-draft.test.ts
  - [ ] Write test that `draftSubmitSchema` rejects description < 20 chars in tests/unit/validation-draft.test.ts
  - [ ] Write test that `draftSubmitSchema` rejects description > 1000 chars in tests/unit/validation-draft.test.ts
  - [ ] Write test that `draftSubmitSchema` rejects missing category in tests/unit/validation-draft.test.ts
  - [ ] Write test that `draftSubmitSchema` accepts valid full payload in tests/unit/validation-draft.test.ts
  - [ ] Create `draftSaveSchema` (all fields optional, title allows empty string) in src/lib/validation/draft.ts
  - [ ] Create `draftSubmitSchema` (re-uses existing `ideaSchema` rules: title 5–100, description 20–1000, category required) in src/lib/validation/draft.ts
  - [ ] Export schemas from src/lib/validation/draft.ts
  - [ ] Verify all validation-draft tests pass

- [X] T004 [P] Create database migration for draft support in supabase/migrations/005_add_draft_support.sql
  - [X] Add "draft" to the idea.status CHECK constraint (drop and recreate)
  - [X] Add `deleted_at TIMESTAMPTZ DEFAULT NULL` column to idea table
  - [X] Create partial index `idx_idea_drafts_by_user` on `(user_id, updated_at DESC) WHERE status = 'draft' AND deleted_at IS NULL`
  - [X] Modify existing idea SELECT RLS policy to exclude draft rows (`status != 'draft'`)
  - [X] Add new RLS policy: owner-only SELECT for draft rows (`user_id = auth.uid() AND status = 'draft' AND deleted_at IS NULL`)
  - [X] Add new RLS policy: owner-only UPDATE for draft rows (`user_id = auth.uid() AND status = 'draft' AND deleted_at IS NULL`)
  - [X] Add new RLS policy: owner-only DELETE for draft rows (`user_id = auth.uid() AND status = 'draft' AND deleted_at IS NULL`)
  - [X] Verify existing INSERT policy already covers `status = 'draft'` for authenticated users on their own rows
  - [X] Verify migration runs without error

---

## Phase 2: Foundational — Queries, Storage, API Routes & Integration Tests

- [X] T005 Create draft query functions in src/lib/queries/drafts.ts
  - [ ] Write test for `createDraft(supabase, input)` inserts idea row with status "draft" and returns created row in tests/unit/queries-drafts.test.ts
  - [ ] Write test for `createDraft` with empty title inserts row with null/empty title in tests/unit/queries-drafts.test.ts
  - [ ] Write test for `updateDraft(supabase, id, input)` updates fields and refreshes `updated_at` in tests/unit/queries-drafts.test.ts
  - [ ] Write test for `getDraftById(supabase, id)` returns draft owned by current user (status = "draft", deleted_at IS NULL) in tests/unit/queries-drafts.test.ts
  - [ ] Write test for `getDraftById` returns null for soft-deleted draft in tests/unit/queries-drafts.test.ts
  - [ ] Write test for `getDraftById` returns null for non-draft (status != "draft") in tests/unit/queries-drafts.test.ts
  - [ ] Write test for `listDrafts(supabase, userId)` returns drafts ordered by updated_at DESC, excluding soft-deleted in tests/unit/queries-drafts.test.ts
  - [ ] Write test for `listDrafts` returns empty array when user has no drafts in tests/unit/queries-drafts.test.ts
  - [ ] Write test for `softDeleteDraft(supabase, id)` sets deleted_at timestamp in tests/unit/queries-drafts.test.ts
  - [ ] Write test for `submitDraft(supabase, id)` transitions status from "draft" to "submitted" in tests/unit/queries-drafts.test.ts
  - [ ] Write test for `getDraftCount(supabase, userId)` returns count of active (non-deleted) drafts in tests/unit/queries-drafts.test.ts
  - [ ] Write test for `getDraftCount` returns 0 when no drafts exist in tests/unit/queries-drafts.test.ts
  - [ ] Implement all seven query functions in src/lib/queries/drafts.ts:
    - `createDraft(supabase, input)` — insert idea row with status "draft" and relaxed fields
    - `updateDraft(supabase, id, input)` — update draft fields, sets updated_at
    - `getDraftById(supabase, id)` — fetch single draft owned by current user (status = "draft", deleted_at IS NULL)
    - `listDrafts(supabase, userId)` — list user's drafts ordered by updated_at DESC, excluding soft-deleted
    - `softDeleteDraft(supabase, id)` — set deleted_at = now()
    - `submitDraft(supabase, id)` — update status from "draft" to "submitted"
    - `getDraftCount(supabase, userId)` — return count of active drafts for badge
  - [ ] Export new draft query functions from src/lib/queries/index.ts
  - [ ] Verify all queries-drafts tests pass

- [X] T006 [P] Create staging file operations in src/lib/supabase/storage.ts
  - [ ] Write test for `uploadToStaging(supabase, file, sessionId)` uploads file to `staging/{sessionId}/{filename}` path in tests/unit/storage-staging.test.ts
  - [ ] Write test for `moveStagedFiles(supabase, sessionId, ideaId)` moves files from staging path to permanent `ideas/{ideaId}/` path in tests/unit/storage-staging.test.ts
  - [ ] Write test for `moveStagedFiles` returns updated storage paths after move in tests/unit/storage-staging.test.ts
  - [ ] Write test for `cleanupStagedFiles(supabase, sessionId)` removes all files in staging prefix for session in tests/unit/storage-staging.test.ts
  - [ ] Write test for `listStagedFiles(supabase, sessionId)` lists files in staging area in tests/unit/storage-staging.test.ts
  - [ ] Implement `uploadToStaging(supabase, file, sessionId)` in src/lib/supabase/storage.ts
  - [ ] Implement `moveStagedFiles(supabase, sessionId, ideaId)` in src/lib/supabase/storage.ts
  - [ ] Implement `cleanupStagedFiles(supabase, sessionId)` in src/lib/supabase/storage.ts
  - [ ] Implement `listStagedFiles(supabase, sessionId)` in src/lib/supabase/storage.ts
  - [ ] Verify all storage-staging tests pass

- [X] T007 [P] Update existing idea queries to filter out drafts in src/lib/queries/ideas.ts
  - [ ] Write test that `listIdeas()` excludes ideas with status "draft" in tests/unit/queries-ideas.test.ts
  - [ ] Write test that `listIdeas()` excludes soft-deleted ideas in tests/unit/queries-ideas.test.ts
  - [ ] Update `listIdeas()` in src/lib/queries/ideas.ts to filter out draft-status ideas (`.neq("status", "draft")`)
  - [ ] Update `listIdeas()` in src/lib/queries/ideas.ts to filter out soft-deleted ideas (`.is("deleted_at", null)`)
  - [ ] Verify existing queries-ideas tests still pass; no regressions

- [X] T008 Verify admin review excludes drafts in tests/unit/api-admin-status.test.ts
  - [ ] Write test or verification that admin review page query excludes draft-status ideas in tests/unit/api-admin-status.test.ts
  - [ ] Verify admin review page query in src/app/admin/review/page.tsx excludes draft-status ideas
  - [ ] Verify existing admin tests pass

- [X] T009 Create POST /api/drafts route in src/app/api/drafts/route.ts
  - [ ] Write test for POST /api/drafts without auth → 401 in tests/unit/api-drafts-route.test.ts
  - [ ] Write test for POST /api/drafts with empty body → 201 (creates draft with no required fields) in tests/unit/api-drafts-route.test.ts
  - [ ] Write test for POST /api/drafts with title-only → 201 with draft record in tests/unit/api-drafts-route.test.ts
  - [ ] Write test for POST /api/drafts with full payload → 201 in tests/unit/api-drafts-route.test.ts
  - [ ] Write test for POST /api/drafts with staged file session → 201 and files moved from staging in tests/unit/api-drafts-route.test.ts
  - [ ] Implement POST handler in src/app/api/drafts/route.ts:
    - Authenticate user (401 if unauthenticated)
    - Validate request body against `draftSaveSchema`
    - Call `createDraft()` and return 201 with created draft
    - If `stagingSessionId` provided, call `moveStagedFiles()` and `createAttachments()` to associate staged uploads
  - [ ] Verify POST tests pass

- [X] T010 [P] Create GET /api/drafts route in src/app/api/drafts/route.ts
  - [ ] Write test for GET /api/drafts without auth → 401 in tests/unit/api-drafts-route.test.ts
  - [ ] Write test for GET /api/drafts returns only authenticated user's drafts in tests/unit/api-drafts-route.test.ts
  - [ ] Write test for GET /api/drafts returns empty array when user has no drafts in tests/unit/api-drafts-route.test.ts
  - [ ] Write test for GET /api/drafts results ordered by updated_at DESC in tests/unit/api-drafts-route.test.ts
  - [ ] Write test for GET /api/drafts excludes soft-deleted drafts in tests/unit/api-drafts-route.test.ts
  - [ ] Implement GET handler in src/app/api/drafts/route.ts:
    - Authenticate user (401 if unauthenticated)
    - Call `listDrafts()` with user ID and return list
  - [ ] Verify GET tests pass

- [X] T011 Create GET /api/drafts/[id] route in src/app/api/drafts/[id]/route.ts
  - [ ] Write test for GET /api/drafts/[id] without auth → 401 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for GET /api/drafts/[id] for non-existent draft → 404 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for GET /api/drafts/[id] for other user's draft → 404 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for GET /api/drafts/[id] for soft-deleted draft → 404 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for GET /api/drafts/[id] for submitted idea → 404 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for GET /api/drafts/[id] returns draft with attachments (signed URLs) in tests/unit/api-draft-detail.test.ts
  - [ ] Implement GET handler in src/app/api/drafts/[id]/route.ts:
    - Authenticate user (401 if unauthenticated)
    - Call `getDraftById()` — return 404 if not found or not owned
    - Fetch attachments with signed URLs
    - Return draft with attachments
  - [ ] Verify GET detail tests pass

- [X] T012 Create PATCH /api/drafts/[id] route in src/app/api/drafts/[id]/route.ts
  - [ ] Write test for PATCH /api/drafts/[id] without auth → 401 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for PATCH /api/drafts/[id] for non-draft idea → 403 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for PATCH /api/drafts/[id] for other user's draft → 404 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for PATCH /api/drafts/[id] with partial fields → 200 with updated draft in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for PATCH /api/drafts/[id] updates `updated_at` timestamp in tests/unit/api-draft-detail.test.ts
  - [ ] Implement PATCH handler in src/app/api/drafts/[id]/route.ts:
    - Authenticate user (401 if unauthenticated)
    - Verify idea exists, is a draft, and owned by user
    - Validate against `draftSaveSchema` and call `updateDraft()`
    - Return 200 with updated draft
  - [ ] Verify PATCH tests pass

- [X] T013 Create POST /api/drafts/[id]/submit route in src/app/api/drafts/[id]/submit/route.ts
  - [ ] Write test for POST /api/drafts/[id]/submit without auth → 401 in tests/unit/api-draft-submit.test.ts
  - [ ] Write test for POST /api/drafts/[id]/submit for non-draft → 403 in tests/unit/api-draft-submit.test.ts
  - [ ] Write test for POST /api/drafts/[id]/submit with missing required fields → 400 with validation errors in tests/unit/api-draft-submit.test.ts
  - [ ] Write test for POST /api/drafts/[id]/submit with title < 5 chars → 400 in tests/unit/api-draft-submit.test.ts
  - [ ] Write test for POST /api/drafts/[id]/submit with valid draft → 200 with status "submitted" in tests/unit/api-draft-submit.test.ts
  - [ ] Write test for POST /api/drafts/[id]/submit returns validation error details for each invalid field in tests/unit/api-draft-submit.test.ts
  - [ ] Implement POST handler in src/app/api/drafts/[id]/submit/route.ts:
    - Authenticate user (401 if unauthenticated)
    - Verify idea exists, is a draft, and owned by user
    - Fetch current draft data and validate against `draftSubmitSchema` (full validation)
    - Validate category-specific fields via `validateCategoryFieldsForCategory()`
    - Return 400 with field-level errors if invalid
    - Call `submitDraft()` to transition status from "draft" to "submitted"
    - Return submitted idea
  - [ ] Verify submit tests pass

- [X] T014 Create DELETE /api/drafts/[id] route in src/app/api/drafts/[id]/route.ts
  - [ ] Write test for DELETE /api/drafts/[id] without auth → 401 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for DELETE /api/drafts/[id] for other user's draft → 404 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for DELETE /api/drafts/[id] for non-draft → 403 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for DELETE /api/drafts/[id] soft-deletes (sets deleted_at) → 200 in tests/unit/api-draft-detail.test.ts
  - [ ] Write test for DELETE /api/drafts/[id] with attachments → 200, draft soft-deleted, attachment files remain in storage in tests/unit/api-draft-detail.test.ts
  - [ ] Implement DELETE handler in src/app/api/drafts/[id]/route.ts:
    - Authenticate user (401 if unauthenticated)
    - Verify idea exists, is a draft, and owned by user
    - Call `softDeleteDraft()` and return 200 with `{ message: "Draft deleted" }`
  - [ ] Verify DELETE tests pass

- [X] T015 [P] Create GET /api/drafts/count route in src/app/api/drafts/count/route.ts
  - [ ] Write test for GET /api/drafts/count without auth → 401 in tests/unit/api-drafts-count.test.ts
  - [ ] Write test for GET /api/drafts/count returns `{ count: 0 }` when no drafts in tests/unit/api-drafts-count.test.ts
  - [ ] Write test for GET /api/drafts/count returns correct count excluding soft-deleted in tests/unit/api-drafts-count.test.ts
  - [ ] Implement GET handler in src/app/api/drafts/count/route.ts:
    - Authenticate user (401 if unauthenticated)
    - Call `getDraftCount()` and return `{ count: number }`
  - [ ] Verify count tests pass

- [X] T016 [P] Create POST /api/drafts/staging/upload route in src/app/api/drafts/staging/upload/route.ts
  - [ ] Write test for POST /api/drafts/staging/upload without auth → 401 in tests/unit/api-drafts-staging.test.ts
  - [ ] Write test for POST /api/drafts/staging/upload with invalid file (wrong type) → 400 in tests/unit/api-drafts-staging.test.ts
  - [ ] Write test for POST /api/drafts/staging/upload with oversized file → 400 in tests/unit/api-drafts-staging.test.ts
  - [ ] Write test for POST /api/drafts/staging/upload with valid file → 201 with storage path in tests/unit/api-drafts-staging.test.ts
  - [ ] Write test for POST /api/drafts/staging/upload with missing sessionId → 400 in tests/unit/api-drafts-staging.test.ts
  - [ ] Implement POST handler in src/app/api/drafts/staging/upload/route.ts:
    - Authenticate user (401 if unauthenticated)
    - Parse multipart form data for `file` and `sessionId` fields
    - Validate file with `validateFile()` (type, size)
    - Call `uploadToStaging(file, sessionId)` and return 201 with `{ storagePath, originalFileName, fileSize, mimeType }`
    - Return 400 for invalid file or missing sessionId
  - [ ] Verify staging upload tests pass

- [X] T017 Create API integration tests in tests/integration/api-drafts-flow.test.ts
  - [ ] Write integration test: create draft → update draft → submit draft → verify status transition in tests/integration/api-drafts-flow.test.ts
  - [ ] Write integration test: create draft → soft-delete → verify excluded from list in tests/integration/api-drafts-flow.test.ts
  - [ ] Write integration test: create draft with staged files → verify files moved to permanent storage in tests/integration/api-drafts-flow.test.ts
  - [ ] Write integration test: attempt to access another user's draft → 404 in tests/integration/api-drafts-flow.test.ts
  - [ ] Write integration test: submit draft with missing fields → 400 with validation errors in tests/integration/api-drafts-flow.test.ts
  - [ ] Verify all integration tests pass

---

## Phase 3: US1 — Save & Auto-Save Drafts (S1, S5, S7)

> **Goal**: Submitters can save new drafts (manually or via auto-save) and update existing drafts.
> **Test criteria**: Draft is created and persisted; auto-save triggers after 3s debounce; save status indicator shows correct state; staged files are moved on draft creation.

- [X] T018 [P] [US1] Create useAutoSave hook in src/lib/hooks/use-auto-save.ts
  - [ ] Write test that `useAutoSave` calls save callback after `AUTOSAVE_DEBOUNCE_MS` debounce in tests/unit/use-auto-save.test.ts
  - [ ] Write test that `useAutoSave` does NOT call save when form data hasn't changed (dirty check) in tests/unit/use-auto-save.test.ts
  - [ ] Write test that `useAutoSave` creates draft via POST on first auto-save (no existing draftId) in tests/unit/use-auto-save.test.ts
  - [ ] Write test that `useAutoSave` updates draft via PATCH on subsequent auto-saves (draftId set) in tests/unit/use-auto-save.test.ts
  - [ ] Write test that `useAutoSave` sets saveStatus to "saving" during request in tests/unit/use-auto-save.test.ts
  - [ ] Write test that `useAutoSave` sets saveStatus to "saved" on success in tests/unit/use-auto-save.test.ts
  - [ ] Write test that `useAutoSave` sets saveStatus to "error" on network failure and retries on next change in tests/unit/use-auto-save.test.ts
  - [ ] Write test that `useAutoSave` passes `stagingSessionId` on first create for staged file association in tests/unit/use-auto-save.test.ts
  - [ ] Implement `useAutoSave` custom hook in src/lib/hooks/use-auto-save.ts:
    - Accept form data, draft ID (nullable for new), staging session ID, and save callback
    - Track dirty state by comparing current data with last-saved snapshot (deep equality)
    - Debounce save calls by `AUTOSAVE_DEBOUNCE_MS` (3 seconds)
    - Expose `saveStatus` state: "idle" | "saving" | "saved" | "error"
    - On first auto-save of a new form, call POST /api/drafts (with stagingSessionId); subsequent saves call PATCH
    - Handle network errors gracefully (set status to "error", retry on next change)
  - [ ] Verify all use-auto-save tests pass

- [X] T019 [P] [US1] Create SaveStatusIndicator component in src/components/ui/save-status-indicator.tsx
  - [ ] Write test that `SaveStatusIndicator` renders nothing when status is "idle" in tests/unit/save-status-indicator.test.tsx
  - [ ] Write test that `SaveStatusIndicator` renders spinner + "Saving..." when status is "saving" in tests/unit/save-status-indicator.test.tsx
  - [ ] Write test that `SaveStatusIndicator` renders checkmark + "Saved" when status is "saved" in tests/unit/save-status-indicator.test.tsx
  - [ ] Write test that `SaveStatusIndicator` renders warning + "Save failed" when status is "error" in tests/unit/save-status-indicator.test.tsx
  - [ ] Implement `SaveStatusIndicator` component in src/components/ui/save-status-indicator.tsx:
    - Accept `status` prop: "idle" | "saving" | "saved" | "error"
    - Render subtle text/icon: empty for idle, spinner for "saving", checkmark + "Saved" for saved, warning + "Save failed" for error
    - Use shadcn/ui styling — small muted text near form header
  - [ ] Verify all save-status-indicator tests pass

- [X] T020 [US1] Update idea submission form for draft mode in src/app/ideas/new/page.tsx
  - [ ] Write test that form renders "Save Draft" button (secondary variant) alongside "Submit" button in tests/unit/new-idea-draft.test.tsx
  - [ ] Write test that "Save Draft" click creates draft via POST /api/drafts and redirects to /ideas/drafts in tests/unit/new-idea-draft.test.tsx
  - [ ] Write test that "Submit" click validates against full `draftSubmitSchema` rules in tests/unit/new-idea-draft.test.tsx
  - [ ] Write test that auto-save indicator appears in form header in tests/unit/new-idea-draft.test.tsx
  - [ ] Write test that auto-save creates draft after 3s debounce when content changes in tests/unit/new-idea-draft.test.tsx
  - [ ] Write test that attachments uploaded before draft creation go to staging area in tests/unit/new-idea-draft.test.tsx
  - [ ] Write test that staged files are associated when draft is auto-created in tests/unit/new-idea-draft.test.tsx
  - [ ] Update idea submission form in src/app/ideas/new/page.tsx to support draft mode:
    - Generate a staging session ID (UUID) on mount for pre-draft file uploads
    - Add "Save Draft" button (secondary/outline variant) next to existing "Submit" button
    - Integrate `useAutoSave` hook for auto-saving with staging session ID
    - Render `SaveStatusIndicator` in form header area
    - On manual "Save Draft" click: validate against `draftSaveSchema`, call POST or PATCH, redirect to /ideas/drafts
    - On "Submit" click: validate against `draftSubmitSchema`, call submit flow, redirect to detail
    - Handle attachment uploads: if no draft exists yet, upload to staging via POST /api/drafts/staging/upload; once draft is created, files are moved automatically
  - [ ] Verify all new-idea-draft tests pass

---

## Phase 4: US2 — My Drafts Listing (S2)

> **Goal**: Submitters can see their list of saved drafts and navigate to continue editing.
> **Test criteria**: Drafts page shows user's drafts only; displays title (or "Untitled Draft")/category/date; ordered by most recent; empty state works; nav badge shows count.

- [X] T021 [P] [US2] Create My Drafts listing page in src/app/ideas/drafts/page.tsx
  - [ ] Write test that drafts page renders list of user's drafts with title, category, and date in tests/unit/drafts-page.test.tsx
  - [ ] Write test that drafts with empty/null title display as "Untitled Draft" in tests/unit/drafts-page.test.tsx
  - [ ] Write test that drafts are ordered by most recently saved first in tests/unit/drafts-page.test.tsx
  - [ ] Write test that each draft card links to /ideas/drafts/[id] in tests/unit/drafts-page.test.tsx
  - [ ] Write test that delete button shows AlertDialog confirmation in tests/unit/drafts-page.test.tsx
  - [ ] Write test that confirming delete calls DELETE /api/drafts/[id] and refreshes list in tests/unit/drafts-page.test.tsx
  - [ ] Write test that empty state shows message + "Create New Idea" CTA in tests/unit/drafts-page.test.tsx
  - [ ] Write test that drafts page redirects to login when unauthenticated in tests/unit/drafts-page.test.tsx
  - [ ] Implement My Drafts listing page in src/app/ideas/drafts/page.tsx:
    - Authenticate user; redirect to login if unauthenticated
    - Fetch drafts from GET /api/drafts
    - Render list using shadcn Card components: title (or "Untitled Draft"), category badge (if set), last saved date
    - Order by updated_at DESC (server-side)
    - Each card links to /ideas/drafts/[id] for editing
    - Include "Delete" action per card with AlertDialog confirmation
    - Empty state: message + "Create New Idea" CTA button linking to /ideas/new
  - [ ] Verify all drafts-page tests pass

- [X] T022 [US2] Add "My Drafts" nav link with count badge in src/components/app-shell.tsx
  - [ ] Write test that app shell renders "My Drafts" nav link for authenticated users in tests/unit/app-shell-drafts.test.tsx
  - [ ] Write test that "My Drafts" link shows badge with draft count in tests/unit/app-shell-drafts.test.tsx
  - [ ] Write test that badge is hidden when draft count is zero in tests/unit/app-shell-drafts.test.tsx
  - [ ] Write test that badge uses shadcn Badge component with muted variant in tests/unit/app-shell-drafts.test.tsx
  - [ ] Add "My Drafts" nav item to app shell navigation in src/components/app-shell.tsx:
    - Add between "Submit Idea" and "Admin Review" links
    - Fetch draft count via GET /api/drafts/count
    - Render shadcn Badge with count next to link text; hide badge when count is zero
    - Add to both desktop sidebar and mobile header nav
  - [ ] Verify all app-shell-drafts tests pass

- [X] T023 [P] [US2] Update middleware route matcher in middleware.ts
  - [ ] Write test that middleware allows authenticated access to `/ideas/drafts` paths in tests/unit/middleware.test.ts
  - [ ] Write test that middleware redirects unauthenticated users from `/ideas/drafts` to login in tests/unit/middleware.test.ts
  - [ ] Update middleware route matcher to include `/ideas/drafts` paths in middleware.ts
  - [ ] Verify middleware tests pass

---

## Phase 5: US3 — Resume Editing & Submit Draft (S3, S4)

> **Goal**: Submitters can open an existing draft, resume editing with fields pre-populated, and submit when complete.
> **Test criteria**: All saved fields are pre-populated; full validation runs on submit; status transitions to "submitted"; redirects to detail view.

- [X] T024 [P] [US3] Extract shared IdeaForm component in src/components/idea-form.tsx
  - [ ] Write test that `IdeaForm` renders in "new" mode with empty fields in tests/unit/idea-form.test.tsx
  - [ ] Write test that `IdeaForm` renders in "draft-edit" mode with pre-filled data in tests/unit/idea-form.test.tsx
  - [ ] Write test that `IdeaForm` shows "Save Draft" + "Submit" buttons in draft mode in tests/unit/idea-form.test.tsx
  - [ ] Write test that `IdeaForm` calls `onSaveDraft` when "Save Draft" is clicked in tests/unit/idea-form.test.tsx
  - [ ] Write test that `IdeaForm` calls `onSubmit` when "Submit" is clicked in tests/unit/idea-form.test.tsx
  - [ ] Write test that `IdeaForm` shows auto-save indicator in tests/unit/idea-form.test.tsx
  - [ ] Extract shared draft/idea form component in src/components/idea-form.tsx:
    - Refactor common form fields (title, description, category, category fields, file upload) into a reusable component
    - Accept props: `mode` ("new" | "draft-edit"), `initialData?`, `draftId?`, `stagingSessionId`, `onSaveDraft`, `onSubmit`
    - Integrate `useAutoSave` hook and `SaveStatusIndicator`
    - Used by both /ideas/new and /ideas/drafts/[id] pages
  - [ ] Refactor src/app/ideas/new/page.tsx to use `IdeaForm` component
  - [ ] Verify all idea-form tests pass; no regressions on existing submission tests

- [X] T025 [US3] Create draft edit page in src/app/ideas/drafts/[id]/page.tsx
  - [ ] Write test that draft edit page loads draft data from GET /api/drafts/[id] and pre-populates form in tests/unit/draft-edit-page.test.tsx
  - [ ] Write test that all fields (title, description, category, category_fields, attachments) are pre-populated in tests/unit/draft-edit-page.test.tsx
  - [ ] Write test that non-existent draft → redirect to /ideas in tests/unit/draft-edit-page.test.tsx
  - [ ] Write test that submitted idea → redirect to /ideas/[id] in tests/unit/draft-edit-page.test.tsx
  - [ ] Write test that "Save Draft" click calls PATCH /api/drafts/[id] in tests/unit/draft-edit-page.test.tsx
  - [ ] Write test that "Submit" click validates against full rules and calls POST /api/drafts/[id]/submit in tests/unit/draft-edit-page.test.tsx
  - [ ] Write test that successful submit → redirect to /ideas/[id] detail view in tests/unit/draft-edit-page.test.tsx
  - [ ] Write test that validation errors display inline for submit failure in tests/unit/draft-edit-page.test.tsx
  - [ ] Write test that unauthenticated user → redirect to login in tests/unit/draft-edit-page.test.tsx
  - [ ] Write test that auto-save indicator works on draft edit page in tests/unit/draft-edit-page.test.tsx
  - [ ] Implement draft edit page in src/app/ideas/drafts/[id]/page.tsx:
    - Authenticate user; redirect to login if unauthenticated
    - Fetch draft via GET /api/drafts/[id]
    - If idea not found or not a draft → redirect to /ideas or /ideas/[id]
    - Render `IdeaForm` in "draft-edit" mode with pre-populated data
    - "Save Draft" button: validate with `draftSaveSchema`, call PATCH /api/drafts/[id]
    - "Submit" button: validate with `draftSubmitSchema`, call POST /api/drafts/[id]/submit
    - On successful submit → redirect to /ideas/[id]
    - Show validation errors inline for submit failures
    - Include `SaveStatusIndicator` in form header
    - Include "Delete Draft" button (destructive variant) with AlertDialog
  - [ ] Verify all draft-edit-page tests pass

---

## Phase 6: US4 — Delete Draft Actions (S6)

> **Goal**: Submitters can soft-delete a draft from their drafts list or while editing.
> **Test criteria**: Draft disappears from drafts list after deletion; soft-deleted row retained in DB; confirmation dialog shown; toast confirmation.

- [X] T026 [US4] Implement delete draft on drafts listing page in src/app/ideas/drafts/page.tsx
  - [ ] Write test that delete button per draft card triggers AlertDialog in tests/unit/drafts-page-delete.test.tsx
  - [ ] Write test that confirming deletion calls DELETE /api/drafts/[id] in tests/unit/drafts-page-delete.test.tsx
  - [ ] Write test that successful deletion shows success Toast and removes draft from list in tests/unit/drafts-page-delete.test.tsx
  - [ ] Write test that cancelling deletion does nothing in tests/unit/drafts-page-delete.test.tsx
  - [ ] Write test that delete error shows error Toast in tests/unit/drafts-page-delete.test.tsx
  - [ ] Implement delete draft action on drafts listing page in src/app/ideas/drafts/page.tsx:
    - Add delete button per draft card
    - Show AlertDialog confirmation before deletion (NFR-03)
    - Call DELETE /api/drafts/[id] on confirmation
    - Show success Toast and refresh drafts list
    - Handle error with Toast notification
  - [ ] Verify all drafts-page-delete tests pass

- [X] T027 [US4] Add delete draft on draft edit page in src/app/ideas/drafts/[id]/page.tsx
  - [ ] Write test that "Delete Draft" button (destructive variant) appears on edit page in tests/unit/draft-edit-delete.test.tsx
  - [ ] Write test that clicking "Delete Draft" shows AlertDialog confirmation in tests/unit/draft-edit-delete.test.tsx
  - [ ] Write test that confirming deletion calls DELETE /api/drafts/[id] and redirects to /ideas/drafts in tests/unit/draft-edit-delete.test.tsx
  - [ ] Write test that successful deletion shows success Toast in tests/unit/draft-edit-delete.test.tsx
  - [ ] Add "Delete Draft" button (destructive variant) to draft edit page in src/app/ideas/drafts/[id]/page.tsx:
    - Show AlertDialog confirmation before deletion
    - Call DELETE /api/drafts/[id] on confirmation
    - On success → redirect to /ideas/drafts with success Toast
  - [ ] Verify all draft-edit-delete tests pass

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T028 Add draft status display and transitions in src/lib/validation/status.ts
  - [ ] Write test for "draft" → "submitted" transition in tests/unit/status-transitions.test.ts
  - [ ] Add "draft" to STATUS_VARIANT and STATUS_LABEL maps in src/app/ideas/page.tsx (ensure any leaked draft rows render gracefully)
  - [ ] Update `VALID_TRANSITIONS` usage in src/lib/validation/status.ts to handle "draft" → ["submitted"] transition correctly
  - [ ] Verify existing status-transitions tests pass

- [X] T029 Verify idea detail page draft visibility in tests/unit/api-idea-detail.test.ts
  - [ ] Write test that idea detail page shows draft to owner only in tests/unit/api-idea-detail.test.ts
  - [ ] Write test that idea detail page returns 404 for non-owner accessing a draft in tests/unit/api-idea-detail.test.ts
  - [ ] Verify that existing idea detail page in src/app/ideas/[id]/page.tsx handles draft visibility correctly
  - [ ] Verify that navigating to edit route for submitted idea redirects to detail view (FR-15)

- [X] T030 Add loading, error states, and responsiveness to draft pages
  - [ ] Add loading and error states to draft pages (consistent with existing pages) in src/app/ideas/drafts/page.tsx and src/app/ideas/drafts/[id]/page.tsx
  - [ ] Responsive testing: verify drafts list and edit form work on 375px–1440px+ viewports

- [X] T031 Create orphan staging file cleanup in src/lib/supabase/storage.ts
  - [ ] Write test for orphan cleanup utility that removes staged files older than 24h in tests/unit/storage-staging.test.ts
  - [ ] Implement `cleanupOrphanedStagedFiles(supabase, maxAgeMs)` in src/lib/supabase/storage.ts:
    - List all files in `staging/` prefix
    - Delete files older than `maxAgeMs` (default 24 hours)
    - Log cleanup results
  - [ ] Create API route `POST /api/admin/cleanup-staging` (admin-only) in src/app/api/admin/cleanup-staging/route.ts
  - [ ] Document orphan cleanup endpoint in specs/3-draft-submissions/spec.md edge case EC9

- [X] T032 Run coverage sweep across all tests
  - [ ] Run full test suite and verify ≥ 80% coverage for `src/lib/` and all new files
  - [ ] Identify and fill any coverage gaps in draft-related code paths
  - [ ] Verify no regressions in existing feature tests (smart-category-form, multi-media-support)
  - [ ] Confirm lint and typecheck pass for all touched files via `npm run lint && npx tsc --noEmit`

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 5 (US3) → Phase 7 (Polish)
                                          → Phase 4 (US2) → Phase 7 (Polish)
                                          → Phase 6 (US4) → Phase 7 (Polish)
```

### Task-Level Dependency Graph

```
T001 (types) ──────────┐
T002 (constants) ──────┤
                       ├── T003 (validation)
T004 (migration) ──────┤
                       │
T003 + T004 ───────────┼── T005 (draft queries)
                       ├── T006 (staging ops)     ── T016 (staging API)
                       ├── T007 (filter ideas)
                       └── T008 (verify admin)
                                │
T005 + T006 + T007 ────────────┼── T009–T015 (draft API routes)
                               └── T016 (staging upload API)
                                        │
T009–T016 ──────────────────────────────┼── T017 (integration tests)
                                        │
T018 (useAutoSave) ────────────────────┤
T019 (SaveStatusIndicator) ───────────┤
                                      │
                                      ├── T020 (form update) ─── [US1 complete]
                                      │
T010 + T014 ──────────────────────────┼── T021 (drafts list)
T015 ─────────────────────────────────┼── T022 (nav badge)
                                      ├── T023 (middleware)     ─── [US2 complete]
                                      │
T018 + T019 ──────────────────────────┼── T024 (shared form)
T011 + T012 + T013 + T024 ───────────┼── T025 (draft edit)    ─── [US3 complete]
                                      │
T021 + T025 ──────────────────────────┼── T026 (delete listing)
                                      ├── T027 (delete edit)   ─── [US4 complete]
                                      │
T026 + T027 ──────────────────────────┼── T028–T032 (polish)
```

### Execution Order

1. **T001 + T002 + T004** — types, constants, migration (all [P], independent files)
2. **T003** — validation schemas (depends on T001, T002)
3. **T005 + T006 + T007 + T008** — queries, staging ops, filter updates (depends on T003, T004; parallelizable across different files)
4. **T009–T016** — API routes + staging upload (depends on T005, T006; T010/T015/T016 parallelizable)
5. **T017** — API integration tests (depends on all API routes)
6. **T018 + T019** — useAutoSave hook + SaveStatusIndicator (can parallel with step 4)
7. **T020** — update idea submission form (depends on T009, T012, T018, T019)
8. **T021 + T022 + T023** — drafts listing, nav badge, middleware (depends on T010, T014, T015; parallelizable)
9. **T024** — shared IdeaForm extraction (depends on T018, T019)
10. **T025** — draft edit page (depends on T011, T012, T013, T024)
11. **T026 + T027** — delete actions (depends on T021, T025)
12. **T028–T032** — polish and coverage (last)

### Parallel Execution Batches

| Batch | Tasks | Notes |
|-------|-------|-------|
| 1 | T001 + T002 + T004 | Independent files: types, constants, migration |
| 2 | T003 | Validation schemas (needs T001/T002 types) |
| 3 | T005 + T006 + T007 + T008 | Queries vs storage vs filters (different files) |
| 4 | T009–T016 + T018 + T019 | API routes + UI hooks/components (no cross-dependency) |
| 5 | T017 + T020 | Integration tests + form update |
| 6 | T021 + T022 + T023 + T024 | Listing, nav, middleware, shared form (different pages) |
| 7 | T025 | Draft edit page (needs T024) |
| 8 | T026 + T027 | Delete actions (needs T021, T025) |
| 9 | T028–T032 | Polish tasks (independent) |

---

## Implementation Strategy

### MVP Scope

The minimum viable increment is **Phases 1–3** (Setup + Foundational + US1: Save & Auto-Save). This delivers the core value proposition — submitters can save incomplete ideas — without requiring the full drafts listing or edit UX. Auto-save alone prevents data loss for the most common case (accidental navigation away).

### Incremental Delivery

1. **Increment 1** (Phases 1–3): Save & auto-save drafts with TDD → immediately reduces idea abandonment
2. **Increment 2** (Phase 4): Drafts listing + nav badge → makes saved drafts discoverable
3. **Increment 3** (Phase 5): Resume editing & submit → completes the full draft lifecycle
4. **Increment 4** (Phase 6): Delete drafts → housekeeping capability
5. **Increment 5** (Phase 7): Polish, staging cleanup, coverage sweep → production hardening
