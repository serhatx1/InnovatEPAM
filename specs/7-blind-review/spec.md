# Feature Specification: Blind Review (Anonymous Evaluation)

**Feature Branch**: `7-blind-review`
**Created**: 2026-02-26
**Status**: Draft
**Input**: "Blind Review (anonymous evaluation)"

## User Scenarios & Testing

### User Story 1 - Enable Blind Review Mode (Priority: P1)

An administrator enables blind review for the portal so that evaluators cannot see who submitted an idea during the review process, eliminating identity-based bias from evaluation decisions.

**Why this priority**: Blind review is the core value proposition of this feature — without admin control over the mode, anonymization cannot be enforced consistently.

**Independent Test**: An admin enables blind review, then an evaluator opens an idea that is under review and confirms no submitter name, email, or profile information is visible anywhere on the evaluation screen.

**Acceptance Scenarios**:

1. **Given** an administrator is on the review settings page, **When** they toggle blind review on and save, **Then** the system records that blind review is active for all future evaluations.
2. **Given** blind review is enabled, **When** an administrator toggles it off and saves, **Then** evaluators can see submitter identity on subsequent idea views.
3. **Given** blind review mode changes, **When** an idea is already in active review, **Then** the system applies the current blind-review setting for all future views of that idea (not locked to the setting at submission time).

---

### User Story 2 - Anonymous Idea Evaluation (Priority: P1)

An evaluator reviews and makes stage decisions on ideas without seeing any submitter-identifying information, ensuring fair and unbiased assessment based solely on idea merit.

**Why this priority**: This is the primary user-facing behavior that delivers the blind review value — evaluators must experience fully anonymized idea views during evaluation.

**Independent Test**: Submit an idea as a known user, enable blind review, then log in as an evaluator and confirm the idea detail page shows a generic placeholder instead of submitter name/email, and that stage transition forms work normally without revealing identity.

**Acceptance Scenarios**:

1. **Given** blind review is enabled and an evaluator opens an idea under review, **When** the idea detail loads, **Then** submitter name and email are replaced with a generic anonymous label (e.g., "Anonymous Submitter").
2. **Given** blind review is enabled, **When** an evaluator views the idea listing page, **Then** the submitter column shows anonymous labels for all ideas under review.
3. **Given** blind review is enabled, **When** an evaluator advances, returns, or holds an idea through a review stage, **Then** the stage transition completes successfully without revealing submitter identity.
4. **Given** blind review is enabled, **When** an idea reaches a terminal decision (accepted or rejected), **Then** the submitter identity is revealed to evaluators on that idea's detail page.

---

### User Story 3 - Submitter Self-View During Blind Review (Priority: P2)

A submitter can still see their own ideas with full attribution, including their name and submission details, even while blind review is active — the anonymization applies only to evaluator-facing views.

**Why this priority**: Submitters must retain full context of their own submissions; blind review should not degrade the submitter experience.

**Independent Test**: Enable blind review, log in as the submitter who created an idea, view that idea, and confirm full submitter details (own name, email) are visible.

**Acceptance Scenarios**:

1. **Given** blind review is enabled, **When** a submitter views their own idea, **Then** their name and profile details are displayed normally.
2. **Given** blind review is enabled, **When** a submitter views the ideas listing filtered to their submissions, **Then** their name appears as the author on each of their ideas.

---

### Edge Cases

- If blind review is toggled off while an evaluator is mid-review on an idea, the next page load or navigation shows the submitter identity (no mid-session caching of anonymous state).
- Administrators always see full submitter identity regardless of blind review setting, since they manage the portal and user accounts.
- If an idea's content contains self-identifying information (e.g., "I, John Doe, propose…"), the system does not redact body text — anonymization covers only structured profile fields (name, email, avatar).
- Attachment filenames that contain submitter names are not redacted; only structured identity fields are masked.
- If blind review is enabled and an evaluator uses browser developer tools or API calls directly, the API must still strip submitter identity from response payloads.

## Functional Requirements

