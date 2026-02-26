# API Contracts: Blind Review (Anonymous Evaluation)

**Feature**: 7-blind-review
**Base path**: `/api`
**Auth**: All endpoints require a valid Supabase session.

---

## 1) GET /api/admin/settings/blind-review

Return the current blind review setting.

- **Role**: admin

### Response

| Status | Body | Condition |
| --- | --- | --- |
| 200 | `{ "enabled": true, "updatedBy": "uuid", "updatedAt": "ISO-8601" }` | Success |
| 200 | `{ "enabled": false, "updatedBy": null, "updatedAt": null }` | No setting row yet (default off) |
| 401 | `{ "error": "Unauthorized" }` | No session |
| 403 | `{ "error": "Forbidden" }` | Non-admin |

---

## 2) PUT /api/admin/settings/blind-review

Enable or disable blind review.

- **Role**: admin
- **Content-Type**: `application/json`

### Request body

```json
{
  "enabled": true
}
```

Validation:
- `enabled` must be a boolean

### Response

| Status | Body | Condition |
| --- | --- | --- |
| 200 | `{ "enabled": true, "updatedBy": "uuid", "updatedAt": "ISO-8601" }` | Success |
| 400 | `{ "error": "Validation failed", "details": [...] }` | Invalid input |
| 401 | `{ "error": "Unauthorized" }` | No session |
| 403 | `{ "error": "Forbidden" }` | Non-admin |

---

## 3) GET /api/ideas (modified)

Existing endpoint. When blind review is enabled, strip submitter identity from response for evaluator viewers.

### Behavior change

- **Evaluator + blind review ON + idea non-terminal**: Each idea in the array omits `user_id` (or sets to `"anonymous"`) and does not include submitter name/email.
- **Admin**: No change — full identity always visible.
- **Submitter**: No change — own identity always visible.

### Response shape (evaluator, blind review ON)

```json
[
  {
    "id": "uuid",
    "user_id": "anonymous",
    "title": "Innovative Widget",
    "description": "...",
    "category": "technology",
    "status": "under_review",
    "submitter_display_name": "Anonymous Submitter",
    ...
  }
]
```

For ideas with terminal outcome, full identity is included regardless.

---

## 4) GET /api/ideas/[id] (modified)

Existing endpoint. Same anonymization logic as the listing endpoint.

### Behavior change

- **Evaluator + blind review ON + idea non-terminal**: Strips `user_id`, submitter name, email from response.
- Returns `"submitter_display_name": "Anonymous Submitter"` in place of real name.

### Response shape (evaluator, blind review ON, non-terminal)

```json
{
  "id": "uuid",
  "user_id": "anonymous",
  "title": "Innovative Widget",
  "description": "...",
  "submitter_display_name": "Anonymous Submitter",
  "status": "under_review",
  ...
}
```

---

## 5) GET /api/admin/review/ideas/[id]/stage (modified)

Existing endpoint. No change to payload structure — evaluators already see full stage history here. Submitter identity is not part of this endpoint's response (it returns stage/event data, not idea author data).

No modification needed.

---

## 6) POST /api/admin/review/ideas/[id]/transition (no change)

Existing endpoint. Stage transitions are unaffected by blind review. Anonymization is a display concern only (FR-010).

No modification needed.

---

## Anonymization Decision Logic (Shared)

Applied by a reusable helper function at the API response layer:

```
function shouldAnonymize(viewerRole, viewerId, ideaUserId, terminalOutcome, blindReviewEnabled):
  if NOT blindReviewEnabled → return false
  if viewerRole === "admin" → return false
  if viewerId === ideaUserId → return false
  if terminalOutcome IS NOT NULL → return false
  return true
```

When `shouldAnonymize` returns `true`:
- Replace `user_id` with `"anonymous"`
- Replace submitter display name with `"Anonymous Submitter"`
- Omit submitter email from response
- Omit submitter avatar/profile image from response
