# Quickstart: Scoring System (1–5 Ratings)

**Feature**: 8-scoring-system
**Branch**: 8-scoring-system

## Prerequisites

- Node.js 20+
- Supabase project configured (Auth + Postgres + RLS)
- Existing migrations (001–008) already applied
- Multi-stage review workflow (Feature 6) functional
- Blind review (Feature 7) functional

## Setup

```bash
git checkout 8-scoring-system
npm install
npm run dev
```

## Implementation Validation Checklist

### Score Submission

- [x] Evaluator can score an idea under active review with a value 1–5
- [x] Evaluator can include an optional comment (max 500 chars) with the score
- [x] Evaluator can update their existing score (upsert — replaces previous value)
- [x] Scoring is blocked for ideas with terminal outcome (accepted/rejected) → 403
- [x] Scoring is blocked for the idea's own submitter → 403
- [x] Score value outside 1–5 is rejected → 400
- [x] Non-integer score value is rejected → 400
- [x] Comment exceeding 500 characters is rejected → 400
- [x] Missing score value is rejected → 400
- [x] Non-admin (submitter) users cannot submit scores → 403

### Aggregate Display

- [x] Idea detail shows average score (1 decimal) and score count
- [x] Idea detail shows "No scores yet" when no evaluators have scored
- [x] Aggregate updates immediately after a new score is submitted (next page load)
- [x] Admin idea listing shows `avgScore` and `scoreCount` per idea

### Individual Scores View

- [x] `GET /api/ideas/[id]/scores` returns all individual scores with evaluator info
- [x] `myScore` field shows the current evaluator's own score (or null)
- [x] Admin always sees full evaluator identity on score entries

### Blind Review Integration

- [x] With blind review ON, evaluator sees "Anonymous Evaluator" on other evaluators' scores
- [x] With blind review ON, `evaluatorId` is `"anonymous"` in API responses to evaluators
- [x] With blind review OFF, evaluator sees full evaluator identity
- [x] Admin sees full evaluator identity regardless of blind review setting
- [x] Terminal idea scores show full evaluator identity regardless of blind review
- [x] Own score always shows own identity (self-view exemption)

### Sorting

- [x] Admin listing supports `?sortBy=avgScore&sortDir=desc` query parameter
- [x] Sorting by avgScore descending puts highest-rated ideas first
- [x] Unscored ideas appear at the bottom when sorting by score
- [x] Default sort (created_at desc) still works when no sort parameter is provided

### Self-Score Prevention

- [x] Submitter cannot score their own idea via UI
- [x] Submitter cannot score their own idea via direct API call → 403

### Security

- [x] RLS policies prevent submitters from reading scores on other users' ideas
- [x] RLS policies allow evaluators/admins to read all scores
- [x] RLS policies restrict score insert/update to own `evaluator_id` only
- [x] DB CHECK constraint enforces score 1–5 range
- [x] DB UNIQUE constraint enforces one score per evaluator per idea

## Suggested Test Commands

```bash
# Full suite
npm test

# Score validation schema
npx vitest run tests/unit/validation-score.test.ts

# Score query helpers
npx vitest run tests/unit/queries-idea-score.test.ts

# Score submission API
npx vitest run tests/unit/api-idea-score.test.ts

# Score listing API
npx vitest run tests/unit/api-idea-scores-list.test.ts

# Blind review + scoring integration
npx vitest run tests/unit/score-blind-review.test.ts

# Score aggregate helpers
npx vitest run tests/unit/score-aggregate.test.tsx

# Score list component
npx vitest run tests/unit/score-list.test.tsx

# Admin listing with scores
npx vitest run tests/unit/api-ideas-score-sorting.test.ts

# Admin sort toggle
npx vitest run tests/unit/admin-review-score-sort.test.tsx

# Score UI component
npx vitest run tests/unit/score-form.test.tsx

# Idea detail scores API
npx vitest run tests/unit/api-idea-detail-scores.test.ts

# Integration
npx vitest run tests/integration/api-scoring-flow.test.ts
```

## Migration Verification

Migration file: `supabase/migrations/009_add_scoring_system.sql`

### Tables Created

| Table | Purpose |
| --- | --- |
| `idea_score` | Individual evaluator scores (1–5) per idea |

### Indexes

| Index | Table | Columns |
| --- | --- | --- |
| `idx_idea_score_idea_id` | `idea_score` | `idea_id` |
| `idx_idea_score_evaluator_id` | `idea_score` | `evaluator_id` |

### RLS Policies

| Policy | Operation | Role | Condition |
| --- | --- | --- | --- |
| Admin read all | SELECT | admin | Always |
| Evaluator read all | SELECT | admin (evaluator) | Always |
| Submitter read own idea scores | SELECT | submitter | `idea.user_id = auth.uid()` |
| Upsert own scores | INSERT/UPDATE | admin (evaluator) | `evaluator_id = auth.uid()` |

### Constraints

| Constraint | Type | Columns |
| --- | --- | --- |
| PK | PRIMARY KEY | `id` |
| FK idea | FOREIGN KEY | `idea_id → idea.id` (CASCADE) |
| FK evaluator | FOREIGN KEY | `evaluator_id → user_profile.id` (RESTRICT) |
| UNIQUE | UNIQUE | `(idea_id, evaluator_id)` |
| CHECK score | CHECK | `score >= 1 AND score <= 5` |
| CHECK comment | CHECK | `comment IS NULL OR char_length(comment) <= 500` |
