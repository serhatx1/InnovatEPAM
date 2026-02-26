# Data Model: Draft Idea Submissions

**Feature**: 3-draft-submissions
**Created**: 2026-02-26
**Schema version**: v3 (extends existing schema v2 from 2-multi-media-support)

## Entity Relationship Diagram

```
┌────────────────┐       ┌──────────────────────────┐       ┌──────────────────────────┐
│  user_profile  │       │          idea             │       │    idea_attachment       │
├────────────────┤       ├──────────────────────────┤       ├──────────────────────────┤
│ id (PK, FK→    │──1:N──│ id (PK)                  │──1:N──│ id (PK)                  │
│   auth.users)  │       │ user_id (FK→             │       │ idea_id (FK→ idea.id)    │
│ email (UNIQUE) │       │   user_profile.id)        │       │ original_file_name       │
│ role           │       │ title                    │       │ file_size                │
│ created_at     │       │ description              │       │ mime_type                │
└────────────────┘       │ category (CHECK)         │       │ storage_path             │
                         │ category_fields          │       │ upload_order             │
                         │ status  (CHECK) ★        │       │ created_at               │
                         │ attachment_url           │       └──────────────────────────┘
                         │ evaluator_comment        │       Indexes:
                         │ deleted_at ★ (new)       │         idx_idea_attachment_idea_id (FK)
                         │ created_at               │         idx_idea_attachment_order (composite)
                         │ updated_at               │
                         └──────────────────────────┘
                         Indexes:
                           idx_idea_user_id (FK)
                           idx_idea_status
                           idx_idea_created_at DESC
                           idx_idea_pending_review (partial)
                           idx_idea_drafts_by_user ★ (new, partial)

★ = Changed or added by this feature
```

> **Changes from previous schema**:
> 1. `status` CHECK constraint expanded to include `'draft'`
> 2. New `deleted_at` column for soft-delete support
> 3. New partial index for draft listing queries
> 4. Modified RLS policies for draft visibility

## Entities

### user_profile (unchanged)

| Column     | Type        | Constraints                                      | Notes                        |
| ---------- | ----------- | ------------------------------------------------ | ---------------------------- |
| id         | UUID (PK)   | REFERENCES auth.users(id) ON DELETE CASCADE       | From Supabase Auth           |
| email      | TEXT        | NOT NULL UNIQUE                                   | Copied from auth.users       |
| role       | TEXT        | NOT NULL DEFAULT 'submitter' CHECK IN ('submitter', 'admin') | Two roles only    |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now()                            |                              |

### idea (modified — status CHECK expanded, deleted_at added)

| Column            | Type        | Constraints                                                  | Notes                                    |
| ----------------- | ----------- | ------------------------------------------------------------ | ---------------------------------------- |
| id                | UUID (PK)   | DEFAULT gen_random_uuid()                                     | Built-in PG 13+                          |
| user_id           | UUID (FK)   | NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE        | The submitter; **indexed**               |
| title             | TEXT        | NOT NULL                                                      | 5–100 chars for submit; empty OK for draft |
| description       | TEXT        | NOT NULL                                                      | 20–1000 chars for submit; empty OK for draft |
| category          | TEXT        | NOT NULL CHECK IN (5 categories)                              | DB-level guard; empty string OK for draft |
| category_fields   | JSONB       | NOT NULL DEFAULT '{}'                                         | Category-specific submission data        |
| status            | TEXT        | NOT NULL DEFAULT 'submitted' CHECK IN (**5** statuses) ★      | **'draft'** added to existing set        |
| attachment_url    | TEXT        | NULLABLE                                                      | Legacy — read-only for old ideas         |
| evaluator_comment | TEXT        | NULLABLE                                                      | min 10 chars when rejected (app)         |
| **deleted_at** ★   | TIMESTAMPTZ | DEFAULT NULL                                                  | **Soft-delete timestamp; NULL = active** |
| created_at        | TIMESTAMPTZ | NOT NULL DEFAULT now()                                        |                                          |
| updated_at        | TIMESTAMPTZ | NOT NULL DEFAULT now()                                        | Auto-updated via trigger                 |

