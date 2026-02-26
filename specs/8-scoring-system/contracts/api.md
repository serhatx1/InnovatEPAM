# API Contracts: Scoring System (1–5 Ratings)

**Feature**: 8-scoring-system
**Base path**: `/api`
**Auth**: All endpoints require a valid Supabase session.

---

## 1) PUT /api/ideas/[id]/score

Submit or update the authenticated evaluator's score for an idea.

- **Role**: admin (evaluator)
- **Content-Type**: `application/json`

### Request body

```json
{
  "score": 4,
  "comment": "Strong idea with clear ROI"
}
```

Validation (Zod):
- `score`: integer, 1–5 inclusive, required
- `comment`: string, trimmed, max 500 characters, optional

### Response

| Status | Body | Condition |
| --- | --- | --- |
| 200 | `{ "id": "uuid", "ideaId": "uuid", "evaluatorId": "uuid", "score": 4, "comment": "...", "createdAt": "ISO-8601", "updatedAt": "ISO-8601" }` | Score created or updated |
| 400 | `{ "error": "Validation failed", "details": [...] }` | Invalid input (out-of-range, non-integer, comment too long) |
| 401 | `{ "error": "Unauthorized" }` | No session |
| 403 | `{ "error": "Forbidden" }` | Non-admin role |
| 403 | `{ "error": "Cannot score own idea" }` | Evaluator is the idea's submitter |
| 403 | `{ "error": "Idea has reached a terminal outcome" }` | Idea's `idea_stage_state.terminal_outcome` is not null |
| 404 | `{ "error": "Idea not found" }` | Idea does not exist or is soft-deleted |

### Notes

- Uses Supabase `.upsert()` with `onConflict: "idea_id,evaluator_id"`.
- `evaluator_id` is derived from the session (`auth.uid()`), never from the request body.
- Scoring eligibility is checked against `idea_stage_state`, not `idea.status`.

---

## 2) GET /api/ideas/[id]/scores

Retrieve all individual scores and the aggregate summary for an idea.

- **Role**: admin or submitter (own idea only)
- **Content-Type**: `application/json`

### Response

| Status | Body | Condition |
| --- | --- | --- |
| 200 | See schema below | Success |
| 401 | `{ "error": "Unauthorized" }` | No session |
| 403 | `{ "error": "Forbidden" }` | Submitter viewing other user's idea |
| 404 | `{ "error": "Idea not found" }` | Idea does not exist or is soft-deleted |

### Response schema (200)

```json
{
  "ideaId": "uuid",
  "aggregate": {
    "avgScore": 3.7,
    "scoreCount": 5
  },
  "scores": [
    {
      "id": "uuid",
      "evaluatorId": "uuid",
      "evaluatorDisplayName": "Jane Smith",
      "score": 4,
      "comment": "Strong idea with clear ROI",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ],
  "myScore": {
    "id": "uuid",
    "score": 4,
    "comment": "Strong idea with clear ROI",
    "updatedAt": "ISO-8601"
  }
}
```

### Blind review behavior

When blind review is enabled AND the viewer is not an admin AND the idea is non-terminal:
- `evaluatorId` → `"anonymous"` on each score entry
- `evaluatorDisplayName` → `"Anonymous Evaluator"`
- `myScore` still shows the viewer's own score with their own identity (self-view exemption)

When blind review is OFF or the idea is terminal:
- Full `evaluatorId` and `evaluatorDisplayName` are returned

### Notes

- `aggregate` is always returned (even with 0 scores: `avgScore: null, scoreCount: 0`).
- `myScore` is `null` if the authenticated user hasn't scored this idea.
- Submitters who view their own idea see `aggregate` and `scores` with blind-review masking applied to evaluator identities (same rules as evaluators).

---

## 3) GET /api/ideas (modified)

Existing endpoint. Adds `avgScore` and `scoreCount` fields to each idea in the response.

### Behavior change

Each idea object in the response array gains two new optional fields:

```json
{
  "id": "uuid",
  "title": "...",
  "status": "under_review",
  "avgScore": 3.7,
  "scoreCount": 5,
  ...
}
```

- `avgScore`: `number | null` — null if no scores exist
- `scoreCount`: `number` — 0 if no scores exist
- Sorting by `avgScore` is supported via query parameter: `?sortBy=avgScore&sortDir=desc`
- Default sort remains `created_at desc`
- Unscored ideas (`avgScore: null`) sort to the bottom when sorting by score

### Notes

- Aggregates are computed via LEFT JOIN subquery or a secondary query + JS merge.
- No blind review impact on aggregate numbers (aggregates don't reveal identity).
- Only admin views support score sorting; submitter listing does not include score data for other users' ideas.

---

## 4) GET /api/ideas/[id] (modified)

Existing endpoint. Adds aggregate score summary to the idea detail response.

### Behavior change

```json
{
  "id": "uuid",
  "title": "...",
  "avgScore": 3.7,
  "scoreCount": 5,
  ...
}
```

- `avgScore` and `scoreCount` are included for admin and submitter (own idea) views.
- Individual scores are NOT embedded here — use `GET /api/ideas/[id]/scores` for the full breakdown.

---

## Validation Schemas

### scoreSubmissionSchema (Zod)

```typescript
import { z } from "zod";

export const scoreSubmissionSchema = z.object({
  score: z
    .number()
    .int("Score must be an integer")
    .min(1, "Score must be at least 1")
    .max(5, "Score must be at most 5"),
  comment: z
    .string()
    .trim()
    .max(500, "Comment must not exceed 500 characters")
    .optional()
    .nullable(),
});
```
