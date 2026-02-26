# Quickstart: Multi-Stage Review Workflow

**Feature**: 6-multi-stage-review
**Branch**: 6-multi-stage-review

## Prerequisites

- Node.js 20+
- Supabase project configured (Auth + Postgres + RLS)
- Existing migrations (001–006) already applied

## Setup

```bash
git checkout 6-multi-stage-review
npm install
npm run dev
```

## Implementation Validation Checklist

### Workflow Configuration

- [ ] Admin can create/activate workflow with 3–7 unique stage names
- [ ] Empty or duplicate stage names are rejected
- [ ] Only one active workflow exists at a time

### Idea Progression

- [ ] New ideas bind to first stage of currently active workflow
- [ ] Evaluator can advance/return/hold only via valid transitions
- [ ] Final stage enforces terminal outcome and blocks further advancement

### Versioning & Concurrency

- [ ] In-progress ideas remain on original workflow version after config updates
- [ ] New ideas use newly activated workflow
- [ ] Concurrent stale transitions return conflict (`409`) and preserve current state

### Visibility Rules

- [ ] Submitter sees current stage + timestamps during non-terminal review
- [ ] Submitter does not see evaluator identity/comments before terminal decision
- [ ] Admin/evaluator can access full stage history payload

### Security

- [ ] Admin endpoints reject non-admin users (`403`)
- [ ] Transition endpoints reject unauthorized users (`401`)
- [ ] Role checks are enforced server-side for all stage mutations

## Suggested Test Commands

```bash
# Full suite
npm test

# Phase 3 – Workflow configuration
npx vitest run tests/unit/validation-review-workflow.test.ts
npx vitest run tests/unit/queries-review-workflow.test.ts
npx vitest run tests/unit/api-admin-review-workflow.test.ts
npx vitest run tests/unit/admin-review-workflow-page.test.tsx

# Phase 4 – Transitions & stage actions
npx vitest run tests/unit/review-transition-rules.test.ts
npx vitest run tests/unit/review-concurrency.test.ts
npx vitest run tests/unit/api-admin-review-transition.test.ts
npx vitest run tests/unit/admin-review-stage-actions.test.tsx

# Phase 5 – Progress visibility
npx vitest run tests/unit/review-visibility.test.ts
npx vitest run tests/unit/api-idea-review-progress.test.ts
npx vitest run tests/unit/idea-detail-review-progress.test.tsx

# Phase 6 – Integration
npx vitest run tests/integration/api-review-stages-flow.test.ts
npx vitest run tests/integration/api-review-versioning.test.ts
```

## Migration Verification

Migration file: `supabase/migrations/007_add_multi_stage_review.sql`

### Tables Created

| Table | Purpose |
| --- | --- |
| `review_workflow` | Workflow configuration with version & active flag |
| `review_stage` | Ordered stages belonging to a workflow |
| `idea_stage_state` | Current stage position & version for each idea |
| `review_stage_event` | Immutable audit log of all stage transitions |

### Running the Migration

```bash
# Against local Supabase instance
supabase db push

# Verify tables
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'review%' OR table_name = 'idea_stage_state';"
```

### Rollback (if needed)

```sql
DROP TABLE IF EXISTS public.review_stage_event CASCADE;
DROP TABLE IF EXISTS public.idea_stage_state CASCADE;
DROP TABLE IF EXISTS public.review_stage CASCADE;
DROP TABLE IF EXISTS public.review_workflow CASCADE;
```

### RLS Policy Summary

- **review_workflow / review_stage**: Admin full CRUD, authenticated read
- **idea_stage_state**: Admin/evaluator read+write, submitter read own
- **review_stage_event**: Admin/evaluator read+insert, submitter read own

## Key Paths

- Spec: `specs/6-multi-stage-review/spec.md`
- Plan: `specs/6-multi-stage-review/impl-plan.md`
- Research: `specs/6-multi-stage-review/research.md`
- Data model: `specs/6-multi-stage-review/data-model.md`
- Contracts: `specs/6-multi-stage-review/contracts/api.md`
- ADR: `docs/adr/ADR-007-multi-stage-review-workflow.md`

## Quality Sweep Results

**Date**: 2026-02-27  
**Full Suite**: 578 passed / 3 failed (61 test files)

### Feature 6 Test Summary

| Test File | Tests | Status |
| --- | --- | --- |
| validation-review-workflow.test.ts | 12 | PASS |
| queries-review-workflow.test.ts | 8 | PASS |
| api-admin-review-workflow.test.ts | 12 | PASS |
| admin-review-workflow-page.test.tsx | 7 | PASS |
| review-transition-rules.test.ts | 16 | PASS |
| review-concurrency.test.ts | 6 | PASS |
| api-admin-review-transition.test.ts | 14 | PASS |
| admin-review-stage-actions.test.tsx | 7 | PASS |
| review-visibility.test.ts | 10 | PASS |
| api-idea-review-progress.test.ts | 9 | PASS |
| idea-detail-review-progress.test.tsx | 7 | PASS |
| types.test.ts (review types) | 16 | PASS |
| api-review-stages-flow.test.ts | 2 | PASS |
| api-review-versioning.test.ts | 2 | PASS |
| **Total Feature 6** | **128** | **ALL PASS** |

### Pre-Existing Failures (not related to Feature 6)

- `tests/integration/api-drafts-flow.test.ts` — 3 failures due to RLS policy issue with draft submissions (Feature 3). These failures involve `new row violates row-level security policy for table "idea"` and pre-date this feature.
