# Data Model: Multi-Media Support

**Feature**: 2-multi-media-support
**Created**: 2026-02-25
**Schema version**: v1 (extends existing schema v2 from 1-portal-mvp)

## Entity Relationship Diagram

```
┌────────────────┐       ┌──────────────────────┐       ┌──────────────────────────┐
│  user_profile  │       │        idea           │       │    idea_attachment       │
├────────────────┤       ├──────────────────────┤       ├──────────────────────────┤
│ id (PK, FK→    │──1:N──│ id (PK)              │──1:N──│ id (PK)                  │
│   auth.users)  │       │ user_id (FK→         │       │ idea_id (FK→ idea.id)    │
│ email (UNIQUE) │       │   user_profile.id)    │       │ original_file_name       │
│ role           │       │ title                │       │ file_size                │
│ created_at     │       │ description          │       │ mime_type                │
└────────────────┘       │ category (CHECK)     │       │ storage_path             │
                         │ category_fields      │       │ upload_order             │
                         │ status  (CHECK)      │       │ created_at               │
                         │ attachment_url       │       └──────────────────────────┘
                         │ evaluator_comment    │       Indexes:
                         │ created_at           │         idx_idea_attachment_idea_id (FK)
                         │ updated_at           │         idx_idea_attachment_order (composite)
                         └──────────────────────┘
                         Indexes:
                           idx_idea_user_id (FK)
                           idx_idea_status
                           idx_idea_created_at DESC
                           idx_idea_pending_review (partial)
```

> Note: The existing `attachment_url` column on the `idea` table is retained read-only
> for backward compatibility with legacy ideas. New submissions do not write to this field.
> The application layer merges both sources when displaying idea attachments.

## Entities

### user_profile (unchanged)

| Column     | Type        | Constraints                                      | Notes                        |
| ---------- | ----------- | ------------------------------------------------ | ---------------------------- |
| id         | UUID (PK)   | REFERENCES auth.users(id) ON DELETE CASCADE       | From Supabase Auth           |
| email      | TEXT        | NOT NULL UNIQUE                                   | Copied from auth.users       |
| role       | TEXT        | NOT NULL DEFAULT 'submitter' CHECK IN ('submitter', 'admin') | Two roles only    |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now()                            |                              |

### idea (unchanged — attachment_url becomes legacy read-only)

| Column            | Type        | Constraints                                                  | Notes                                    |
| ----------------- | ----------- | ------------------------------------------------------------ | ---------------------------------------- |
| id                | UUID (PK)   | DEFAULT gen_random_uuid()                                     | Built-in PG 13+                          |
| user_id           | UUID (FK)   | NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE        | The submitter; **indexed**               |
| title             | TEXT        | NOT NULL                                                      | 5–100 chars (app validation)             |
| description       | TEXT        | NOT NULL                                                      | 20–1000 chars (app validation)           |
| category          | TEXT        | NOT NULL CHECK IN (5 categories)                              | DB-level guard                           |
| category_fields   | JSONB       | NOT NULL DEFAULT '{}'                                         | Category-specific submission data        |
| status            | TEXT        | NOT NULL DEFAULT 'submitted' CHECK IN (4 statuses)            |                                          |
| attachment_url    | TEXT        | NULLABLE                                                      | **Legacy — read-only for old ideas**     |
| evaluator_comment | TEXT        | NULLABLE                                                      | min 10 chars when rejected (app)         |
| created_at        | TIMESTAMPTZ | NOT NULL DEFAULT now()                                        |                                          |
| updated_at        | TIMESTAMPTZ | NOT NULL DEFAULT now()                                        | Auto-updated via trigger                 |

### idea_attachment (new)

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

**Design decisions**:
- `BIGINT` for file_size — standard for byte counts; `INTEGER` max (2.1 GB) is sufficient but `BIGINT` follows the skill recommendation to prefer BIGINT.
- `CHECK (file_size > 0)` — DB-level guard against zero-byte files (defense in depth; also validated in app).
- `CHECK (file_size <= 10485760)` — DB-level guard for 10 MB max (defense in depth).
- `UNIQUE` on `storage_path` — prevents duplicate storage references at DB level.
- `ON DELETE CASCADE` — when an idea is deleted, all its attachments are cleaned up automatically.
- No `upload_order` UNIQUE constraint per idea — app logic ensures correct ordering; composite index handles query performance.

### Indexes on idea_attachment

