# Implementation Plan: Smart Category-Based Submission Form

**Feature**: 1-smart-category-form
**Branch**: main
**Created**: 2026-02-24
**Spec**: [spec.md](spec.md)

## Technical Context

| Area | Technology | Notes |
| --- | --- | --- |
| Runtime | Next.js App Router | Reuse existing routes and page structure |
| UI | React client page | Extend existing `src/app/ideas/new/page.tsx` only |
| Language | TypeScript strict | Preserve current type safety constraints |
| Backend | Supabase Postgres | Persist dynamic values in `idea.category_fields` JSONB |
| Validation | Zod | Reuse `src/lib/validation/*` modules; add category-specific schema helpers |
| API | Existing `/api/ideas` | Extend request handling; no new submission endpoint |
| Testing | Vitest (unit/integration) | Add focused tests for dynamic fields and stale-field filtering |

### Unknowns & Resolutions

- Validation boundary for dynamic fields: NEEDS CLARIFICATION -> resolved in research as dual validation (client + server).
- Dynamic field definition source: NEEDS CLARIFICATION -> resolved in research as code-config constants for MVP.

## Constitution Check (Pre-Design)

| Principle | Status | Notes |
| --- | --- | --- |
| Simplicity First | ✅ PASS | Single-page extension; no wizard/new pages |
| Test-First (TDD) | ⚠️ ACTION | Add failing tests before dynamic validation/persistence changes |
| Secure by Default | ⚠️ ACTION | Server-side validation required to block tampered payloads |
| Type Safety | ✅ PASS | Reuse typed Zod schemas and existing TS strict setup |
| Spec-Driven Development | ✅ PASS | Plan derived directly from feature spec + clarification |

Gate Result: **PASS WITH CORRECTIVE TASKS**

## Phase 0: Research

Research artifacts complete in [research.md](research.md).

Summary:
- JSON object persistence for category-specific values.
- Client + server validation using shared schema rules.
- Category field definitions stored in code config for MVP.
- Existing submission page and validation modules reused.

## Phase 1: Design & Contracts

### Data Model

- Added design in [data-model.md](data-model.md).
- Key change: `idea.category_fields` JSONB stores active category values only.

### Interface Contract

- Updated API behavior in [contracts/api.md](contracts/api.md).
- `POST /api/ideas` accepts `category_fields` JSON in same request flow.

### Quickstart

- Validation and behavior checks documented in [quickstart.md](quickstart.md).

## Phase 2: Implementation Planning

### Workstream A — Config & Validation (reuse existing modules)

1. Extend constants with category->field-definition mapping.
2. Add dynamic schema builder in existing validation module(s) (`src/lib/validation/idea.ts` + helper file if needed).
3. Add tests first for required/format/range checks by active category.

### Workstream B — Existing form page enhancement (MVP-simple UI)

1. Update `src/app/ideas/new/page.tsx` to render dynamic fields conditionally by selected category.
2. Keep current layout/style and single-page flow.
3. Clear inactive category values on category switch.
4. Build `category_fields` payload from active inputs only.

### Workstream C — API persistence integrity

1. Extend `POST /api/ideas` parsing to accept `category_fields`.
2. Re-validate dynamic fields server-side based on selected category.
3. Persist only validated active-category keys.
4. Return clear field-level errors for invalid dynamic inputs.

### Workstream D — Data access & display alignment

1. Update shared types and query input/output to include `category_fields`.
2. Keep existing idea listing/review flows unchanged unless display adaptation is required.

### Workstream E — Regression & focused verification

1. Add/adjust unit + integration tests for dynamic field scenarios.
2. Verify base form rules still operate unchanged.
3. Verify EC2/EC5 stale hidden values are not persisted.

## Constitution Check (Post-Design)

| Principle | Status | Notes |
| --- | --- | --- |
| Simplicity First | ✅ PASS | Reuses existing form page and modules; no extra UI surfaces |
| Test-First (TDD) | ✅ PASS | Plan explicitly sequences tests before implementation |
| Secure by Default | ✅ PASS | Server-side revalidation + active-key filtering included |
| Type Safety | ✅ PASS | Zod-driven contracts + typed payload extension |
| Spec-Driven Development | ✅ PASS | All workstreams map to FR/EC items in spec |

Gate Result: **PASS**

## Planned Artifacts

- Spec: [spec.md](spec.md)
- Research: [research.md](research.md)
- Data model: [data-model.md](data-model.md)
- Contract: [contracts/api.md](contracts/api.md)
- Quickstart: [quickstart.md](quickstart.md)
- This plan: [impl-plan.md](impl-plan.md)
