# Data Model: Blind Review (Anonymous Evaluation)

**Feature**: 7-blind-review
**Created**: 2026-02-26

## Entities

### 1) portal_setting

Generic key-value settings table for portal-wide configuration flags.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| key | TEXT | PK | Setting identifier (e.g., `blind_review_enabled`) |
| value | JSONB | NOT NULL | Setting value (boolean, string, or structured data) |
| updated_by | UUID | FK → user_profile.id, NOT NULL | Last admin who changed this setting |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Audit timestamp |

Validation rules:
- `key` must be non-empty and unique (enforced by PK).
- Only administrators can insert or update rows.
- For `blind_review_enabled`, `value` must be a JSON boolean (`true` or `false`).

### Seed Data

On migration, insert the default setting:

```sql
INSERT INTO portal_setting (key, value, updated_by, updated_at)
VALUES ('blind_review_enabled', 'false'::jsonb, (SELECT id FROM user_profile WHERE role = 'admin' LIMIT 1), now())
ON CONFLICT (key) DO NOTHING;
```

If no admin exists at migration time, the row is inserted on the first admin toggle via the API.

---

## Relationships

- `portal_setting.updated_by → user_profile.id` (admin who last changed the setting)

No new relationships to `idea`, `review_workflow`, or other tables. Blind review is a view-time display concern, not a data-level binding.

## How Anonymization Works (Logical Model)

Anonymization is **not** stored in the data model. It is applied at the API response layer:

1. API handler reads `portal_setting` where `key = 'blind_review_enabled'`.
2. If the value is `true`, the handler checks:
   - **Viewer role**: admin → show identity (FR-004). Evaluator → apply masking.
   - **Viewer is submitter**: if `viewer_id === idea.user_id` → show identity (FR-005).
   - **Idea terminal state**: if `idea_stage_state.terminal_outcome IS NOT NULL` → show identity (FR-006).
3. When masking applies, the API response replaces:
   - `user_id` → omitted or replaced with `"anonymous"`
   - Submitter name → `"Anonymous Submitter"`
   - Submitter email → omitted
   - Submitter avatar → omitted or default placeholder

## State Transitions

### Blind review toggle lifecycle

1. Admin opens review settings page (reads current `portal_setting` value).
2. Admin toggles blind review on/off and saves.
3. System upserts `portal_setting` row with new value, `updated_by`, and `updated_at`.
4. All subsequent evaluator views immediately reflect the updated setting.

No per-idea state changes. No idea binding. No workflow version impact.

## Visibility Model (Role-Oriented, Extended)

Extends the existing visibility model from Feature 6:

| Viewer | Blind Review OFF | Blind Review ON (non-terminal) | Blind Review ON (terminal) |
| --- | --- | --- | --- |
| Admin | Full identity | Full identity | Full identity |
| Evaluator | Full identity | Anonymous | Full identity |
| Submitter (own idea) | Full identity | Full identity | Full identity |
| Submitter (other ideas) | Full identity | Full identity | Full identity |

**Note**: Submitters already do not see other evaluators' identities during non-terminal review (per ADR-007). Blind review adds the inverse: evaluators do not see submitter identity.
