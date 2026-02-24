# US3: Review & Decide Ideas (Priority: P3)

## Story
As an admin/evaluator, I can review ideas, change status, and provide comments so submissions receive clear decisions.

## Why this priority
Completes the MVP lifecycle from submission to business decision.

## Independent test
Log in as admin, open an idea, move it to `under_review` and then `accepted`/`rejected` with comment, and verify submitter can view outcome.

## Acceptance Scenarios
1. **Given** an admin user, **When** they update an idea to `under_review`, `accepted`, or `rejected`, **Then** the new status is persisted and visible.
2. **Given** an admin rejecting an idea, **When** they submit without comment, **Then** rejection is blocked until a comment is provided.
3. **Given** a finalized decision, **When** submitter views idea detail, **Then** status and evaluator comment are shown.
