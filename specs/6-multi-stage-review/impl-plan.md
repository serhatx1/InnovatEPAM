# Implementation Plan: Multi-Stage Review Workflow

**Feature**: 6-multi-stage-review
**Branch**: 6-multi-stage-review
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

- Idea lifecycle currently supports `submitted`, `under_review`, `accepted`, `rejected`.
- Admin review flow currently performs single-step status updates.
- Current schema has no first-class stage configuration or stage history entities.
- RLS and role model already distinguish submitter vs evaluator/admin.

### Technical Unknowns Identified (Pre-Research)

- Stage-configuration versioning behavior for in-progress ideas — **RESOLVED in research R2**.
- Concurrency behavior when multiple evaluators transition the same idea — **RESOLVED in research R3**.
- Submitter visibility level during non-terminal review — **RESOLVED in research R4**.

## Constitution Check (Pre-Design)

| Principle | Compliance | Notes |
| --- | --- | --- |
| Simplicity First | ✅ PASS | Extends existing review domain; no microservices/new runtime components. |
| Test-First (TDD) | ✅ PLAN | Plan requires tests before query/API/UI changes for stage workflow paths. |
| Secure by Default | ✅ PLAN | Role-gated admin config, evaluator transitions, and submitter visibility controls. |
| Type Safety | ✅ PLAN | New stage/stage-event contracts modeled in strict TypeScript + Zod boundaries. |
| Spec-Driven Development | ✅ PASS | Spec and clarifications completed before implementation planning. |

### Gate Result: **PASS**

No constitutional violations identified.

## Phase 0: Research Output

Research completed in [research.md](research.md). All identified unknowns are resolved with explicit decisions, rationale, and alternatives.

## Phase 1: Design Output

- Data model documented in [data-model.md](data-model.md)
- External interface contract documented in [contracts/api.md](contracts/api.md)
- Validation/runbook documented in [quickstart.md](quickstart.md)

## Implementation Strategy (Phase 2 Planning)

1. **Database & Types**
   - Add workflow/stage/state/event schema support.
   - Extend shared types and validation schemas for stage config and transitions.
2. **Queries & Authorization**
   - Add admin stage-config queries and evaluator stage-transition queries.
   - Enforce optimistic concurrency and workflow-version binding for in-progress ideas.
3. **API Layer**
   - Add admin stage config endpoints.
   - Add evaluator transition endpoint and stage-history retrieval endpoint.
   - Add role-aware view shaping for submitter visibility rules.
4. **UI Layer**
   - Admin stage configuration screen (ordered stage management).
   - Evaluator stage action flow in review UI.
   - Stage progress/history display on idea detail page.
5. **Testing (TDD-first execution)**
   - Unit tests for transition rules, concurrency rejection, and visibility shaping.
   - Integration tests for API route behaviors including conflict and auth paths.

## Post-Design Constitution Check

| Principle | Compliance | Notes |
| --- | --- | --- |
| Simplicity First | ✅ PASS | Single workflow model with version snapshots avoids migration complexity. |
| Test-First (TDD) | ✅ PASS | Phase 2 strategy explicitly sequences tests before implementation. |
| Secure by Default | ✅ PASS | Role checks + constrained visibility + server-side validation on transitions/config. |
| Type Safety | ✅ PASS | Contract-first entities and state transitions captured in typed schema model. |
| Spec-Driven Development | ✅ PASS | Design artifacts trace directly to FR-001..FR-013 and clarified decisions. |

### Gate Result: **PASS**

Design remains constitution-compliant and ready for `/speckit.tasks`.
