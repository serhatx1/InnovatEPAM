# Data Model: Multi-Stage Review Workflow

**Feature**: 6-multi-stage-review
**Created**: 2026-02-26

## Entities

### 1) review_workflow

Represents one versioned, ordered stage workflow definition.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | UUID | PK | Workflow identifier |
| version | INTEGER | NOT NULL, UNIQUE | Monotonic version number |
| is_active | BOOLEAN | NOT NULL DEFAULT false | Exactly one active workflow at a time |
| created_by | UUID | NOT NULL | Admin who created/activated |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Audit metadata |
| activated_at | TIMESTAMPTZ | NULL | Set when workflow becomes active |

Validation rules:
- Only one active workflow is allowed at any time.
- Workflow must contain between 3 and 7 stages.

---

### 2) review_stage

Represents a stage entry belonging to a specific workflow version.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | UUID | PK | Stage identifier |
| workflow_id | UUID | FK → review_workflow.id, NOT NULL | Parent workflow |
| name | TEXT | NOT NULL | Stage label |
| position | INTEGER | NOT NULL | 1-based order |
| is_enabled | BOOLEAN | NOT NULL DEFAULT true | Stage can be disabled for future workflows |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Audit metadata |

Validation rules:
- Stage name cannot be empty.
- Stage names must be unique within a workflow.
- Position values must be contiguous from 1..N.

---

### 3) idea_stage_state

Tracks current stage state for each idea under a bound workflow version.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| idea_id | UUID | PK/FK → idea.id | One state record per idea in review |
| workflow_id | UUID | FK → review_workflow.id, NOT NULL | Bound workflow version |
| current_stage_id | UUID | FK → review_stage.id, NOT NULL | Current stage pointer |
| state_version | INTEGER | NOT NULL DEFAULT 1 | Optimistic concurrency token |
| terminal_outcome | TEXT | NULL | `accepted` or `rejected` when terminal |
| updated_by | UUID | NOT NULL | Last evaluator/admin actor |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Last state change timestamp |

Validation rules:
- Workflow binding is immutable once idea enters review.
- `terminal_outcome` is null until final-stage decision.

---

### 4) review_stage_event

Immutable audit log of stage decisions.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | UUID | PK | Event id |
| idea_id | UUID | FK → idea.id, NOT NULL | Target idea |
| workflow_id | UUID | FK → review_workflow.id, NOT NULL | Bound workflow at event time |
| from_stage_id | UUID | FK → review_stage.id, NULL | Null for workflow entry event |
| to_stage_id | UUID | FK → review_stage.id, NOT NULL | Target stage after event |
| action | TEXT | NOT NULL | `advance`, `return`, `hold`, `terminal` |
| evaluator_comment | TEXT | NULL | Optional during review; visibility-gated |
| actor_id | UUID | NOT NULL | Evaluator/admin who acted |
| occurred_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Event timestamp |

Validation rules:
- Events are append-only.
- `to_stage_id` must belong to the same workflow as `workflow_id`.

## Relationships

- `review_workflow 1:N review_stage`
- `idea 1:1 idea_stage_state` (for ideas that entered staged review)
- `idea 1:N review_stage_event`
- `review_workflow 1:N idea_stage_state`
- `review_workflow 1:N review_stage_event`

## State Transitions

### Workflow lifecycle

1. Draft workflow created with ordered stages.
2. Admin activates workflow version.
3. Exactly one workflow remains active for new ideas.

### Idea staged-review lifecycle

1. Idea enters review and gets `idea_stage_state` bound to active workflow version.
2. Evaluator performs valid stage actions (`advance`, `return`, `hold`) sequentially.
3. Final stage decision sets `terminal_outcome` and prevents further progression.

### Concurrency rule

- Transition request must include expected `state_version`.
- Update succeeds only if expected version matches persisted version.
- On success, `state_version` increments by 1; on mismatch, request is rejected as conflict.

## Visibility Model (Role-Oriented)

- **Admin/Evaluator**: full stage history, actor identity, comments (subject to existing role policy).
- **Submitter during non-terminal**: current stage + timestamps only.
- **Submitter after terminal**: stage timeline plus fields allowed by existing portal role policy.
