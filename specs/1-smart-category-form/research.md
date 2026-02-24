# Research: Smart Category-Based Submission Form

**Feature**: 1-smart-category-form  
**Date**: 2026-02-24

## R1 — Storage shape for category-specific values

- Decision: Store category-specific values in a single JSON object field (`category_fields`) on `idea`.
- Rationale: Supports dynamic per-category field sets without schema churn, keeps MVP scope small, and matches the clarified spec decision.
- Alternatives considered:
  - EAV table (`idea_category_field_value`): more flexible for analytics but adds complexity and more joins.
  - One column per possible dynamic field: brittle and migration-heavy.

## R2 — Validation boundary for dynamic fields

- Decision: Use shared Zod-based rules validated on both client and server.
- Rationale: Preserves inline UX feedback while preventing bypass and stale/irrelevant field persistence at API boundary.
- Alternatives considered:
  - Client-only validation: weaker integrity.
  - Server-only validation: secure but poorer UX.

## R3 — Where to keep category field definitions

- Decision: Keep field definitions in application constants/config (versioned in code) and reuse existing validation modules.
- Rationale: Smallest-change path for MVP, predictable release behavior, easy to test, no admin UI required.
- Alternatives considered:
  - DB-stored definitions: enables runtime configuration but increases scope and operational complexity.

## R4 — UI architecture for dynamic fields

- Decision: Extend existing `src/app/ideas/new/page.tsx` with conditional sections only.
- Rationale: Meets single-page requirement, preserves current submission flow, avoids additional routes/components.
- Alternatives considered:
  - Multi-step wizard: out of scope.
  - New dedicated dynamic form page: unnecessary duplication.

## R5 — Persistence contract and stale hidden fields

- Decision: Build payload from active category only and clear inactive category values on category switch before submit.
- Rationale: Directly satisfies EC2 and EC5; prevents irrelevant data from being saved.
- Alternatives considered:
  - Submit all values and filter server-side only: less predictable UX and harder debugging.
