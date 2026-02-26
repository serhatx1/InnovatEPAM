# API Contracts: Multi-Stage Review Workflow

**Feature**: 6-multi-stage-review
**Base path**: `/api`
**Auth**: All endpoints require a valid Supabase session.

---

## 1) GET /api/admin/review/workflow

Return active workflow definition (with ordered stages).

- **Role**: admin

### Response

| Status | Body | Condition |
| --- | --- | --- |
| 200 | Active workflow payload | Success |
| 401 | `{ "error": "Unauthorized" }` | No session |
| 403 | `{ "error": "Forbidden" }` | Non-admin |
| 404 | `{ "error": "No active workflow" }` | Not configured |

---

## 2) PUT /api/admin/review/workflow

Create/activate a new workflow version with ordered stages.

- **Role**: admin
- **Content-Type**: `application/json`

### Request body

```json
{
  "stages": [
    { "name": "Initial Screening" },
    { "name": "Technical Review" },
    { "name": "Final Decision" }
  ]
}
```

Validation:
- 3..7 stages
- unique, non-empty names
- sequential order as provided

### Response

| Status | Body | Condition |
| --- | --- | --- |
| 200 | Activated workflow payload (with version) | Success |
| 400 | `{ "error": "Validation failed", "details": ... }` | Invalid stages |
| 401 | `{ "error": "Unauthorized" }` | No session |
| 403 | `{ "error": "Forbidden" }` | Non-admin |

---

## 3) GET /api/admin/review/ideas/[id]/stage

Get full stage state and history for admin/evaluator review tooling.

- **Role**: admin or evaluator

### Response

| Status | Body | Condition |
| --- | --- | --- |
| 200 | Full stage state + event list | Success |
| 401 | `{ "error": "Unauthorized" }` | No session |
| 403 | `{ "error": "Forbidden" }` | Insufficient role |
| 404 | `{ "error": "Idea not found" }` | Missing idea/state |

---

## 4) POST /api/admin/review/ideas/[id]/transition

Apply evaluator/admin stage action with optimistic concurrency.

- **Role**: admin or evaluator
- **Content-Type**: `application/json`

### Request body

```json
{
  "action": "advance",
  "expectedStateVersion": 3,
  "comment": "Meets stage criteria"
}
```

Allowed action values:
- `advance`
- `return`
- `hold`
- `terminal_accept`
- `terminal_reject`

### Response

| Status | Body | Condition |
| --- | --- | --- |
| 200 | Updated stage state | Success |
| 400 | `{ "error": "Invalid transition" }` | Rule violation |
| 401 | `{ "error": "Unauthorized" }` | No session |
| 403 | `{ "error": "Forbidden" }` | Insufficient role |
| 404 | `{ "error": "Idea not found" }` | Missing idea/state |
| 409 | `{ "error": "Conflict", "message": "State changed, refresh and retry" }` | Stale `expectedStateVersion` |

---

## 5) GET /api/ideas/[id]/review-progress

Submitter-facing review progress endpoint with visibility filtering.

- **Role**: idea owner (submitter), admin, evaluator

### Response (submitter, non-terminal)

```json
{
  "ideaId": "uuid",
  "currentStage": "Technical Review",
  "currentStageUpdatedAt": "2026-02-26T12:00:00.000Z",
  "events": [
    {
      "toStage": "Initial Screening",
      "occurredAt": "2026-02-26T11:00:00.000Z"
    }
  ]
}
```

Visibility rules:
- Submitter during non-terminal review: no actor identity, no evaluator comment.
- Admin/evaluator: full fields available.

### Response codes

| Status | Body | Condition |
| --- | --- | --- |
| 200 | Role-shaped payload | Success |
| 401 | `{ "error": "Unauthorized" }` | No session |
| 403 | `{ "error": "Forbidden" }` | Not owner and not reviewer/admin |
| 404 | `{ "error": "Idea not found" }` | Missing idea/state |
