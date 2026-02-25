# API Contracts: Multi-Media Support

**Feature**: 2-multi-media-support
**Base path**: `/api`
**Auth**: All endpoints require a valid Supabase session cookie (`sb-<ref>-auth-token`).

---

## 1. POST /api/ideas (updated)

Create a new idea with optional multiple file attachments.

### Request

- **Method**: POST
- **Auth**: Authenticated user (any role)
- **Content-Type**: `multipart/form-data`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | Yes | 5–100 characters |
| description | string | Yes | 20–1000 characters |
| category | string | Yes | One of `IDEA_CATEGORIES` |
| category_fields | string (JSON) | No | Valid JSON object matching category field definitions |
| files | File[] | No | 0–5 files; each ≤ 10 MB; total ≤ 25 MB; accepted types: PDF, PNG, JPG, JPEG, GIF, WEBP, DOCX, XLSX, PPTX, CSV |

> **Change from MVP**: The `file` field (singular, single file) is replaced by `files` (plural, multiple files via `formData.getAll("files")`). The `attachment_url` field is no longer written for new ideas.

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 201 | `IdeaWithAttachments` | Created successfully |
| 400 | `{ "error": "Validation failed", "details": {...} }` | Invalid input fields |
| 400 | `{ "error": "Maximum 5 files allowed" }` | Too many files |
| 400 | `{ "error": "File must not exceed 10 MB", "file": "<name>" }` | Individual file too large |
| 400 | `{ "error": "Total attachment size must not exceed 25 MB" }` | Combined size too large |
| 400 | `{ "error": "File is empty", "file": "<name>" }` | Zero-byte file |
| 400 | `{ "error": "Accepted formats: PDF, PNG, JPG, GIF, WEBP, DOCX, XLSX, PPTX, CSV", "file": "<name>" }` | Invalid file type |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 500 | `{ "error": string }` | Upload or database error (atomic rollback performed) |

### Response body (201)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "string",
  "description": "string",
  "category": "string",
  "category_fields": {},
  "status": "submitted",
  "attachment_url": null,
  "evaluator_comment": null,
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601",
  "attachments": [
    {
      "id": "uuid",
      "idea_id": "uuid",
      "original_file_name": "diagram.png",
      "file_size": 245760,
      "mime_type": "image/png",
      "storage_path": "user-uuid/1234567890-diagram.png",
      "upload_order": 1,
      "created_at": "ISO 8601"
    }
  ]
}
```

### Atomic behavior

If any file upload fails:
1. All already-uploaded files are deleted from storage
2. No idea row or attachment records are created
3. A 500 error is returned

If the DB insert fails after successful uploads:
1. All uploaded files are deleted from storage
2. A 500 error is returned

---

## 2. GET /api/ideas (updated)

List all ideas for any authenticated user. Now includes attachment count.

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
    "category": "string",
    "category_fields": {},
    "status": "submitted | under_review | accepted | rejected",
    "attachment_url": "string | null",
    "evaluator_comment": "string | null",
    "created_at": "ISO 8601",
    "updated_at": "ISO 8601",
    "attachment_count": 3
  }
]
```

> **Change from MVP**: Added `attachment_count` field (integer). For legacy ideas with `attachment_url` but no `idea_attachment` records, `attachment_count` is 1. For new ideas, it reflects the count from `idea_attachment`.

---

## 3. GET /api/ideas/[id] (updated)

Get a single idea by ID with full attachment details.

### Request

- **Method**: GET
- **Auth**: Authenticated user (any role)
- **Path params**: `id` (UUID)

### Response

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `IdeaWithAttachments` | Found |
| 401 | `{ "error": "Unauthorized" }` | No valid session |
| 404 | `{ "error": "Idea not found" }` | No idea with given ID |

### Response body (200) — new idea with multiple attachments

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "string",
  "description": "string",
  "category": "string",
  "category_fields": {},
  "status": "string",
  "attachment_url": null,
  "evaluator_comment": "string | null",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601",
  "signed_attachment_url": null,
  "attachments": [
    {
      "id": "uuid",
      "original_file_name": "business-case.pdf",
      "file_size": 1048576,
      "mime_type": "application/pdf",
      "upload_order": 1,
      "download_url": "https://...signed-url..."
    },
    {
      "id": "uuid",
      "original_file_name": "mockup.png",
      "file_size": 524288,
      "mime_type": "image/png",
      "upload_order": 2,
      "download_url": "https://...signed-url..."
    }
  ]
}
```

### Response body (200) — legacy idea with single attachment

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "string",
  "description": "string",
  "category": "string",
  "category_fields": {},
  "status": "string",
  "attachment_url": "user-uuid/1234567890-file.pdf",
  "evaluator_comment": "string | null",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601",
  "signed_attachment_url": "https://...signed-url...",
  "attachments": [
    {
      "id": null,
      "original_file_name": "file.pdf",
      "file_size": null,
      "mime_type": "application/pdf",
      "upload_order": 1,
      "download_url": "https://...signed-url..."
    }
  ]
}
```

> **Backward compatibility**: Legacy ideas (with `attachment_url` but no `idea_attachment` records) have their single attachment represented in the `attachments[]` array with `id: null` and `file_size: null`. The `signed_attachment_url` field is also still present for legacy consumers. New ideas have `attachment_url: null` and `signed_attachment_url: null`.

---

## 4. PATCH /api/admin/ideas/[id]/status (unchanged)

No changes to the admin status endpoint. This feature does not affect the evaluation workflow.

---

## Shared Types (updated)

```typescript
// src/types/index.ts

type IdeaStatus = "submitted" | "under_review" | "accepted" | "rejected";

interface Idea {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  category_fields: Record<string, string | number>;
  status: IdeaStatus;
  attachment_url: string | null;       // Legacy — null for new ideas
  evaluator_comment: string | null;
  created_at: string;
  updated_at: string;
}

interface IdeaAttachment {
  id: string;
  idea_id: string;
  original_file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  upload_order: number;
  created_at: string;
}

/** Attachment as returned in API responses (signed download URL, no storage_path) */
interface AttachmentResponse {
  id: string | null;                   // null for legacy attachments
  original_file_name: string;
  file_size: number | null;            // null for legacy attachments
  mime_type: string;
  upload_order: number;
  download_url: string;
}

interface IdeaWithAttachments extends Idea {
  signed_attachment_url: string | null; // Legacy — retained for backward compat
  attachments: AttachmentResponse[];
}

interface UserProfile {
  id: string;
  email: string;
  role: "submitter" | "admin";
  created_at: string;
}
```
