# Feature Specification: Multi-Stage Review Workflow

**Feature Branch**: `[6-multi-stage-review]`
**Created**: 2026-02-26
**Status**: Draft
**Input**: "Phase 5 Multi-Stage Review (configurable stages)"

## Clarifications

### Session 2026-02-26

- Q: How should stage workflow updates affect ideas already in progress? → A: In-progress ideas stay on the workflow version they started with; new configurations apply only to new ideas.
- Q: How should concurrent evaluator updates to the same idea stage be handled? → A: Use optimistic concurrency; reject stale updates and require refresh/retry.
- Q: What review information should submitters see while an idea is still in review? → A: Show current stage and timestamps, but hide evaluator identities and comments until terminal decision.

## User Scenarios & Testing

### User Story 1 - Configure Review Stages (Priority: P1)

A reviewer administrator defines an ordered review workflow for idea evaluation by creating, naming, reordering, and enabling review stages that submissions must pass through.

**Why this priority**: Without configurable stages, the review process remains a single-step decision and cannot support real workflow progression.

**Independent Test**: Create a new workflow with at least three stages, save it, and confirm the same stage order is used for newly submitted ideas.

**Acceptance Scenarios**:

1. **Given** an administrator is managing review settings, **When** they create a stage list and save it, **Then** the system stores the exact stage names and order.
2. **Given** an active stage workflow exists, **When** a new idea is submitted, **Then** the idea starts at the first configured stage.
3. **Given** an administrator updates the stage configuration, **When** the update is valid, **Then** the new configuration is applied for future stage transitions.

---

### User Story 2 - Advance Ideas Through Stages (Priority: P2)

An evaluator moves an idea forward, backward, or keeps it at the current stage with comments, while the system records each stage decision in sequence.

**Why this priority**: Stage configuration provides value only when evaluators can apply it consistently during day-to-day review work.

**Independent Test**: Move one idea through multiple configured stages and verify that the current stage and stage history are accurate after each decision.

**Acceptance Scenarios**:

1. **Given** an idea is in an active stage, **When** an evaluator advances it, **Then** the idea moves to the next configured stage.
2. **Given** an evaluator reviews an idea, **When** they record a stage decision with comments, **Then** the decision is stored in the idea’s review history with timestamp and actor.
3. **Given** an idea reaches the final configured stage, **When** the final decision is made, **Then** the idea receives a terminal outcome and can no longer be advanced.

---

### User Story 3 - Track Stage Progress (Priority: P3)

A submitter or reviewer can view where an idea currently is in the review workflow and what stage decisions were made previously.

**Why this priority**: Visibility into review progress reduces confusion and status inquiries, improving trust in the process.

**Independent Test**: Open an idea with prior stage transitions and confirm the current stage and chronological decision trail are visible and understandable.

**Acceptance Scenarios**:

1. **Given** an idea has entered review, **When** a user views its details, **Then** the current stage is clearly shown.
2. **Given** an idea has multiple stage decisions, **When** a user checks review history, **Then** they can see each stage decision in chronological order.

---

### Edge Cases

- A stage configuration save is rejected if stage names are empty or duplicated.
- The system blocks deleting or disabling a stage that is currently assigned to active ideas unless reassignment is provided.
- If an evaluator attempts to skip stages, the system rejects the action and requires sequential progression.
- If stage configuration changes while ideas are in progress, existing ideas continue on their original workflow version while new ideas use the new active workflow.
- If two evaluators submit stage decisions concurrently for the same idea, the system accepts only the first valid update and rejects stale updates with retry guidance.

## Functional Requirements

- **FR-001**: The system MUST allow authorized administrators to create, update, reorder, activate, and deactivate review stages.
- **FR-002**: The system MUST enforce a single active ordered stage workflow for review progression at any time.
- **FR-003**: The system MUST assign each newly submitted idea to the first stage of the active workflow.
- **FR-004**: The system MUST allow authorized evaluators to move ideas only to valid stage destinations based on workflow rules.
- **FR-005**: The system MUST record each stage decision event with idea identifier, stage, actor, timestamp, and optional comment.
- **FR-006**: The system MUST display each idea’s current stage and full stage decision history to authorized users.
- **FR-007**: The system MUST prevent invalid stage configurations, including empty stage names, duplicate stage names, and empty workflows.
- **FR-008**: The system MUST prevent final-stage ideas from being advanced further and require a terminal outcome at completion.
- **FR-009**: The system MUST preserve review continuity for in-progress ideas when stage configuration changes by binding each in-progress idea to its starting workflow version.
- **FR-010**: The system MUST apply newly activated workflow configurations only to ideas created after activation.
- **FR-011**: The system MUST enforce optimistic concurrency on stage transitions so stale writes are rejected rather than overwriting current stage state.
- **FR-012**: During non-terminal review, submitters MUST be able to see current stage and stage timestamps but MUST NOT see evaluator identity or evaluator comments.
- **FR-013**: After a terminal decision, authorized visibility rules MAY reveal evaluator identity and comments according to existing portal role policies.

## Key Entities

- **Review Stage**: Defines a named step in the ordered review workflow with status (active/inactive) and position.
- **Review Workflow**: Represents the current ordered collection of review stages used for idea progression.
- **Idea Stage State**: Captures an idea’s current position in the workflow and whether it is terminal.
- **Stage Decision Event**: Immutable audit record of a stage action containing actor, decision, comments, and timestamp.

## Success Criteria

- **SC-001**: Administrators can configure and save a 3–7 stage workflow in under 5 minutes in at least 90% of UAT attempts.
- **SC-002**: 95% of stage transitions initiated by evaluators complete successfully on first attempt when inputs are valid.
- **SC-003**: 100% of reviewed ideas show both current stage and complete stage history in acceptance testing.
- **SC-004**: Stage-order violations and invalid configuration attempts are rejected with clear feedback in 100% of tested negative scenarios.

## Assumptions

- Existing role distinctions (submitter, evaluator/admin) remain in effect and govern who can configure or execute stage transitions.
- In-progress ideas are not auto-migrated to newly activated workflows; they continue on their original workflow version.
- Terminal outcomes remain aligned with existing evaluation outcomes already used in the portal.
