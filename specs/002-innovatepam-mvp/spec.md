# Feature Specification: InnovatEPAM Portal MVP

**Feature Branch**: `002-innovatepam-mvp`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: User description: "InnovatEPAM Portal MVP with auth, idea submission, and evaluation workflow"

## Artifact Split

- Epics are separated under `epics/`.
- User stories are separated under `stories/`.
- Index files: `epics/README.md` and `stories/README.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authentication & Access (Priority: P1)

As an employee, I can register, log in, and log out so I can securely access the portal.

**Why this priority**: All other features require authenticated access and role-aware behavior.

**Independent Test**: Register a new account, log in, log out, and confirm protected pages require authentication.

**Acceptance Scenarios**:

1. **Given** a new user, **When** they submit valid email and password, **Then** an account is created and the user can sign in.
2. **Given** a user with valid credentials, **When** they log in, **Then** they are redirected to the application home.
3. **Given** an authenticated user, **When** they log out, **Then** the session is terminated and protected pages are inaccessible.

---

### User Story 2 - Submit Innovation Ideas (Priority: P2)

As a submitter, I can create an idea with required fields and one file attachment so my proposal can be reviewed.

**Why this priority**: Idea capture is the core product value after access is established.

**Independent Test**: Log in as submitter, submit idea with title/description/category and one file, then confirm it appears in list with `submitted` status.

**Acceptance Scenarios**:

1. **Given** an authenticated submitter, **When** they submit valid title, description, category, and one attachment, **Then** the idea is saved with status `submitted`.
2. **Given** missing required fields, **When** the form is submitted, **Then** validation errors are shown and the idea is not created.

---

### User Story 3 - Review & Decide Ideas (Priority: P3)

As an admin/evaluator, I can review ideas, change status, and provide comments so submissions receive clear decisions.

**Why this priority**: Completes the MVP lifecycle from submission to business decision.

**Independent Test**: Log in as admin, open an idea, move it to `under_review` and then `accepted`/`rejected` with comment, and verify submitter can view outcome.

**Acceptance Scenarios**:

1. **Given** an admin user, **When** they update an idea to `under_review`, `accepted`, or `rejected`, **Then** the new status is persisted and visible.
2. **Given** an admin rejecting an idea, **When** they submit without comment, **Then** rejection is blocked until a comment is provided.
3. **Given** a finalized decision, **When** submitter views idea detail, **Then** status and evaluator comment are shown.

### Edge Cases

- What happens when a user uploads a file larger than allowed limit?
- How does system handle expired/invalid sessions during form submission?
- What happens when a submitter tries to access admin-only evaluation actions?
- How are duplicate rapid submissions handled (double-click / retry)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to register, log in, and log out using email/password authentication.
- **FR-002**: System MUST enforce role distinction between `submitter` and `admin`.
- **FR-003**: System MUST provide an idea submission form with required fields: `title`, `description`, and `category`.
- **FR-004**: System MUST allow exactly one file attachment per idea submission.
- **FR-005**: System MUST store each new idea with initial status `submitted`.
- **FR-006**: System MUST provide idea listing and idea detail views for authenticated users.
- **FR-007**: System MUST allow admins to update idea status among `submitted`, `under_review`, `accepted`, and `rejected`.
- **FR-008**: System MUST allow admins to save evaluator comments with decisions.
- **FR-009**: System MUST require evaluator comment when status is set to `rejected`.
- **FR-010**: System MUST prevent submitters from executing admin-only actions.

### Key Entities *(include if feature involves data)*

- **UserProfile**: Stores application role and metadata for authenticated user (`id`, `email`, `role`, `created_at`).
- **Idea**: Innovation proposal record (`id`, `user_id`, `title`, `description`, `category`, `status`, `attachment_url`, `evaluator_comment`, timestamps).
- **Attachment**: Logical single-file reference bound to an idea (URL/path, size/type metadata).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New users can complete register + login flow in under 2 minutes.
- **SC-002**: Submitters can create an idea with one attachment in a single uninterrupted flow.
- **SC-003**: Admins can move an idea from `submitted` to final decision with visible comment.
- **SC-004**: 100% of role-restricted actions are blocked for unauthorized users in MVP flows.
