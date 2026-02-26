# Implementation Plan: Blind Review (Anonymous Evaluation)

**Feature**: 7-blind-review
**Branch**: 7-blind-review
**Created**: 2026-02-26
**Spec**: [spec.md](spec.md)

## Technical Context

| Area | Technology | Version |
| --- | --- | --- |
| Runtime | Next.js (App Router) | 16.1 |
| UI | React + shadcn/ui + Tailwind CSS | 19 / latest / 4 |
| Language | TypeScript (strict mode) | 5.x |
| Backend | Supabase (Postgres + RLS + Auth) | Latest |
| Validation | Zod | 4.x |
| Testing | Vitest + React Testing Library | 4.x |
| Deployment | Vercel | — |

### Existing System Baseline

- Multi-stage review (Feature 6) is implemented with `review_workflow`, `review_stage`, `idea_stage_state`, `review_stage_event` tables.
- Visibility shaping (`src/lib/review/visibility.ts`) already strips evaluator identity from submitter views during non-terminal review.
- Idea listing (`GET /api/ideas`) and detail (`GET /api/ideas/[id]`) endpoints return `user_id` and raw idea rows — no submitter profile info is currently joined.
- Role model distinguishes `admin` and `submitter` roles via `user_profile.role`; `evaluator` is treated as `admin` in some endpoints (via `getUserRole`).
- No portal-wide settings table exists yet.

### Technical Unknowns Identified (Pre-Research)

- Where to store the blind review toggle — **RESOLVED in research R1** (new `portal_setting` table).
- Where to enforce anonymization — **RESOLVED in research R2** (API response layer, server-side).
- View-time vs submission-time toggle application — **RESOLVED in research R3** (view-time).

## Constitution Check (Pre-Design)

| Principle | Compliance | Notes |
| --- | --- | --- |
| Simplicity First | ✅ PASS | Single `portal_setting` table + thin anonymization helper. No new services or complex infrastructure. |
| Test-First (TDD) | ✅ PLAN | Plan requires tests before query/API/UI changes for anonymization paths. |
| Secure by Default | ✅ PLAN | Anonymization enforced at API layer (not UI only). RLS on settings table. Admin-only mutation. |
| Type Safety | ✅ PLAN | Zod schema for setting input. Typed anonymization helper with strict role/state parameters. |
| Spec-Driven Development | ✅ PASS | Spec, clarifications, and research completed before implementation planning. |

### Gate Result: **PASS**

No constitutional violations identified.

## Phase 0: Research Output

Research completed in [research.md](research.md). All identified unknowns are resolved:

| Unknown | Decision | Research Reference |
| --- | --- | --- |
| Setting storage | `portal_setting` key-value table | R1 |
| Enforcement layer | API response layer (server-side) | R2 |
| View-time vs bind-time | View-time application | R3 |
| Masking scope | Structured identity fields only | R4 |
| Admin exemption | Always show full identity | R5 |
| Terminal reveal | Reveal after terminal outcome | R6 |
| RLS for settings | Admin write, authenticated read | R7 |

## Phase 1: Design Output

- Data model documented in [data-model.md](data-model.md)
- External interface contract documented in [contracts/api.md](contracts/api.md)
- Validation/runbook documented in [quickstart.md](quickstart.md)

## Implementation Strategy (Phase 2 Planning)

### Layer 1: Database & Types

1. **Migration `008_add_blind_review.sql`**
   - Create `portal_setting` table (key TEXT PK, value JSONB, updated_by UUID FK, updated_at TIMESTAMPTZ).
   - Add RLS policies: authenticated users can SELECT; admin can INSERT/UPDATE.
   - Seed default row: `blind_review_enabled = false`.

2. **Types extension**
   - Add `PortalSetting` interface to `src/types/index.ts`.
   - Add Zod schema `blindReviewSettingSchema` in `src/lib/validation/blind-review.ts`.

### Layer 2: Queries & Helpers

3. **Setting queries** (`src/lib/queries/portal-settings.ts`)
   - `getBlindReviewEnabled(supabase)` → boolean
   - `setBlindReviewEnabled(supabase, enabled, userId)` → updated setting

4. **Anonymization helper** (`src/lib/review/blind-review.ts`)
   - `shouldAnonymize({ viewerRole, viewerId, ideaUserId, terminalOutcome, blindReviewEnabled })` → boolean
   - `anonymizeIdeaResponse(idea, shouldMask)` → idea with masked fields
   - `anonymizeIdeaList(ideas, viewerRole, viewerId, blindReviewEnabled, stageStates?)` → masked list

### Layer 3: API Endpoints

5. **Admin setting endpoints**
   - `GET /api/admin/settings/blind-review` — read current setting
   - `PUT /api/admin/settings/blind-review` — toggle setting

6. **Modify existing idea endpoints**
   - `GET /api/ideas` — add anonymization pass before response
   - `GET /api/ideas/[id]` — add anonymization pass before response

### Layer 4: UI

7. **Admin settings UI**
   - Add blind review toggle to admin review settings page
   - Show current state with save confirmation

8. **Idea listing & detail adjustments**
   - Display `submitter_display_name` when present
   - Show "Anonymous Submitter" placeholder styling

### Layer 5: Testing (TDD-first execution)

9. **Unit tests**
   - `shouldAnonymize` helper with all role/state combinations
   - `anonymizeIdeaResponse` field masking verification
   - Zod schema validation for setting input
   - Setting query functions (mocked Supabase)

10. **Integration tests**
    - Admin setting toggle flow (enable → verify → disable → verify)
    - Evaluator idea listing with blind review ON vs OFF
    - Evaluator idea detail with blind review ON (non-terminal and terminal)
    - Submitter self-view unaffected by blind review

## Post-Design Constitution Check

| Principle | Compliance | Notes |
| --- | --- | --- |
| Simplicity First | ✅ PASS | Single table, thin helper function, minimal endpoint modifications. No new services. Reusable `portal_setting` pattern for future toggles. |
| Test-First (TDD) | ✅ PASS | Phase 2 strategy explicitly sequences tests before implementation in each layer. |
| Secure by Default | ✅ PASS | API-layer anonymization prevents data leakage via direct API calls. RLS + server role checks for settings. Admin exemption is explicit. |
| Type Safety | ✅ PASS | Zod schema validates setting input. TypeScript interfaces for `PortalSetting`. Typed `shouldAnonymize` parameters. |
| Spec-Driven Development | ✅ PASS | All design artifacts trace to FR-001..FR-010. Research decisions documented with rationale and alternatives. |

### Gate Result: **PASS**

Design remains constitution-compliant and ready for `/speckit.tasks`.
