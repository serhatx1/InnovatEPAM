# API Contracts: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Created**: 2026-02-24

All endpoints require authentication unless marked otherwise.
Errors follow a consistent shape: `{ "error": "string", "details"?: object }`.

---

## POST /api/ideas

Create a new idea with optional file attachment.

**Auth**: Required (any authenticated user)
**Content-Type**: multipart/form-data

### Request

| Field       | Type   | Required | Constraints                          |
| ----------- | ------ | -------- | ------------------------------------ |
| title       | string | Yes      | 5–100 characters                     |
| description | string | Yes      | 20–1000 characters                   |
| category    | string | Yes      | One of IDEA_CATEGORIES               |
| file        | File   | No       | Max 5 MB; PDF, PNG, JPG, or DOCX     |

### Responses

| Status | Body                              | Condition                         |
| ------ | --------------------------------- | --------------------------------- |
| 201    | `Idea` object                     | Idea created successfully         |
| 400    | `{ error, details }`             | Validation failed                 |
| 401    | `{ error: "Unauthorized" }`      | Not authenticated                 |
| 500    | `{ error: "..." }`              | Upload or DB error                |

### Example Response (201)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "AI-Powered Onboarding",
  "description": "Use large language models to automate new-hire onboarding documentation...",
  "category": "Technology Innovation",
  "status": "submitted",
  "attachment_url": "550e8400.../1708800000-proposal.pdf",
  "evaluator_comment": null,
  "created_at": "2026-02-24T10:00:00.000Z",
  "updated_at": "2026-02-24T10:00:00.000Z"
}
```

---

## GET /api/ideas

List all ideas for the authenticated user.

**Auth**: Required (any authenticated user)

### Responses

| Status | Body                              | Condition                         |
| ------ | --------------------------------- | --------------------------------- |
| 200    | `Idea[]`                          | Array of ideas, newest first      |
| 401    | `{ error: "Unauthorized" }`      | Not authenticated                 |
| 500    | `{ error: "..." }`              | DB error                          |

---

## GET /api/ideas/:id

Get a single idea with signed attachment URL.

**Auth**: Required (any authenticated user)

### Path Parameters

| Param | Type   | Description       |
| ----- | ------ | ----------------- |
| id    | string | Idea UUID         |

### Responses

| Status | Body                                      | Condition                     |
| ------ | ----------------------------------------- | ----------------------------- |
| 200    | `Idea & { signed_attachment_url: string | null }` | Idea found          |
| 401    | `{ error: "Unauthorized" }`              | Not authenticated             |
| 404    | `{ error: "Idea not found" }`            | No idea with this ID          |

---

## PATCH /api/admin/ideas/:id/status

Update an idea's status (admin only).

**Auth**: Required (admin role only)
**Content-Type**: application/json

### Path Parameters

| Param | Type   | Description       |
| ----- | ------ | ----------------- |
| id    | string | Idea UUID         |

### Request Body

| Field            | Type   | Required | Constraints                                                |
| ---------------- | ------ | -------- | ---------------------------------------------------------- |
| status           | string | Yes      | One of: "under_review", "accepted", "rejected"             |
| evaluatorComment | string | Conditional | Required (min 10 chars) when status = "rejected"; optional otherwise |

### Status Transition Rules

| Current Status | Allowed Next Status                    |
| -------------- | -------------------------------------- |
| submitted      | under_review, accepted, rejected       |
| under_review   | accepted, rejected                      |
| accepted       | (none — terminal)                      |
| rejected       | (none — terminal)                      |

### Responses

| Status | Body                                      | Condition                             |
| ------ | ----------------------------------------- | ------------------------------------- |
| 200    | `Idea` object (updated)                  | Status updated successfully           |
| 400    | `{ error: "..." }`                       | Invalid status, invalid transition, or missing rejection comment |
| 401    | `{ error: "Unauthorized" }`              | Not authenticated                     |
| 403    | `{ error: "Forbidden: admin role required" }` | User is not an admin            |
| 404    | `{ error: "Idea not found" }`            | No idea with this ID                  |
| 500    | `{ error: "..." }`                       | DB error                              |

### Example Request

```json
{
  "status": "rejected",
  "evaluatorComment": "This idea doesn't align with our Q3 priorities. Please resubmit with updated scope."
}
```

### Example Response (200)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "AI-Powered Onboarding",
  "description": "...",
  "category": "Technology Innovation",
  "status": "rejected",
  "attachment_url": null,
  "evaluator_comment": "This idea doesn't align with our Q3 priorities. Please resubmit with updated scope.",
  "created_at": "2026-02-24T10:00:00.000Z",
  "updated_at": "2026-02-24T11:30:00.000Z"
}
```

---

## Type Definitions

### Idea

```typescript
interface Idea {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: "submitted" | "under_review" | "accepted" | "rejected";
  attachment_url: string | null;
  evaluator_comment: string | null;
  created_at: string;
  updated_at: string;
}
```

### UserProfile

```typescript
interface UserProfile {
  id: string;
  email: string;
  role: "submitter" | "admin";
  created_at: string;
}
```
