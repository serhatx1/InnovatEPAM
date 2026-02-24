# Data Model: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Created**: 2026-02-24
**Schema version**: v2 (redesigned per supabase-postgres-best-practices & postgresql-table-design skills)

## Entity Relationship Diagram

```
┌────────────────┐       ┌──────────────────────┐
│  user_profile  │       │        idea          │
├────────────────┤       ├──────────────────────┤
│ id (PK, FK→    │──1:N──│ id (PK)              │
│   auth.users)  │       │ user_id (FK→         │
│ email (UNIQUE) │       │   user_profile.id)    │
│ role           │       │ title                │
│ created_at     │       │ description          │
└────────────────┘       │ category (CHECK)     │
                         │ status  (CHECK)      │
                         │ attachment_url       │
                         │ evaluator_comment    │
                         │ created_at           │
                         │ updated_at           │
                         └──────────────────────┘
                         Indexes:
                           idx_idea_user_id (FK)
                           idx_idea_status
                           idx_idea_created_at DESC
                           idx_idea_pending_review (partial)
```

> Note: The schema stores evaluator_comment directly on the idea table rather than
> in a separate evaluations/reviews table. This is acceptable for the MVP (single evaluation
> per idea, no re-evaluation). The spec's "Admin Review / Evaluation" entity maps to the
> evaluator_comment + status fields on the idea row, not a separate table.

## Helper Functions

### is_admin()

A `SECURITY DEFINER` function that checks whether the current user has `role = 'admin'` in `user_profile`.
Bypasses RLS to avoid infinite recursion when `user_profile` policies reference `user_profile` itself.
Uses `(SELECT auth.uid())` for per-query caching and `SET search_path = ''` for security hardening.

## Entities

### user_profile

| Column     | Type        | Constraints                                      | Notes                        |
| ---------- | ----------- | ------------------------------------------------ | ---------------------------- |
| id         | UUID (PK)   | REFERENCES auth.users(id) ON DELETE CASCADE       | From Supabase Auth           |
| email      | TEXT        | NOT NULL UNIQUE                                   | Copied from auth.users; UNIQUE enforces data integrity |
| role       | TEXT        | NOT NULL DEFAULT 'submitter' CHECK IN ('submitter', 'admin') | Two roles only    |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now()                            |                              |

**Trigger**: `on_auth_user_created` auto-inserts a profile row with role='submitter' on signup (`SECURITY DEFINER`, `search_path = ''`).

### idea

| Column            | Type        | Constraints                                                  | Notes                                    |
| ----------------- | ----------- | ------------------------------------------------------------ | ---------------------------------------- |
| id                | UUID (PK)   | DEFAULT gen_random_uuid()                                     | Built-in PG 13+, no extension needed     |
| user_id           | UUID (FK)   | NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE        | The submitter; **indexed** (idx_idea_user_id) |
| title             | TEXT        | NOT NULL                                                      | 5–100 chars (enforced in app validation) |
| description       | TEXT        | NOT NULL                                                      | 20–1000 chars (enforced in app validation) |
| category          | TEXT        | NOT NULL CHECK IN (5 categories)                              | DB-level guard matching `IDEA_CATEGORIES` constant |
| status            | TEXT        | NOT NULL DEFAULT 'submitted' CHECK IN ('submitted', 'under_review', 'accepted', 'rejected') |              |
| attachment_url    | TEXT        | NULLABLE                                                      | Storage path (not full URL)              |
| evaluator_comment | TEXT        | NULLABLE                                                      | min 10 chars when status=rejected (app)  |
| created_at        | TIMESTAMPTZ | NOT NULL DEFAULT now()                                        |                                          |
| updated_at        | TIMESTAMPTZ | NOT NULL DEFAULT now()                                        | Auto-updated via trigger                 |

**Trigger**: `idea_updated_at` auto-sets `updated_at = now()` on UPDATE.

### Indexes on idea

| Index                    | Columns                         | Type    | Why                                                |
| ------------------------ | ------------------------------- | ------- | -------------------------------------------------- |
| idx_idea_user_id         | user_id                         | B-tree  | FK index — PG doesn't auto-create; 10-100x faster JOINs/CASCADEs |
| idx_idea_status          | status                          | B-tree  | Admin review filtering by status                   |
| idx_idea_created_at      | created_at DESC                 | B-tree  | Listing pages with ORDER BY                        |
| idx_idea_pending_review  | (status, created_at DESC) WHERE status IN ('submitted','under_review') | Partial | Optimized admin review queue |

## Validation Rules

### Idea Submission (ideaSchema)

| Field       | Rule                         | Error Message                            |
| ----------- | ---------------------------- | ---------------------------------------- |
| title       | Required, 5–100 characters   | "Title must be between 5 and 100 characters" |
| description | Required, 20–1000 characters | "Description must be between 20 and 1000 characters" |
| category    | Required, from IDEA_CATEGORIES enum | "Invalid category"               |

### File Attachment (fileSchema)

| Field     | Rule                                           | Error Message                            |
| --------- | ---------------------------------------------- | ---------------------------------------- |
| size      | ≤ 5,242,880 bytes (5 MB)                       | "File must not exceed 5 MB"              |
| type      | One of: application/pdf, image/png, image/jpeg, application/vnd.openxmlformats-officedocument.wordprocessingml.document | "Accepted formats: PDF, PNG, JPG, DOCX" |

