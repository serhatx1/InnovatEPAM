# API Contracts: Draft Idea Submissions

**Feature**: 3-draft-submissions
**Base path**: `/api`
**Auth**: All endpoints require a valid Supabase session cookie (`sb-<ref>-auth-token`).

---

## 1. POST /api/drafts (new)

Create a new draft idea with relaxed validation. All fields are optional.

### Request

- **Method**: POST
- **Auth**: Authenticated user (any role)
- **Content-Type**: `application/json`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | No | Max 100 characters; empty string allowed |
| description | string | No | Max 1000 characters; empty string allowed |
| category | string | No | Must be a valid `IDEA_CATEGORIES` value if provided |
| category_fields | object | No | JSON object; no validation on save |
| stagingSessionId | string | No | UUID of staging session for pre-draft file uploads |

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 201 | `Idea` (with status "draft") | Created successfully |
| 400 | `{ "error": "Validation failed", "details": {...} }` | Field exceeds max length |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 500 | `{ "error": string }` | Database error |

### Response body (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "",
  "description": "",
  "category": "",
  "category_fields": {},
  "status": "draft",
  "attachment_url": null,
  "evaluator_comment": null,
  "deleted_at": null,
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601",
  "attachments": []
}
```

### Staged file handling

If `stagingSessionId` is provided:
1. Files previously uploaded to `staging/{sessionId}/` are moved to permanent storage
2. `idea_attachment` records are created for each moved file
3. The response includes the `attachments` array with moved files

---

## 2. GET /api/drafts (new)

List all active (non-deleted) drafts for the authenticated user.

### Request

- **Method**: GET
- **Auth**: Authenticated user (any role)
- **Query params**: None

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `Idea[]` | Success (may be empty array) |
| 401 | `{ "error": "Unauthorized" }` | No valid session |

### Response body (200)

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "My Draft Idea",
    "description": "Partial description...",
    "category": "Technology Innovation",
    "category_fields": {},
    "status": "draft",
    "attachment_url": null,
    "evaluator_comment": null,
    "deleted_at": null,
    "created_at": "ISO 8601",
    "updated_at": "ISO 8601"
  }
]
```

**Ordering**: Results are sorted by `updated_at DESC` (most recently saved first).

**Filtering**: Excludes soft-deleted drafts (`deleted_at IS NULL`). Only returns drafts owned by the authenticated user.

---

## 3. GET /api/drafts/count (new)

Return the count of active (non-deleted) drafts for the authenticated user. Used for the navigation badge.

### Request

- **Method**: GET
- **Auth**: Authenticated user (any role)

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `{ "count": number }` | Success |
| 401 | `{ "error": "Unauthorized" }` | No valid session |

### Response body (200)

```json
{
  "count": 3
}
```

---

## 4. GET /api/drafts/[id] (new)

Get a single draft by ID. Only returns the draft if it is owned by the authenticated user, has status "draft", and is not soft-deleted.

### Request

- **Method**: GET
- **Auth**: Authenticated user (owner only)
- **Path params**: `id` — UUID of the draft idea

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `IdeaWithAttachments` (with status "draft") | Success |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 404 | `{ "error": "Draft not found" }` | Not found, not owned, not draft status, or soft-deleted |

