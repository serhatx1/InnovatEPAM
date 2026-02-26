# Research: Multi-Stage Review Workflow

**Feature**: 6-multi-stage-review
**Created**: 2026-02-26

## R1: Stage Configuration Storage Model

**Decision**: Store stage configuration as explicit relational entities (`review_workflow`, `review_stage`) with ordered stage rows.

**Rationale**: Ordered relational rows support validation, indexing, explicit versioning, and easier transition logic than opaque JSON arrays.

**Alternatives considered**:
- JSONB stage list on a single config row (simpler write path but weaker relational guarantees)
- Hardcoded enum-based stages (not configurable and conflicts with feature goal)

---

## R2: Workflow Changes vs In-Progress Ideas

**Decision**: Bind each in-progress idea to the workflow version it started with; newly activated workflow applies only to new ideas.

**Rationale**: Avoids disruptive remapping and preserves deterministic review state/history for active evaluations.

**Alternatives considered**:
- Auto-migrate all active ideas to newest workflow (high risk of incorrect mapping)
- Freeze config changes until all ideas finish (operationally rigid)

---

## R3: Concurrency on Stage Transitions

**Decision**: Use optimistic concurrency for stage transitions (reject stale updates and require refresh/retry).

**Rationale**: Protects stage integrity without introducing distributed locks or long-lived UI locks.

**Alternatives considered**:
- Last write wins (can silently overwrite evaluator decisions)
- Pessimistic lock per idea (more operational and UX complexity)

---

## R4: Submitter Visibility During Review

**Decision**: During non-terminal review, show submitter only current stage and timestamps; hide evaluator identity/comments until terminal decision.

**Rationale**: Balances transparency with evaluator privacy and aligns with future blind-review evolution.

**Alternatives considered**:
- Full real-time visibility (privacy and process bias risk)
- No in-progress visibility (poor submitter transparency)

---

## R5: Transition Audit Strategy

**Decision**: Record immutable stage transition events (`review_stage_event`) for every evaluator action.

**Rationale**: Immutable audit events provide traceability for disputes and make timeline rendering straightforward.

**Alternatives considered**:
- Mutable “latest only” status table (insufficient audit trail)
- Append JSON history onto idea row (harder querying and indexing)

---

## R6: Authorization Boundary for Review Actions

**Decision**: Enforce role checks in API handlers and RLS-compatible query constraints for stage config and transitions.

**Rationale**: Defense-in-depth: API enforces business rules and role boundaries while DB policies prevent unauthorized data access.

**Alternatives considered**:
- API-only authorization checks (weaker guarantees if query paths evolve)
- DB-only authorization checks (less explicit user-facing API error behavior)
