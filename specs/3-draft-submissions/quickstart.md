# Quickstart: Draft Idea Submissions

**Feature**: 3-draft-submissions
**Branch**: 3-draft-submissions

## Prerequisites

- Node.js 20+
- Supabase project running (local or hosted) with Auth, Database, and Storage enabled
- `idea-attachments` storage bucket exists (created by 001_create_schema.sql)
- All prior migrations applied (001–004)

## Setup

```bash
# 1. Checkout the feature branch
git checkout 3-draft-submissions

# 2. Install dependencies (if any new packages added)
npm install

# 3. Apply the new migration
# In Supabase SQL Editor or via CLI:
# Run supabase/migrations/005_add_draft_support.sql

# 4. Verify the migration
# Check that 'draft' is in the idea.status CHECK constraint
# Check that deleted_at column exists on idea table
# Check RLS policies are updated

# 5. Start development server
npm run dev
```

## Verification Checklist

### Database

- [ ] `idea.status` CHECK constraint includes 'draft' (5 values: draft, submitted, under_review, accepted, rejected)
- [ ] `idea.deleted_at` column exists (TIMESTAMPTZ, DEFAULT NULL)
- [ ] Partial index `idx_idea_drafts_by_user` exists on `(user_id, updated_at DESC) WHERE status = 'draft' AND deleted_at IS NULL`
- [ ] Modified RLS: "Authenticated users can read all ideas" excludes `status = 'draft'`
- [ ] New RLS: "Draft owners can read own drafts" allows owner-only SELECT for drafts
- [ ] New RLS: "Draft owners can update own drafts" allows owner-only UPDATE for drafts
- [ ] Existing INSERT policy still allows inserting rows with `status = 'draft'`
- [ ] Existing `idea_attachment` table and policies unchanged

### Types & Constants

- [ ] `IdeaStatus` type includes `"draft"`
- [ ] `Idea` interface has `deleted_at: string | null` field
- [ ] `AUTOSAVE_DEBOUNCE_MS` constant equals 3000
- [ ] `VALID_TRANSITIONS` includes `draft: ["submitted"]`
- [ ] `DRAFT_STAGING_PREFIX` constant equals `"staging/"`

### Validation

- [ ] `draftSaveSchema` accepts empty object (all fields optional)
- [ ] `draftSaveSchema` accepts partial fields
- [ ] `draftSubmitSchema` enforces full validation (title 5–100, description 20–1000, category required)
- [ ] `draftSubmitSchema` rejects incomplete drafts

### Query Functions

- [ ] `createDraft()` inserts idea row with status "draft"
- [ ] `updateDraft()` updates draft fields and refreshes updated_at
- [ ] `getDraftById()` returns draft owned by current user (status = 'draft', deleted_at IS NULL)
- [ ] `listDrafts()` returns user's drafts ordered by updated_at DESC
- [ ] `softDeleteDraft()` sets deleted_at timestamp
- [ ] `submitDraft()` transitions status from "draft" to "submitted"
- [ ] `getDraftCount()` returns count of active drafts
- [ ] `listIdeas()` excludes draft-status and soft-deleted ideas

### API Routes

- [ ] POST `/api/drafts` creates draft with relaxed validation → 201
- [ ] GET `/api/drafts` returns user's drafts list → 200
- [ ] GET `/api/drafts/count` returns `{ count: number }` → 200
- [ ] GET `/api/drafts/[id]` returns draft with attachments → 200
- [ ] PATCH `/api/drafts/[id]` updates draft fields → 200
- [ ] POST `/api/drafts/[id]/submit` validates and submits draft → 200
- [ ] DELETE `/api/drafts/[id]` soft-deletes draft → 200
- [ ] POST `/api/drafts/staging/upload` uploads file to staging → 201
- [ ] All routes return 401 for unauthenticated requests
- [ ] Draft routes return 404 for non-owner access
- [ ] Submit route returns 400 for invalid draft data

### UI — Idea Submission Form