**Status values** (updated):
| Value | Description | Transitions To |
|-------|-------------|----------------|
| **draft** ★ | Incomplete idea saved by submitter | submitted |
| submitted | Formally submitted for review | under_review, accepted, rejected |
| under_review | Admin reviewing the idea | accepted, rejected |
| accepted | Idea approved | (terminal) |
| rejected | Idea declined | (terminal) |

**Design decisions for changes**:
- `deleted_at DEFAULT NULL` — NULL means active; a TIMESTAMPTZ value means soft-deleted. Nullable by design (most rows are active).
- Status CHECK expanded to 5 values — keeps the state machine in one field, consistent with existing pattern.
- `title` and `description` remain `NOT NULL` at DB level — draft saves use empty string `''` rather than NULL, simplifying application logic; the `DEFAULT ''` is handled at application level.

### idea_attachment (unchanged)

| Column             | Type        | Constraints                                                  | Notes                                    |
| ------------------ | ----------- | ------------------------------------------------------------ | ---------------------------------------- |
| id                 | UUID (PK)   | DEFAULT gen_random_uuid()                                     | Built-in PG 13+                          |
| idea_id            | UUID (FK)   | NOT NULL REFERENCES idea(id) ON DELETE CASCADE                | Parent idea; **indexed**                 |
| original_file_name | TEXT        | NOT NULL                                                      | Preserved for download display           |
| file_size          | BIGINT      | NOT NULL CHECK (file_size > 0 AND file_size <= 10485760)      | Max 10 MB; no empty files                |
| mime_type          | TEXT        | NOT NULL                                                      | Validated in app; stored for retrieval   |
| storage_path       | TEXT        | NOT NULL UNIQUE                                               | Unique path in storage bucket            |
| upload_order       | INTEGER     | NOT NULL                                                      | 1-based sequence for display ordering    |
| created_at         | TIMESTAMPTZ | NOT NULL DEFAULT now()                                        |                                          |

## Indexes

### Existing Indexes (unchanged)

| Index                          | Table            | Columns                         | Type    |
| ------------------------------ | ---------------- | ------------------------------- | ------- |
| idx_idea_user_id               | idea             | user_id                         | B-tree  |
| idx_idea_status                | idea             | status                          | B-tree  |
| idx_idea_created_at            | idea             | created_at DESC                 | B-tree  |
| idx_idea_pending_review        | idea             | (status, created_at DESC) WHERE status IN ('submitted', 'under_review') | B-tree partial |
| idx_idea_attachment_idea_id    | idea_attachment  | idea_id                         | B-tree  |
| idx_idea_attachment_order      | idea_attachment  | (idea_id, upload_order)         | B-tree  |

### New Index ★

| Index                          | Table | Columns                         | Type    | Why                                                |
| ------------------------------ | ----- | ------------------------------- | ------- | -------------------------------------------------- |
| idx_idea_drafts_by_user        | idea  | (user_id, updated_at DESC) WHERE status = 'draft' AND deleted_at IS NULL | B-tree partial | Fast "My Drafts" listing — filters to active drafts for a specific user, ordered by most recent |

## RLS Policy Changes ★

### Modified Policies

| Policy Name | Operation | Old Condition | New Condition | Why |
|-------------|-----------|---------------|---------------|-----|
| "Authenticated users can read all ideas" | SELECT | `auth.role() = 'authenticated'` | `auth.role() = 'authenticated' AND status != 'draft'` | FR-12/FR-13: Drafts excluded from public listing and admin views |

### New Policies

| Policy Name | Operation | Condition | Why |
|-------------|-----------|-----------|-----|
| "Draft owners can read own drafts" | SELECT | `(SELECT auth.uid()) = user_id AND status = 'draft' AND deleted_at IS NULL` | FR-14: Only owner sees their active drafts |
| "Draft owners can update own drafts" | UPDATE | `(SELECT auth.uid()) = user_id AND status = 'draft' AND deleted_at IS NULL` | FR-14: Only owner can edit/soft-delete their drafts |

