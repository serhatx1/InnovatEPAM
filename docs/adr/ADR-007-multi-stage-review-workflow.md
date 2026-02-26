# ADR-007: Multi-Stage Review Workflow Architecture

**Status**: Accepted  
**Date**: 2026-02-27  
**Context**: InnovatEPAM Portal – Feature 6 (Multi-Stage Review)

## Decision

Implement a versioned, configurable multi-stage review workflow with immutable event history, optimistic concurrency control, and role-based visibility shaping.

## Context

The original review model used a flat status field (`submitted → under_review → accepted/rejected`). As the portal scales, admins need configurable review pipelines with ordered stages (3–7), the ability to advance, return, or hold ideas at any stage, and a clear audit trail of all decisions.

Key requirements:
- Admin-configurable stage workflows with versioned activation
- Ideas bind to the workflow version active at time of submission
- Evaluator transitions must be conflict-safe for concurrent reviewers
- Submitters see limited progress during review (no evaluator identity/comments until terminal)

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| **Versioned workflow + immutable events** | Full audit trail, version isolation, concurrent reviewer safety | More tables, migration complexity |
| Status enum extension | Simple, single column | No ordering, no history, no concurrent safety |
| State machine library (XState) | Formal transitions | Over-engineered for server-side DB workflow, client-only tool |
| Workflow engine (Temporal) | Industrial-grade | Massive infra overhead for MVP scope |

## Architecture

### Data Model (4 tables)

- **`review_workflow`** — Workflow configuration with monotonic version number and active flag. Only one workflow is active at a time.
- **`review_stage`** — Ordered stages (position 1..N) belonging to a workflow. 3–7 stages enforced by application validation.
- **`idea_stage_state`** — Current stage position for each idea. Includes `state_version` for optimistic concurrency and `terminal_outcome` for finalized decisions.
- **`review_stage_event`** — Immutable append-only audit log recording every transition with actor, action, comment, and timestamps.

### Workflow Version Binding

When an idea enters review, it binds to the currently active workflow version via `idea_stage_state.workflow_id`. The idea continues through that workflow version even if the admin activates a newer workflow. New ideas bind to the latest active version.

### Optimistic Concurrency

Every transition requires an `expectedStateVersion` parameter. The server compares it against `idea_stage_state.state_version`:
- **Match** → transition proceeds, version increments
- **Mismatch** → HTTP 409 Conflict, client must refresh and retry

This prevents lost updates when multiple reviewers act on the same idea simultaneously.

### Transition Actions

| Action | Effect |
|--------|--------|
| `advance` | Move to next stage (blocked at last stage) |
| `return` | Move to previous stage (blocked at first stage) |
| `hold` | Keep at current stage with comment |
| `terminal_accept` | Accept at last stage (final, irreversible) |
| `terminal_reject` | Reject at last stage (final, irreversible) |

### Visibility Shaping

- **Admin/Evaluator**: Full progress with actor identity, comments, actions, and terminal outcome
- **Submitter (non-terminal)**: Stage name + timestamps only — no evaluator identity or comments
- **Submitter (post-terminal)**: Full progress revealed after final decision

## Module Structure

```
src/lib/queries/review-workflow.ts   # Workflow CRUD
src/lib/queries/review-state.ts      # Stage state & event CRUD
src/lib/review/concurrency.ts        # Version check + 409 response
src/lib/review/workflow-binding.ts   # Bind idea to active workflow
src/lib/review/visibility.ts         # Role-based progress shaping
src/app/api/admin/review/workflow/   # GET/PUT workflow config
src/app/api/admin/review/ideas/[id]/ # Stage state + transition endpoints
src/app/api/ideas/[id]/review-progress/ # Submitter/reviewer progress
```

## Consequences

- Migration `007_add_multi_stage_review.sql` adds 4 tables with RLS policies
- Every stage transition creates an immutable event record (audit compliance)
- Workflow activation is admin-only; stage mutations require admin/evaluator role
- The flat `idea.status` field is preserved for backward compatibility but stage-level tracking is authoritative for review progress
- Future enhancements (parallel stages, conditional branching) can extend the stage model without breaking the event log