- [ ] "Save Draft" button (secondary/outline variant) appears alongside "Submit" button
- [ ] "Save Draft" creates draft via POST /api/drafts and redirects to /ideas/drafts
- [ ] "Submit" validates against full rules before submitting
- [ ] Auto-save triggers after 3-second debounce when content changes
- [ ] Auto-save creates draft on first trigger (no existing draftId)
- [ ] Auto-save updates draft on subsequent triggers
- [ ] Save status indicator shows "Saving...", "Saved", or "Save failed"
- [ ] Auto-save does not trigger when content is unchanged
- [ ] Attachments uploaded before draft creation go to staging area

### UI — My Drafts Page

- [ ] Drafts page shows list of user's drafts
- [ ] Each draft card shows title (or "Untitled Draft"), category (if set), last saved date
- [ ] Drafts ordered by most recently saved first
- [ ] Each card links to /ideas/drafts/[id] for editing
- [ ] Delete button shows AlertDialog confirmation
- [ ] Successful delete removes draft from list and shows Toast
- [ ] Empty state shows message + "Create New Idea" CTA
- [ ] Page redirects to login when unauthenticated

### UI — Draft Edit Page

- [ ] Draft data loads and pre-populates all fields (title, description, category, category_fields, attachments)
- [ ] "Save Draft" updates via PATCH /api/drafts/[id]
- [ ] "Submit" validates and calls POST /api/drafts/[id]/submit
- [ ] Successful submit redirects to /ideas/[id] detail view
- [ ] Validation errors display inline for submit failure
- [ ] Auto-save indicator works on edit page
- [ ] Non-existent draft redirects to /ideas
- [ ] Submitted idea on edit route redirects to /ideas/[id]

### UI — Navigation

- [ ] "My Drafts" link appears in app shell navigation (both desktop sidebar and mobile header)
- [ ] Badge shows active draft count next to "My Drafts" link
- [ ] Badge is hidden when count is zero
- [ ] Badge uses shadcn Badge component with muted variant

### Access Control

- [ ] Drafts do not appear in public idea listing (/ideas page)
- [ ] Drafts do not appear in admin review dashboard
- [ ] Only draft owner can view, edit, or delete their drafts
- [ ] Accessing another user's draft returns 404
- [ ] Editing a submitted idea redirects to detail view

### Tests

- [ ] All existing tests pass (no regressions)
- [ ] New type/constant tests pass
- [ ] New validation tests pass (draftSaveSchema, draftSubmitSchema)
- [ ] New query tests pass (all 7 draft query functions)
- [ ] New staging storage tests pass
- [ ] New API route tests pass (all draft endpoints)
- [ ] New integration tests pass (full draft flow)
- [ ] New hook tests pass (useAutoSave)
- [ ] New component tests pass (SaveStatusIndicator, IdeaForm, drafts pages)
- [ ] Coverage ≥ 80% for `src/lib/`
- [ ] Lint and typecheck pass: `npm run lint && npx tsc --noEmit`

## Key File Locations

| Area | Path |
|------|------|
| Migration | `supabase/migrations/005_add_draft_support.sql` |
| Types | `src/types/index.ts` |
| Constants | `src/lib/constants.ts` |
| Draft validation | `src/lib/validation/draft.ts` |
| Draft queries | `src/lib/queries/drafts.ts` |
| Staging storage | `src/lib/supabase/storage.ts` |
| Auto-save hook | `src/lib/hooks/use-auto-save.ts` |
| Save indicator | `src/components/ui/save-status-indicator.tsx` |
| Shared form | `src/components/idea-form.tsx` |
| Draft API routes | `src/app/api/drafts/` |
| Staging upload API | `src/app/api/drafts/staging/upload/route.ts` |
| Drafts list page | `src/app/ideas/drafts/page.tsx` |
| Draft edit page | `src/app/ideas/drafts/[id]/page.tsx` |
| Updated idea form | `src/app/ideas/new/page.tsx` |
| Updated app shell | `src/components/app-shell.tsx` |
| Updated idea queries | `src/lib/queries/ideas.ts` |
