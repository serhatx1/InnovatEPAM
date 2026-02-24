# API Contracts: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Base path**: `/api`
**Auth**: All endpoints require a valid Supabase session cookie (`sb-<ref>-auth-token`).

---

## 1. GET /api/ideas

List all ideas for any authenticated user.

### Request

- **Method**: GET
- **Auth**: Authenticated user (any role)
- **Query params**: None

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `Idea[]` | Success |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 500 | `{ "error": string }` | Database error |

### Response body (200)

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "string",
    "description": "string",
    "category": "Process Improvement | Technology Innovation | Cost Reduction | Customer Experience | Employee Engagement",
    "status": "submitted | under_review | accepted | rejected",
    "attachment_url": "string | null",
    "evaluator_comment": "string | null",
    "created_at": "ISO 8601",
    "updated_at": "ISO 8601"
  }
]
```

---

## 2. POST /api/ideas

Create a new idea with optional file attachment.

### Request

- **Method**: POST
- **Auth**: Authenticated user (any role)
- **Content-Type**: `multipart/form-data`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | Yes | 5–100 characters |
| description | string | Yes | 20–1000 characters |
| category | string | Yes | One of `IDEA_CATEGORIES` |
| file | File | No | Max 5 MB; PDF, PNG, JPG, or DOCX |

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 201 | `Idea` | Created successfully |
| 400 | `{ "error": "Validation failed", "details": {...} }` | Invalid input fields |
| 400 | `{ "error": "File must not exceed 5 MB" }` | File too large |
| 400 | `{ "error": "Accepted formats: PDF, PNG, JPG, DOCX" }` | Invalid file type |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 500 | `{ "error": string }` | Upload or database error |

---

## 3. GET /api/ideas/[id]

Get a single idea by ID. Any authenticated user can view any idea.

### Request

- **Method**: GET
- **Auth**: Authenticated user (any role)
- **Path params**: `id` (UUID)

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `Idea & { signed_attachment_url: string \| null }` | Found |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 404 | `{ "error": "Idea not found" }` | No idea with given ID |

### Response body (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "string",
  "description": "string",
  "category": "string",
  "status": "string",
  "attachment_url": "string | null",
  "evaluator_comment": "string | null",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601",
  "signed_attachment_url": "string | null"
}
```

---

## 4. PATCH /api/admin/ideas/[id]/status

Update idea status (admin only). Enforces valid status transitions and conditional rejection comment.

### Request

- **Method**: PATCH
- **Auth**: Authenticated user with `admin` role
- **Path params**: `id` (UUID)
- **Content-Type**: `application/json`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| status | string | Yes | One of: `under_review`, `accepted`, `rejected` |
| evaluatorComment | string | Conditional | Required (≥10 chars) when `status = "rejected"` |

### Request body example (approve)

```json
{
  "status": "accepted"
}
```

### Request body example (reject)

```json
{
  "status": "rejected",
  "evaluatorComment": "This proposal does not align with current priorities."
}
```

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `Idea` | Updated successfully |
| 400 | `{ "error": "Rejection comment must be at least 10 characters" }` | Missing/short rejection comment |
| 400 | `{ "error": "Invalid transition from '<from>' to '<to>'" }` | Invalid status transition |
| 400 | `{ "error": string }` | Other validation error |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 403 | `{ "error": "Forbidden: admin role required" }` | Non-admin user |
| 404 | `{ "error": "Idea not found" }` | No idea with given ID |
| 500 | `{ "error": string }` | Database error |

### Valid Status Transitions

| From | To |
|------|----|
| submitted | under_review, accepted, rejected |
| under_review | accepted, rejected |
| accepted | _(terminal — no transitions)_ |
| rejected | _(terminal — no transitions)_ |

---

## Shared Types

```typescript
// src/types/index.ts

type IdeaStatus = "submitted" | "under_review" | "accepted" | "rejected";

interface Idea {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: IdeaStatus;
  attachment_url: string | null;
  evaluator_comment: string | null;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  role: "submitter" | "admin";
  created_at: string;
}
```

---

## Test Requirements

### Unit Tests (mocked Supabase client)

| Area | File | Key assertions |
|------|------|----------------|
| ideaSchema validation | `tests/unit/validation.test.ts` | Title 5–100, description 20–1000, valid category enum, invalid inputs rejected |
| File validation | `tests/unit/validation.test.ts` | Max 5 MB, allowed MIME types only |
| statusUpdateSchema | `tests/unit/validation.test.ts` | Conditional rejection comment ≥10 chars |
| Status transitions | `tests/unit/status-transitions.test.ts` | All valid transitions accepted, invalid transitions rejected |
| Constants | `tests/unit/constants.test.ts` | IDEA_CATEGORIES (5), MAX_FILE_SIZE, ALLOWED_FILE_TYPES, VALID_TRANSITIONS |
| Query functions | `tests/unit/queries-ideas.test.ts` | listIdeas, getIdeaById, createIdea, updateIdeaStatus |
| Profile queries | `tests/unit/queries-profiles.test.ts` | getUserRole returns role or null |
| Storage helpers | `tests/unit/storage.test.ts` | uploadIdeaAttachment path, getAttachmentUrl signed URL |

### Integration Tests

| Area | File | Key assertions |
|------|------|----------------|
| Supabase connection | `tests/integration/supabase.test.ts` | Client creation, health check |
| API smoke | `tests/integration/api-smoke.test.ts` | GET /api/ideas returns 401 without auth |
