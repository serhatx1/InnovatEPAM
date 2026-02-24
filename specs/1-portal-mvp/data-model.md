# Data Model: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Created**: 2026-02-24

## Entity Relationship Diagram

```
┌────────────────┐       ┌──────────────────────┐
│  user_profile  │       │        idea          │
├────────────────┤       ├──────────────────────┤
│ id (PK, FK→    │──1:N──│ id (PK)              │
│   auth.users)  │       │ user_id (FK→         │
│ email          │       │   user_profile.id)    │
│ role           │       │ title                │
│ created_at     │       │ description          │
└────────────────┘       │ category             │
                         │ status               │
                         │ attachment_url       │
                         │ evaluator_comment    │
                         │ created_at           │
                         │ updated_at           │
                         └──────────────────────┘
```

> Note: The existing schema stores evaluator_comment directly on the idea table rather than
> in a separate evaluations/reviews table. This is acceptable for the MVP (single evaluation
> per idea, no re-evaluation). The spec's "Admin Review / Evaluation" entity maps to the
> evaluator_comment + status fields on the idea row, not a separate table.

## Entities

### user_profile

| Column     | Type        | Constraints                                      | Notes                        |
| ---------- | ----------- | ------------------------------------------------ | ---------------------------- |
| id         | UUID (PK)   | REFERENCES auth.users(id) ON DELETE CASCADE       | From Supabase Auth           |
| email      | TEXT        | NOT NULL                                          | Copied from auth.users       |
| role       | TEXT        | NOT NULL DEFAULT 'submitter' CHECK IN ('submitter', 'admin') | Two roles only    |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now()                            |                              |

**Trigger**: `on_auth_user_created` auto-inserts a profile row with role='submitter' on signup.

### idea

| Column            | Type        | Constraints                                                  | Notes                                    |
| ----------------- | ----------- | ------------------------------------------------------------ | ---------------------------------------- |
| id                | UUID (PK)   | DEFAULT uuid_generate_v4()                                    |                                          |
| user_id           | UUID (FK)   | NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE        | The submitter                            |
| title             | TEXT        | NOT NULL                                                      | 5–100 chars (enforced in app validation) |
| description       | TEXT        | NOT NULL                                                      | 20–1000 chars (enforced in app validation) |
| category          | TEXT        | NOT NULL                                                      | From IDEA_CATEGORIES constant            |
| status            | TEXT        | NOT NULL DEFAULT 'submitted' CHECK IN ('submitted', 'under_review', 'accepted', 'rejected') |              |
| attachment_url    | TEXT        | NULLABLE                                                      | Storage path (not full URL)              |
| evaluator_comment | TEXT        | NULLABLE                                                      | min 10 chars when status=rejected        |
| created_at        | TIMESTAMPTZ | NOT NULL DEFAULT now()                                        |                                          |
| updated_at        | TIMESTAMPTZ | NOT NULL DEFAULT now()                                        | Auto-updated via trigger                 |

**Trigger**: `idea_updated_at` auto-sets `updated_at = now()` on UPDATE.

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

### user_profile

| Policy                      | Operation | Rule                              |
| --------------------------- | --------- | --------------------------------- |
| Users can read own profile  | SELECT    | auth.uid() = id                   |
| Users can insert own profile| INSERT    | auth.uid() = id                   |
| Admins can read all profiles| SELECT    | user role = 'admin'               |

### idea

| Policy                                | Operation | Rule                              |
| ------------------------------------- | --------- | --------------------------------- |
| **Authenticated users can read all ideas** | SELECT | auth.role() = 'authenticated' |
| Users can insert own ideas            | INSERT    | auth.uid() = user_id              |
| Admins can update all ideas           | UPDATE    | user role = 'admin'               |

> **Change from current state**: Replace `"Users can read own ideas"` and `"Admins can read all ideas"` with a single `"Authenticated users can read all ideas"` policy to satisfy FR-17.

### storage.objects (idea-attachments bucket)

| Policy                      | Operation | Rule                              |
| --------------------------- | --------- | --------------------------------- |
| Users can upload attachments| INSERT    | bucket = 'idea-attachments' AND authenticated |
| Users can read attachments  | SELECT    | bucket = 'idea-attachments' AND authenticated |

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