| Index                          | Columns                         | Type    | Why                                                |
| ------------------------------ | ------------------------------- | ------- | -------------------------------------------------- |
| idx_idea_attachment_idea_id    | idea_id                         | B-tree  | FK index — PG doesn't auto-create; fast JOINs/CASCADEs |
| idx_idea_attachment_order      | (idea_id, upload_order)         | B-tree  | Ordered retrieval per idea (listing attachments)   |

## Validation Rules

### File Attachment (updated from MVP)

| Field     | Rule                                           | Error Message                            |
| --------- | ---------------------------------------------- | ---------------------------------------- |
| count     | ≤ 5 files per idea                              | "Maximum 5 files allowed"                |
| size      | > 0 bytes (no empty files)                      | "File is empty"                          |
| size      | ≤ 10,485,760 bytes (10 MB) per file             | "File must not exceed 10 MB"             |
| total     | ≤ 26,214,400 bytes (25 MB) combined             | "Total attachment size must not exceed 25 MB" |
| type      | One of 10 accepted MIME types (see below)       | "Accepted formats: PDF, PNG, JPG, GIF, WEBP, DOCX, XLSX, PPTX, CSV" |

**Accepted MIME types**:

| MIME Type | Extension | Category |
|-----------|-----------|----------|
| `application/pdf` | PDF | Document |
| `image/png` | PNG | Image |
| `image/jpeg` | JPG/JPEG | Image |
| `image/gif` | GIF | Image |
| `image/webp` | WEBP | Image |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | DOCX | Document |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | XLSX | Spreadsheet |
| `application/vnd.openxmlformats-officedocument.presentationml.presentation` | PPTX | Presentation |
| `text/csv` | CSV | Data |

**Validation enforcement**: Both client-side (immediate feedback) and server-side (authoritative security check). Client-side validation alone is not sufficient.

### Idea Submission (unchanged)

| Field       | Rule                         | Error Message                            |
| ----------- | ---------------------------- | ---------------------------------------- |
| title       | Required, 5–100 characters   | "Title must be between 5 and 100 characters" |
| description | Required, 20–1000 characters | "Description must be between 20 and 1000 characters" |
| category    | Required, from IDEA_CATEGORIES enum | "Invalid category"               |

### Status Update (unchanged)

| Field            | Rule                                               | Error Message                            |
| ---------------- | -------------------------------------------------- | ---------------------------------------- |
| status           | One of: under_review, accepted, rejected           | "Invalid status"                         |
| evaluatorComment | Required (min 10 chars) when status = "rejected"   | "Rejection comment must be at least 10 characters" |

## Row-Level Security (RLS) Policies

### idea_attachment (new)

All policies use `(SELECT auth.uid())` / `(SELECT auth.role())` wrapping for per-query caching. Admin checks use `is_admin()` SECURITY DEFINER helper.

| Policy                                    | Operation | Rule                              | Implementation                        |
| ----------------------------------------- | --------- | --------------------------------- | ------------------------------------- |
| Authenticated users can read all attachments | SELECT  | Any authenticated user            | `(SELECT auth.role()) = 'authenticated'` |
| Users can insert own idea attachments     | INSERT    | User owns the parent idea         | `EXISTS (SELECT 1 FROM public.idea WHERE id = idea_id AND user_id = (SELECT auth.uid()))` |
| Admins can delete attachments             | DELETE    | User is admin                     | `(SELECT public.is_admin())`          |

**Design decisions**:
- SELECT matches idea visibility (all authenticated users can see all ideas and their attachments).
- INSERT uses a subquery to verify the user owns the parent idea — prevents inserting attachments for someone else's idea.
- DELETE is admin-only for potential cleanup scenarios. Not exposed in UI (out of scope per spec).
- No UPDATE policy — attachment metadata is immutable after creation.

### storage.objects (unchanged)

Existing policies remain — they already allow any authenticated user to upload to and read from the `idea-attachments` bucket.

## Migration SQL (004_add_idea_attachments.sql)