### Status Update (statusUpdateSchema)

| Field            | Rule                                               | Error Message                            |
| ---------------- | -------------------------------------------------- | ---------------------------------------- |
| status           | One of: under_review, accepted, rejected           | "Invalid status"                         |
| evaluatorComment | Required (min 10 chars) when status = "rejected"   | "Rejection comment must be at least 10 characters" |
| evaluatorComment | Optional when status ≠ "rejected"                  | —                                        |

## State Machine: Idea Status

```
                    ┌─────────────────┐
                    │    submitted    │
                    └────┬──────┬─────┘
                         │      │
          "Start Review" │      │ "Accept" / "Reject"
                         │      │  (direct evaluation)
                         ▼      │
                  ┌──────────┐  │
                  │  under   │  │
                  │  review  │  │
                  └──┬───┬───┘  │
                     │   │      │
          "Accept"   │   │      │
                     │   │ "Reject"
                     ▼   ▼      ▼
              ┌──────────┐  ┌──────────┐
              │ accepted │  │ rejected │
              └──────────┘  └──────────┘
```

**Valid transitions**:
| From         | To           | Trigger              |
| ------------ | ------------ | -------------------- |
| submitted    | under_review | Admin clicks "Start Review" |
| submitted    | accepted     | Admin clicks "Accept" (direct) |
| submitted    | rejected     | Admin clicks "Reject" (direct, requires comment) |
| under_review | accepted     | Admin clicks "Accept" |
| under_review | rejected     | Admin clicks "Reject" (requires comment) |

**Terminal states**: accepted, rejected (no further transitions).

## Row-Level Security (RLS) Policies

All policies use `(SELECT auth.uid())` / `(SELECT auth.role())` wrapping for per-query caching (100x+ faster on large tables per `security-rls-performance` rule). Admin checks use the `is_admin()` SECURITY DEFINER helper to avoid infinite recursion.

### user_profile

| Policy                      | Operation | Rule                              | Implementation                        |
| --------------------------- | --------- | --------------------------------- | ------------------------------------- |
| Users can read own profile  | SELECT    | Current user's own row            | `(SELECT auth.uid()) = id`            |
| Users can insert own profile| INSERT    | Current user's own row            | `(SELECT auth.uid()) = id`            |
| Admins can read all profiles| SELECT    | User is admin                     | `(SELECT public.is_admin())`          |

### idea

| Policy                                | Operation | Rule                              | Implementation                        |
| ------------------------------------- | --------- | --------------------------------- | ------------------------------------- |
| Authenticated users can read all ideas | SELECT   | Any authenticated user            | `(SELECT auth.role()) = 'authenticated'` |
| Users can insert own ideas            | INSERT    | Owner match                       | `(SELECT auth.uid()) = user_id`       |
| Admins can update all ideas           | UPDATE    | User is admin                     | `(SELECT public.is_admin())`          |

### storage.objects (idea-attachments bucket)

| Policy                      | Operation | Rule                              | Implementation                        |
| --------------------------- | --------- | --------------------------------- | ------------------------------------- |
| Users can upload attachments| INSERT    | Authenticated + correct bucket    | `bucket_id = 'idea-attachments' AND (SELECT auth.role()) = 'authenticated'` |
| Users can read attachments  | SELECT    | Authenticated + correct bucket    | `bucket_id = 'idea-attachments' AND (SELECT auth.role()) = 'authenticated'` |

## Design Decisions (from skills audit)

| Decision | Rationale | Skill Reference |
| -------- | --------- | --------------- |
| `is_admin()` SECURITY DEFINER helper | Avoids infinite recursion when `user_profile` policies query `user_profile` | security-rls-basics |
| `(SELECT auth.uid())` wrapping | Caches function result per query instead of per row (100x+ faster) | security-rls-performance |
| `SET search_path = ''` on SECURITY DEFINER | Prevents search-path injection attacks | security-privileges |
| FK index on `idea.user_id` | PG does NOT auto-create FK indexes; 10-100x faster JOINs/CASCADEs | schema-foreign-key-indexes |
| `UNIQUE` on `user_profile.email` | Data integrity — prevents duplicate profiles | schema-constraints |
| `CHECK` on `idea.category` | DB-level guard matching app constants (defense in depth) | schema-constraints |
| `gen_random_uuid()` over `uuid_generate_v4()` | Built-in since PG 13, no extension needed | schema-primary-keys |
| `TEXT` over `VARCHAR(n)` | Identical performance in PG; length enforced in app via Zod | schema-data-types |
| `TIMESTAMPTZ` over `TIMESTAMP` | Always store timezone-aware timestamps | schema-data-types |
| Partial composite index for pending review | Smaller, faster index for admin review queue | query-partial-indexes |
| `STABLE` on `is_admin()` | Tells planner result doesn't change within a statement | query performance |

## Shared Constants

```typescript
// src/lib/constants.ts
export const IDEA_CATEGORIES = [
  "Process Improvement",
  "Technology Innovation",
  "Cost Reduction",
  "Customer Experience",
  "Employee Engagement",
] as const;

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ["under_review", "accepted", "rejected"],
  under_review: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};
```