> **Note**: The existing INSERT policy (`auth.uid() = user_id`) already covers inserting drafts — no change needed. The existing admin UPDATE policy continues to work for non-draft ideas. Soft-delete is an UPDATE (setting `deleted_at`), so the "Draft owners can update own drafts" policy covers it.

## Validation Rules

### Draft Save (relaxed — FR-02)

| Field     | Rule                                           | Error Message                            |
| --------- | ---------------------------------------------- | ---------------------------------------- |
| title     | Optional; max 100 chars if provided            | "Title must not exceed 100 characters"   |
| description | Optional; max 1000 chars if provided         | "Description must not exceed 1000 characters" |
| category  | Optional; must be valid category if provided   | "Invalid category"                       |
| category_fields | Optional; no validation on save           | —                                        |
| attachments | Same rules as normal: ≤5 files, ≤10MB each, ≤25MB total, valid types | Same as normal submission |

### Draft Submit (full — FR-05)

| Field     | Rule                                           | Error Message                            |
| --------- | ---------------------------------------------- | ---------------------------------------- |
| title     | Required; 5–100 characters                     | "Title must be between 5 and 100 characters" |
| description | Required; 20–1000 characters                 | "Description must be between 20 and 1000 characters" |
| category  | Required; must be valid category               | "Invalid category"                       |
| category_fields | Required per category definition           | Per-field validation messages             |
| attachments | Same rules as normal submission              | Same as normal submission                |

### Soft Delete

| Field     | Rule                                           | Error Message                            |
| --------- | ---------------------------------------------- | ---------------------------------------- |
| deleted_at | Set to `now()` on delete; NULL on active rows | —                                        |
| status    | Must be 'draft' to soft-delete                 | "Only drafts can be deleted"             |
| ownership | Must be owned by requesting user               | "Not found" (404)                        |

## State Transitions

```
                    ┌────────────────────────┐
                    │                        │
                    ▼                        │
  [new form] ──→ draft ──→ submitted ──→ under_review
                   │                    │         │
                   │ (soft-delete)      │         │
                   ▼                    ▼         ▼
              [deleted_at set]      accepted   rejected
```

### Transition Rules

| From | To | Actor | Condition |
|------|----|-------|-----------|
| (new) | draft | Submitter | Auto-save or manual "Save Draft"; no required fields |
| draft | draft | Submitter | Update via auto-save or manual save |
| draft | submitted | Submitter | Full validation passes (FR-05) |
| draft | (soft-deleted) | Submitter | Owner sets `deleted_at`; draft status retained |
| submitted | under_review | Admin | Via admin status update |
| submitted | accepted | Admin | Via admin status update |
| submitted | rejected | Admin | Via admin status update; comment ≥ 10 chars |
| under_review | accepted | Admin | Via admin status update |
| under_review | rejected | Admin | Via admin status update; comment ≥ 10 chars |

## Migration: 005_add_draft_support.sql

### Schema Changes

```sql
-- 1. Expand status CHECK to include 'draft'
ALTER TABLE public.idea DROP CONSTRAINT idea_status_check;
ALTER TABLE public.idea ADD CONSTRAINT idea_status_check
  CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected'));

-- 2. Add soft-delete column
ALTER TABLE public.idea ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Partial index for draft listing
CREATE INDEX IF NOT EXISTS idx_idea_drafts_by_user
  ON public.idea (user_id, updated_at DESC)
  WHERE status = 'draft' AND deleted_at IS NULL;
```

### RLS Changes

```sql
-- 4. Drop and recreate existing SELECT policy to exclude drafts
DROP POLICY IF EXISTS "Authenticated users can read all ideas" ON public.idea;
CREATE POLICY "Authenticated users can read all ideas"
  ON public.idea FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated' AND status != 'draft');

-- 5. Owner-only SELECT for drafts
CREATE POLICY "Draft owners can read own drafts"
  ON public.idea FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id
    AND status = 'draft'
    AND deleted_at IS NULL
  );

-- 6. Owner-only UPDATE for drafts
CREATE POLICY "Draft owners can update own drafts"
  ON public.idea FOR UPDATE
  USING (
    (SELECT auth.uid()) = user_id
    AND status = 'draft'
    AND deleted_at IS NULL
  );
```
