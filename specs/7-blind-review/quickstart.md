# Quickstart: Blind Review (Anonymous Evaluation)

**Feature**: 7-blind-review
**Branch**: 7-blind-review

## Prerequisites

- Node.js 20+
- Supabase project configured (Auth + Postgres + RLS)
- Existing migrations (001–007) already applied
- Multi-stage review workflow (Feature 6) functional

## Setup

```bash
git checkout 7-blind-review
npm install
npm run dev
```

## Implementation Validation Checklist

### Admin Setting Management

- [ ] Admin can read current blind review setting via `GET /api/admin/settings/blind-review`
- [ ] Admin can enable blind review via `PUT /api/admin/settings/blind-review` with `{ "enabled": true }`
- [ ] Admin can disable blind review via `PUT /api/admin/settings/blind-review` with `{ "enabled": false }`
- [ ] Non-admin users receive `403 Forbidden` on settings endpoints
- [ ] Setting persists across server restarts (stored in `portal_setting` table)

### Evaluator Anonymization

- [ ] With blind review ON, evaluator sees "Anonymous Submitter" on idea listing
- [ ] With blind review ON, evaluator sees "Anonymous Submitter" on idea detail page
- [ ] With blind review ON, `user_id` is `"anonymous"` in API responses to evaluators
- [ ] With blind review OFF, evaluator sees full submitter identity
- [ ] Toggling blind review takes effect on next page load (no caching delay)

### Admin Exemption

- [ ] Admin always sees full submitter identity regardless of blind review setting
- [ ] Admin identity exemption applies to both listing and detail views

### Submitter Self-View

- [ ] Submitter sees their own name and details on their own ideas when blind review is ON
- [ ] Submitter self-view works on both listing and detail pages

### Terminal Reveal

- [ ] Evaluator sees submitter identity on ideas with terminal outcome (accepted/rejected)
- [ ] Terminal reveal works regardless of blind review toggle state

### Stage Workflow Compatibility

- [ ] Stage transitions (advance, return, hold, terminal) work identically with blind review ON
- [ ] Stage transitions work identically with blind review OFF
- [ ] Review progress endpoint is unaffected by blind review

### Security

- [ ] API responses to evaluators do not contain `user_id`, name, or email when blind review is ON
- [ ] Direct API calls (bypassing UI) also receive anonymized responses
- [ ] RLS policies enforce admin-only write access to `portal_setting`

## Suggested Test Commands

```bash
# Full suite
npm test

# Blind review setting queries & validation
npx vitest run tests/unit/queries-portal-setting.test.ts
npx vitest run tests/unit/validation-blind-review.test.ts

# Anonymization helper
npx vitest run tests/unit/blind-review-anonymize.test.ts

# Admin settings API
npx vitest run tests/unit/api-admin-blind-review.test.ts

# Admin settings UI
npx vitest run tests/unit/admin-blind-review-settings.test.tsx

# Modified idea endpoints
npx vitest run tests/unit/api-ideas-blind-review.test.ts

# Submitter self-view
npx vitest run tests/unit/idea-submitter-self-view.test.tsx

# Integration
npx vitest run tests/integration/api-blind-review-flow.test.ts
```

## Migration Verification

Migration file: `supabase/migrations/008_add_blind_review.sql`

### Tables Created

| Table | Purpose |
| --- | --- |
| `portal_setting` | Key-value store for portal-wide configuration flags |

### Running the Migration

```bash
# Against local Supabase instance
supabase db push

# Verify table
supabase db query "SELECT * FROM portal_setting WHERE key = 'blind_review_enabled';"
```
