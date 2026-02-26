# Feature Specification: Scoring System (1–5 Ratings)

**Feature Branch**: `8-scoring-system`
**Created**: 2026-02-26
**Status**: Draft
**Input**: "Scoring System (1-5 ratings)"

## User Scenarios & Testing

### User Story 1 - Score an Idea During Review (Priority: P1)

An evaluator assigns a numeric score from 1 to 5 to an idea they are reviewing, along with an optional comment explaining the rating, so that evaluation decisions are backed by structured quantitative feedback rather than only accept/reject actions.

**Why this priority**: Scoring is the core value of this feature. Without the ability to assign ratings, no aggregate metrics or comparative rankings are possible.

**Independent Test**: Log in as an evaluator, open an idea that is under review, submit a score of 4 with a comment, and confirm the score is persisted and visible on the idea's review detail view.

**Acceptance Scenarios**:

1. **Given** an evaluator is viewing an idea that is currently under review, **When** they select a score of 3 and submit, **Then** the score is saved and displayed alongside the idea's review information.
2. **Given** an evaluator is viewing an idea under review, **When** they attempt to submit without selecting a score value, **Then** the system rejects the submission and displays a validation message requiring a score.
3. **Given** an evaluator has already scored an idea, **When** they return to the same idea and submit a new score, **Then** the previous score is replaced with the new score (one score per evaluator per idea).
4. **Given** an idea has reached a terminal outcome (accepted or rejected), **When** an evaluator attempts to score it, **Then** the system prevents scoring and indicates the idea is no longer under review.

---

### User Story 2 - View Aggregate Scores on an Idea (Priority: P1)

An administrator (or evaluator) views the aggregated score summary for an idea — including the average rating, number of evaluators who scored, and the score distribution — to make informed review decisions based on collective evaluator input.

**Why this priority**: Individual scores only become meaningful when aggregated; without a summary view, evaluators and admins cannot compare ideas or use scores in decision-making.

**Independent Test**: Have three evaluators score the same idea with values 3, 4, and 5. Verify the idea detail shows an average of 4.0, a count of 3, and the individual score breakdown.

**Acceptance Scenarios**:

1. **Given** an idea has been scored by multiple evaluators, **When** an administrator views the idea detail, **Then** the average score (rounded to one decimal), total score count, and individual scores are displayed.
2. **Given** an idea has not been scored by any evaluator, **When** a user views the idea detail, **Then** the scoring section shows "No scores yet" or equivalent placeholder.
3. **Given** blind review is enabled, **When** an evaluator views scores for an idea, **Then** individual scores are displayed without revealing the identity of the evaluator who submitted each score.

---

### User Story 3 - Compare Ideas by Score (Priority: P2)

An administrator views a sortable and filterable listing of ideas with their average scores, enabling comparison across submissions to prioritize which ideas deserve advancement or further attention.

**Why this priority**: Score comparison across ideas enables data-driven prioritization and makes the scoring system actionable beyond individual idea review.

**Independent Test**: Score several ideas with varying ratings. Open the admin idea listing, sort by average score descending, and confirm ideas appear in the correct order.

**Acceptance Scenarios**:

1. **Given** multiple ideas have been scored, **When** an administrator views the ideas listing, **Then** each idea's average score is visible alongside its title and status.
2. **Given** the ideas listing is displayed, **When** an administrator sorts by average score, **Then** ideas are reordered from highest to lowest (or lowest to highest) average score.
3. **Given** some ideas have no scores, **When** the listing is sorted by score, **Then** unscored ideas appear at the bottom of the list.

---

### Edge Cases

- An evaluator submits a score value outside the 1–5 range (e.g., 0 or 6): the system rejects it with a clear validation error.
- An evaluator submits a non-integer value (e.g., 3.5): the system rejects it; only whole numbers 1 through 5 are accepted.
- Two evaluators submit scores for the same idea simultaneously: both scores are saved independently without conflict (no concurrency issue since each evaluator's score is unique per idea).
- If an evaluator's account is deactivated or removed after scoring, existing scores remain in the system and continue to count toward aggregates.
- A score comment exceeds the maximum allowed length: the system rejects the submission with a clear length validation error.
- If an idea is deleted (soft-deleted), its scores are no longer included in listing views or aggregate calculations.

## Functional Requirements

- **FR-001**: The system MUST allow evaluators to assign a score of 1, 2, 3, 4, or 5 (integer only) to any idea currently under review.
- **FR-002**: The system MUST enforce one score per evaluator per idea; submitting a new score replaces the evaluator's previous score for that idea.
- **FR-003**: The system MUST accept an optional comment (max 500 characters) alongside each score submission.
- **FR-004**: The system MUST prevent scoring of ideas that have already reached a terminal review outcome (accepted or rejected).
- **FR-005**: The system MUST prevent submitters from scoring their own ideas.
- **FR-006**: The system MUST display the aggregate score for each idea: average rating (to one decimal place), total number of scores, and individual score entries.
- **FR-007**: When blind review is enabled, individual score entries MUST NOT reveal evaluator identity to other evaluators or submitters. Administrators always see full identity.
- **FR-008**: The system MUST support sorting ideas by average score on the admin listing view.
- **FR-009**: The system MUST validate all score submissions: reject values outside 1–5, non-integer values, and comments exceeding the maximum length.
- **FR-010**: The system MUST persist scores durably so they survive restarts and are consistent across all sessions.
- **FR-011**: Soft-deleted ideas MUST have their scores excluded from any listing or aggregate display.

## Key Entities

- **Idea Score**: A single evaluator's rating for an idea, containing the score value (1–5), optional comment, evaluator reference, and timestamp. Uniquely identified by the combination of idea and evaluator.
- **Score Aggregate**: A computed summary of all scores for a given idea, including average, count, and distribution. Not a stored entity — derived at query time from individual scores.

## Success Criteria

- **SC-001**: Evaluators can score an idea in under 10 seconds from the idea detail view, with no more than 2 interactions (select score + submit).
- **SC-002**: Aggregate score (average, count) is visible on idea detail within one page load after any score is submitted.
- **SC-003**: Administrators can sort the ideas listing by average score and identify the top-rated idea within 5 seconds.
- **SC-004**: 100% of invalid score submissions (out-of-range, non-integer, missing value) are rejected with clear user-facing feedback.
- **SC-005**: Scoring workflow functions identically whether blind review is enabled or disabled — score submission is unaffected by anonymization mode.

## Assumptions

- The existing role-based access control (submitter, evaluator/admin) governs who can score. Only evaluators and admins can submit scores.
- The multi-stage review workflow (Feature 6) is implemented. Scoring integrates as an evaluator action available during active review stages, not as a replacement for stage transitions.
- Blind review (Feature 7) is implemented. The scoring system respects blind review settings for evaluator identity visibility on score entries.
- The 1–5 integer scale is sufficient; half-star or decimal ratings are out of scope.
- Weighted scoring (different weights per evaluator or per review stage) is out of scope for this feature.
- Score history (tracking previous scores after an evaluator updates their rating) is out of scope; only the latest score per evaluator per idea is retained.
- There is no minimum number of scores required before an aggregate is displayed — even a single score shows the average.
