# US2: Submit Innovation Ideas (Priority: P2)

## Story
As a submitter, I can create an idea with required fields and one file attachment so my proposal can be reviewed.

## Why this priority
Idea capture is the core product value after access is established.

## Independent test
Log in as submitter, submit idea with title/description/category and one file, then confirm it appears in list with `submitted` status.

## Acceptance Scenarios
1. **Given** an authenticated submitter, **When** they submit valid title, description, category, and one attachment, **Then** the idea is saved with status `submitted`.
2. **Given** missing required fields, **When** the form is submitted, **Then** validation errors are shown and the idea is not created.