### Response body (200)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "My Draft",
  "description": "Work in progress...",
  "category": "Cost Reduction",
  "category_fields": { "cost_area": "Infrastructure" },
  "status": "draft",
  "attachment_url": null,
  "evaluator_comment": null,
  "deleted_at": null,
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601",
  "signed_attachment_url": null,
  "attachments": [
    {
      "id": "uuid",
      "original_file_name": "budget.xlsx",
      "file_size": 524288,
      "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "upload_order": 1,
      "download_url": "https://..."
    }
  ]
}
```

---

## 5. PATCH /api/drafts/[id] (new)

Update an existing draft with new content. Relaxed validation — all fields optional.

### Request

- **Method**: PATCH
- **Auth**: Authenticated user (owner only)
- **Content-Type**: `application/json`
- **Path params**: `id` — UUID of the draft idea

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | No | Max 100 characters |
| description | string | No | Max 1000 characters |
| category | string | No | Must be valid category if provided |
| category_fields | object | No | JSON object |

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `Idea` (updated) | Updated successfully |
| 400 | `{ "error": "Validation failed", "details": {...} }` | Field exceeds max length |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 403 | `{ "error": "Only drafts can be edited" }` | Idea exists but is not a draft |
| 404 | `{ "error": "Draft not found" }` | Not found or not owned |
| 500 | `{ "error": string }` | Database error |

### Behavior

- Only fields provided in the request body are updated; omitted fields are unchanged.
- The `updated_at` timestamp is automatically refreshed by the existing database trigger.
- Auto-save calls this endpoint after debounce.

---

## 6. POST /api/drafts/[id]/submit (new)

Submit a completed draft as a formal idea. Runs full validation and transitions status from "draft" to "submitted".

### Request

- **Method**: POST
- **Auth**: Authenticated user (owner only)
- **Content-Type**: `application/json` (body may be empty; validation uses stored draft data)
- **Path params**: `id` — UUID of the draft idea

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `Idea` (with status "submitted") | Submitted successfully |
| 400 | `{ "error": "Validation failed", "details": {...} }` | Draft data fails full validation |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 403 | `{ "error": "Only drafts can be submitted" }` | Idea exists but is not a draft |
| 404 | `{ "error": "Draft not found" }` | Not found or not owned |
| 500 | `{ "error": string }` | Database error |

### Validation rules (same as normal idea submission)

| Field | Rule |
|-------|------|
| title | Required; 5–100 characters |
| description | Required; 20–1000 characters |
| category | Required; valid category value |
| category_fields | Required per category definition |

### Response body (400 — validation errors)

```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "title": ["Title must be between 5 and 100 characters"],
      "description": ["Description must be between 20 and 1000 characters"],
      "category": ["Invalid category"]
    },
    "formErrors": []
  }
}
```

---

## 7. DELETE /api/drafts/[id] (new)

Soft-delete a draft by setting the `deleted_at` timestamp. The draft row is retained in the database but excluded from all queries.

### Request

- **Method**: DELETE
- **Auth**: Authenticated user (owner only)
- **Path params**: `id` — UUID of the draft idea

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `{ "message": "Draft deleted" }` | Soft-deleted successfully |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 403 | `{ "error": "Only drafts can be deleted" }` | Idea exists but is not a draft |
| 404 | `{ "error": "Draft not found" }` | Not found or not owned |
| 500 | `{ "error": string }` | Database error |

### Behavior

- Sets `deleted_at = now()` on the idea row.
- Does NOT delete attachment files from storage (spec: "attachment files remain in storage").
- The draft disappears from all queries (RLS enforces `deleted_at IS NULL` on draft reads).

---

## 8. POST /api/drafts/staging/upload (new)

Upload a file to the temporary staging area before a draft record exists.

### Request

- **Method**: POST
- **Auth**: Authenticated user (any role)
- **Content-Type**: `multipart/form-data`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| file | File | Yes | ≤ 10 MB; accepted types (same as idea attachments) |
| sessionId | string | Yes | UUID identifying the staging session |

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 201 | `{ "storagePath": string, "originalFileName": string, "fileSize": number, "mimeType": string }` | Uploaded to staging |
| 400 | `{ "error": string }` | File validation failed (size, type, empty) |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 500 | `{ "error": string }` | Storage upload error |

---

## 9. GET /api/ideas (updated)

List all ideas for any authenticated user. **Now excludes draft-status ideas.**

### Change from previous behavior

Ideas with `status = 'draft'` are excluded from results. This is enforced at the database RLS level — the application query does not need to filter explicitly, but an application-level filter (`.neq("status", "draft")`) is added as defense-in-depth.

Soft-deleted ideas (`deleted_at IS NOT NULL`) are also excluded from results.

---

## 10. GET /api/ideas/[id] (updated)

Get a single idea by ID. **Now handles draft visibility.**

### Change from previous behavior

- If the idea is a draft and the requester is not the owner: returns 404 (enforced by RLS).
- If the idea is a draft and the requester is the owner: returns the idea (via the draft-owner RLS policy). However, the recommended pattern is to use GET /api/drafts/[id] instead.

---

## Type Definitions

### Updated IdeaStatus

```typescript
type IdeaStatus = "draft" | "submitted" | "under_review" | "accepted" | "rejected";
```

### Updated Idea

```typescript
interface Idea {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  category_fields: CategoryFieldValues;
  status: IdeaStatus;
  attachment_url: string | null;
  evaluator_comment: string | null;
  deleted_at: string | null;  // ★ new
  created_at: string;
  updated_at: string;
}
```