```sql
-- ────────────────────────────────────────────────────────────
-- 004: Add idea_attachment table for multi-file support
-- ────────────────────────────────────────────────────────────

-- 0. TEARDOWN (idempotent)
DROP POLICY IF EXISTS "Authenticated users can read all attachments" ON public.idea_attachment;
DROP POLICY IF EXISTS "Users can insert own idea attachments"        ON public.idea_attachment;
DROP POLICY IF EXISTS "Admins can delete attachments"                ON public.idea_attachment;
DROP TABLE IF EXISTS public.idea_attachment CASCADE;

-- 1. TABLE
CREATE TABLE public.idea_attachment (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id            UUID        NOT NULL
                                 REFERENCES public.idea(id) ON DELETE CASCADE,
  original_file_name TEXT        NOT NULL,
  file_size          BIGINT      NOT NULL
                                 CHECK (file_size > 0 AND file_size <= 10485760),
  mime_type          TEXT        NOT NULL,
  storage_path       TEXT        NOT NULL UNIQUE,
  upload_order       INTEGER     NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. INDEXES
-- FK index — PG doesn't auto-create
CREATE INDEX idx_idea_attachment_idea_id
  ON public.idea_attachment (idea_id);

-- Ordered retrieval per idea
CREATE INDEX idx_idea_attachment_order
  ON public.idea_attachment (idea_id, upload_order);

-- 3. RLS
ALTER TABLE public.idea_attachment ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all attachments (matches idea visibility)
CREATE POLICY "Authenticated users can read all attachments"
  ON public.idea_attachment FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- Users can insert attachments for ideas they own
CREATE POLICY "Users can insert own idea attachments"
  ON public.idea_attachment FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.idea
      WHERE id = idea_id
        AND user_id = (SELECT auth.uid())
    )
  );

-- Admins can delete attachments (cleanup)
CREATE POLICY "Admins can delete attachments"
  ON public.idea_attachment FOR DELETE
  USING ((SELECT public.is_admin()));
```

## Backward Compatibility Strategy

### Display Logic

```
When rendering idea detail page:
  1. Fetch idea_attachment records for this idea (ordered by upload_order)
  2. If records exist → display them as the attachment list
  3. Else if idea.attachment_url is set → display as a single legacy attachment:
     - original_file_name: extracted from storage path (last segment)
     - file_size: not available (display "—")
     - mime_type: inferred from file extension
     - download_url: generate signed URL from attachment_url
  4. Else → display "No attachments"
```

### Submission Logic

```
When creating a new idea:
  1. Do NOT write to idea.attachment_url (legacy field)
  2. Insert all files into idea_attachment table
  3. Idea row has attachment_url = NULL for new submissions
```

## Updated Shared Constants

```typescript
// src/lib/constants.ts (additions/changes)

/** Maximum file size in bytes (10 MB) — updated from 5 MB */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10,485,760 bytes

/** Maximum total attachment size in bytes (25 MB) */
export const MAX_TOTAL_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 26,214,400 bytes

/** Maximum number of file attachments per idea */
export const MAX_ATTACHMENTS = 5;

/** Allowed MIME types for idea attachments (expanded from 4 → 10) */
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
] as const;

/** Image MIME types (for thumbnail detection) */
export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

/** Human-readable labels for file types (for UI display) */
export const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/gif": "GIF",
  "image/webp": "WEBP",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "text/csv": "CSV",
};
```

## Updated Shared Types

```typescript
// src/types/index.ts (additions)

export interface IdeaAttachment {
  id: string;
  idea_id: string;
  original_file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  upload_order: number;
  created_at: string;
}
```

## Design Decisions (from skills audit)

| Decision | Rationale | Skill Reference |
| -------- | --------- | --------------- |
| `BIGINT` for file_size | Prefer BIGINT for integer values | postgresql-table-design: Core Rules |
| `TEXT` for all strings | Identical performance to VARCHAR(n) in PG; length via CHECK | postgresql-table-design: Data Types |
| `TIMESTAMPTZ` for created_at | Always timezone-aware | postgresql-table-design: Data Types |
| FK index on `idea_id` | PG doesn't auto-create FK indexes | postgresql-table-design: Gotchas |
| `gen_random_uuid()` for PK | Built-in PG 13+, no extension | postgresql-table-design: Data Types |
| `ON DELETE CASCADE` | Clean up attachments when idea is deleted | postgresql-table-design: Constraints |
| `UNIQUE` on storage_path | Prevent duplicate storage references | postgresql-table-design: Constraints |
| `CHECK` on file_size | DB-level defense in depth | postgresql-table-design: Constraints |
| Composite index (idea_id, upload_order) | Optimized ordered retrieval per idea | postgresql-table-design: Indexing |
| `(SELECT auth.uid())` wrapping in RLS | Per-query caching (100x+ faster) | supabase-postgres-best-practices |
| `is_admin()` SECURITY DEFINER helper | Avoids infinite recursion | supabase-postgres-best-practices |
| Subquery INSERT policy on idea_attachment | Verifies user owns the parent idea | supabase-postgres-best-practices |