- **FR-001**: The system MUST provide an administrator-only setting to enable or disable blind review mode for the portal.
- **FR-002**: When blind review is enabled, the system MUST replace submitter name, email, and avatar with a generic anonymous placeholder in all evaluator-facing idea views (listing, detail, review panel).
- **FR-003**: When blind review is enabled, the system MUST strip submitter identity fields from API response payloads served to evaluator roles, not just from the UI layer.
- **FR-004**: The system MUST NOT anonymize submitter identity for administrators, who retain full visibility regardless of blind review setting.
- **FR-005**: The system MUST NOT anonymize a submitter's own identity when they view their own ideas.
- **FR-006**: When an idea reaches a terminal review outcome (accepted or rejected), the system MUST reveal the submitter identity to evaluators on that idea, regardless of blind review setting.
- **FR-007**: The system MUST apply the current blind review setting at view time (not at submission time), so toggling the setting immediately affects all subsequent page loads.
- **FR-008**: Blind review anonymization MUST cover only structured identity fields (name, email, avatar/profile image). Free-text content within the idea body or attachments is not redacted.
- **FR-009**: The system MUST persist the blind review setting so it survives server restarts and is consistent across all evaluator sessions.
- **FR-010**: Stage transition actions (advance, return, hold, terminal) MUST function identically whether blind review is enabled or disabled — anonymization affects display only, not workflow logic.

## Key Entities

- **Blind Review Setting**: A portal-wide configuration flag indicating whether blind review mode is currently active, with audit metadata (who toggled, when).
- **Anonymous Display Mask**: The presentation-layer transformation that replaces submitter identity fields with a generic placeholder, applied conditionally based on viewer role, idea terminal state, and blind review setting.

## Success Criteria

- **SC-001**: Evaluators cannot identify the submitter of any idea under active review when blind review is enabled, as verified by inspecting both the UI and raw API responses during acceptance testing.
- **SC-002**: Toggling blind review on or off takes effect for evaluator views within one page load, with no caching delay.
- **SC-003**: 100% of stage transitions succeed without error regardless of blind review mode, confirming anonymization does not interfere with review workflow.
- **SC-004**: Submitters retain full visibility of their own identity on their own ideas at all times, confirmed across all views.
- **SC-005**: Administrator toggle of blind review setting completes in under 5 seconds, including persistence confirmation.

## Assumptions

- The portal already has role-based access control distinguishing submitters, evaluators, and administrators.
- The existing multi-stage review workflow (Feature 6) is implemented and functional; blind review layers on top of it as a display-level concern.
- A single portal-wide blind review toggle is sufficient; per-stage or per-category blind review is out of scope for this feature.
- "Anonymous Submitter" (or equivalent neutral label) is an acceptable placeholder — no unique anonymous identifiers per submitter are required.
- Evaluators do not need to distinguish between different anonymous submitters; each idea is evaluated independently on merit.
- The existing visibility shaping layer (ADR-007) that hides evaluator identity from submitters during review is already in place and will not be modified by this feature.

## User Scenarios & Testing

### User Story 1 - [Title] (Priority: P1)

[Describe the primary user journey in plain language]

**Why this priority**: [Explain value and urgency]

**Independent Test**: [How to validate this story end-to-end]

**Acceptance Scenarios**:

1. **Given** [initial context], **When** [action], **Then** [expected outcome]
2. **Given** [initial context], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Title] (Priority: P2)

[Describe the secondary journey]

**Why this priority**: [Explain dependency or business value]

**Independent Test**: [How to validate this story end-to-end]

**Acceptance Scenarios**:

1. **Given** [initial context], **When** [action], **Then** [expected outcome]

---

### Edge Cases

- [Potential failure/edge condition]
- [Validation or boundary condition]

## Functional Requirements

- **FR-001**: [Testable behavior statement]
- **FR-002**: [Testable behavior statement]
- **FR-003**: [Testable behavior statement]

## Key Entities

- **[Entity Name]**: [Purpose and core attributes]

## Success Criteria

- **SC-001**: [Measurable outcome]
- **SC-002**: [Measurable outcome]
- **SC-003**: [Measurable outcome]

## Assumptions

- [Reasonable default assumption derived from context]
- [Any dependency or policy assumption]
