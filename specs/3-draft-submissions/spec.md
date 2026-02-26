# Feature Specification: Draft Idea Submissions

**Created**: 2026-02-26
**Status**: Draft
**Branch**: 3-draft-submissions

## Overview

This feature allows submitters to save incomplete idea submissions as drafts, enabling them to return later to continue editing and eventually submit their ideas. Drafts are private to the submitter, do not appear in the public idea listing, and are not visible to admins until formally submitted. This reduces friction in the idea submission process and prevents loss of partially composed proposals.

## Problem Statement

Currently, submitters must complete and submit their idea in a single session. If they navigate away, close the browser, or are interrupted before clicking submit, all entered data is lost. This creates a frustrating experience — especially for complex ideas requiring research, file gathering, or input from colleagues — and likely results in fewer and lower-quality submissions. Submitters have no way to incrementally build their proposal over time, leading to abandoned ideas that never reach the review pipeline.

## Clarifications

### Session 2026-02-26

- Q: Should auto-save auto-create a new draft record on first debounce, or must the user explicitly "Save Draft" first? → A: Auto-save auto-creates a new draft on first debounce (fully automatic); no explicit save needed to create the initial record.
- Q: How should attachment uploads be handled when no draft record exists yet? → A: Upload files immediately to a temporary staging area; move them to the idea's permanent storage path once the draft record is created.
- Q: How should draft visibility be enforced — database-level RLS or application-level filtering only? → A: Database-level RLS: modify existing idea SELECT policy to exclude drafts; add a separate owner-only SELECT policy for draft rows.
- Q: Should draft deletion be a soft delete or hard delete? → A: Soft delete — set a `deleted_at` timestamp on the row; exclude soft-deleted drafts from all queries; retain data for potential recovery.
- Q: Should the "My Drafts" navigation link show a count badge of active drafts? → A: Yes — display a count badge (e.g., "My Drafts (3)") so submitters have immediate awareness of pending work.

## User Scenarios & Testing

### Primary Scenarios

#### S1: Save a New Draft

**As** a submitter, **I want to** save my in-progress idea as a draft **so that** I can come back and finish it later without losing my work.

- **Given** an authenticated submitter is on the idea submission form and has entered any content (title, description, category, or attachment)
- **When** they click "Save Draft"
- **Then** the idea is saved with status "draft," the submitter sees a confirmation message, and they are redirected to their drafts list. If no title was entered, the draft is stored with a NULL/empty title and displayed as "Untitled Draft" in the drafts list.

#### S2: View My Drafts

**As** a submitter, **I want to** see a list of all my saved drafts **so that** I can choose which one to continue working on.

- **Given** an authenticated submitter navigates to their drafts page
- **When** the page loads
- **Then** they see a list of their draft ideas showing title (or "Untitled Draft" if no title), category (if selected), and last saved date, ordered by most recently saved first

#### S3: Resume Editing a Draft

**As** a submitter, **I want to** open a saved draft and continue editing it **so that** I can complete my idea over multiple sessions.

- **Given** an authenticated submitter clicks on a draft from their drafts list
- **When** the draft editing form loads
- **Then** all previously saved fields (title, description, category, category-specific fields, and attachments) are pre-populated, and the submitter can modify any field

#### S4: Submit a Completed Draft

**As** a submitter, **I want to** submit a completed draft as a formal idea **so that** it enters the review pipeline.

- **Given** an authenticated submitter is editing a draft and all required fields are filled in with valid values
- **When** they click "Submit"
- **Then** full validation runs (same rules as a normal idea submission), the idea status changes from "draft" to "submitted," and the submitter is redirected to the idea detail view

#### S5: Update an Existing Draft

**As** a submitter, **I want to** save additional changes to an existing draft **so that** my latest progress is preserved.

- **Given** an authenticated submitter is editing an existing draft
- **When** they make changes and click "Save Draft"
- **Then** the draft is updated with the new content and the last-saved timestamp is refreshed

#### S6: Delete a Draft

**As** a submitter, **I want to** delete a draft I no longer need **so that** my drafts list stays organized.

- **Given** an authenticated submitter views their drafts list or is editing a draft
- **When** they choose to delete a draft and confirm the action
- **Then** the draft is soft-deleted (`deleted_at` timestamp set), it disappears from the drafts list, and the submitter sees a confirmation message

#### S7: Auto-Save While Editing

**As** a submitter, **I want to** have my draft auto-saved periodically while I edit **so that** I don't lose work if I forget to save manually or encounter a browser issue.

- **Given** an authenticated submitter is on the idea form (new or existing draft) and has entered any content (title, description, category selection, or attachment)
- **When** they pause typing for a short period (after content has changed)
- **Then** if no draft record exists yet, one is auto-created (title may be empty, resulting in an "Untitled Draft"); if a draft already exists, it is updated — in both cases a subtle "Saved" indicator is displayed

### Edge Cases

- **EC1: Submit draft with missing required fields** — A submitter attempts to submit a draft that is missing required fields (e.g., description, category). The system displays validation errors for each missing or invalid field and keeps the idea as a draft.
- **EC2: Delete draft with attachments** — A submitter deletes a draft that has file attachments. The draft row is soft-deleted (`deleted_at` set); attachment files remain in storage but are inaccessible via queries. Future cleanup of orphaned storage files is out of scope (can be addressed with a maintenance job later).
- **EC3: Access another user's draft** — A submitter attempts to access a draft belonging to a different user via URL manipulation. The system denies access and returns an authorization error.
- **EC4: Edit a submitted idea as draft** — A submitter attempts to navigate to the draft edit route for an idea that has already been submitted. The system redirects to the idea detail view instead of showing the edit form.
- **EC5: Concurrent editing** — A submitter has the same draft open in two browser tabs and saves from both. The most recent save wins; no data corruption occurs.
- **EC6: Auto-save failure** — The auto-save encounters a network error. The system shows a non-intrusive warning indicating the save failed and retries on the next save interval.
- **EC7: Empty drafts list** — A submitter visits the drafts page when they have no saved drafts. The system displays an empty state message with a call-to-action to create a new idea.
- **EC8: Save draft with only a title** — A submitter saves a draft with only a title filled in. The draft is saved successfully since required-field validation only applies at submission time.
- **EC9: Staged attachment orphan cleanup** — A submitter adds file attachments on a new form but navigates away before auto-save or manual save creates the draft record. Staged files without an associated draft are cleaned up by a periodic background process or upon next session start.

## Functional Requirements

### Draft Lifecycle

| ID     | Requirement                                                                                                        | Acceptance Criteria                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| FR-01  | The system shall allow submitters to save an in-progress idea as a draft                                           | A "Save Draft" action is available on the idea submission form; idea is persisted with status "draft"   |
| FR-02  | The system shall allow saving a draft with no required fields; title may be empty or omitted                          | Drafts can be saved with any combination of fields filled (including none); an empty-title draft is displayed as "Untitled Draft" in the drafts list |
| FR-03  | The system shall allow submitters to update an existing draft with new content                                      | Editing a draft and saving updates the existing record; no duplicate records are created                |
| FR-04  | The system shall allow submitters to submit a completed draft as a formal idea                                      | Submitting a draft runs full validation and transitions status from "draft" to "submitted"              |
| FR-05  | Full idea validation rules shall apply when submitting a draft (title 5–100 chars, description 20–1000 chars, category required) | Incomplete or invalid drafts cannot be submitted; validation errors are shown inline                   |
| FR-06  | The system shall allow submitters to soft-delete their own drafts by setting a `deleted_at` timestamp               | Soft-deleted drafts are excluded from all queries (drafts list, listing, admin dashboard); associated attachment files remain in storage; data is retained for potential recovery                            |
| FR-07  | The system shall support adding and removing file attachments on drafts (same rules as normal submissions)          | Attachments can be added/removed while editing a draft; file type and size limits are enforced; if no draft record exists yet, files are uploaded to a temporary staging area and moved to permanent storage once the draft is created          |

### Draft Listing & Navigation

| ID     | Requirement                                                                                                        | Acceptance Criteria                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| FR-08  | The system shall provide a "My Drafts" page showing all draft ideas belonging to the current submitter             | Drafts page lists only the authenticated user's drafts; others' drafts are not visible                 |
| FR-09  | The drafts list shall display title (or "Untitled Draft"), category (if selected), and last saved date             | Each list entry shows these three pieces of information                                                |
| FR-10  | The drafts list shall be ordered by last saved date, most recent first                                             | Most recently saved drafts appear at the top                                                           |
| FR-11  | The system shall provide navigation to the drafts page from the main application shell, with a badge showing the user's active draft count | A "My Drafts" link is accessible from the primary navigation for submitters; a count badge (e.g., "My Drafts (3)") is displayed and updates when drafts are created or deleted; badge is hidden when count is zero                  |

### Draft Visibility & Access Control

| ID     | Requirement                                                                                                        | Acceptance Criteria                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| FR-12  | Draft ideas shall not appear in the public idea listing                                                            | The idea listing page excludes ideas with status "draft"                                               |
| FR-13  | Draft ideas shall not appear in the admin review dashboard                                                         | Admins do not see draft ideas in their review queue                                                    |
| FR-14  | Only the draft owner shall be able to view, edit, or delete their drafts, enforced at database level via RLS      | The existing idea SELECT policy is modified to exclude draft-status rows from "all authenticated users" access; a new RLS policy grants SELECT on draft rows only where `user_id = auth.uid() AND status = 'draft'`; UPDATE and DELETE policies likewise restrict drafts to owner only; requests to access another user's draft return an authorization error                                  |
| FR-15  | The system shall prevent editing an idea that has already been submitted (status is not "draft")                    | Navigating to the edit route for a submitted/reviewed idea redirects to the detail view                 |

### Auto-Save

| ID     | Requirement                                                                                                        | Acceptance Criteria                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| FR-16  | The system shall auto-save draft content after the submitter pauses editing for 3 seconds (debounced); if no draft record exists, auto-save creates one automatically | Changes are persisted automatically without requiring manual save; on a new form, the first auto-save creates the draft record; subsequent auto-saves update it |
| FR-17  | The system shall display a save status indicator showing "Saving...", "Saved", or "Save failed"                    | Submitter can see the current save state at all times while editing a draft                             |
| FR-18  | Auto-save failures shall not block the submitter from continuing to edit                                           | The form remains editable after a failed auto-save; retries on next change                              |
| FR-19  | Auto-save shall only trigger when content has actually changed since the last save                                  | No unnecessary save requests are made when the user has not modified any fields                         |

## Non-Functional Requirements: UI/UX

| ID     | Requirement                                                                                                        | Acceptance Criteria                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| NFR-01 | The draft save/submit actions shall use shadcn/ui Button components with distinct visual styles                     | "Save Draft" uses a secondary/outline variant; "Submit" uses the primary variant                       |
| NFR-02 | The auto-save indicator shall be subtle and non-intrusive                                                          | Small text or icon near the form header; does not obscure form content or require dismissal            |
| NFR-03 | The delete draft action shall require confirmation via an AlertDialog                                              | A confirmation dialog appears before deletion; accidental deletes are prevented                        |
| NFR-04 | The drafts list shall display an empty state with a call-to-action when no drafts exist                            | Empty state message and "Create New Idea" button shown when the list is empty                          |
| NFR-05 | Draft-related pages shall be responsive, functioning on viewports from 375px to 1440px+                            | No horizontal scroll or broken layouts on mobile viewports                                             |
| NFR-06 | The draft count badge in navigation shall use a shadcn/ui Badge component with a neutral or muted variant          | Badge is visually distinct but not attention-grabbing; hidden when count is zero                        |

## Success Criteria

| ID   | Criterion                                                                                                         | Measurement                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| SC-1 | Submitters can save a partially completed idea and return later to find all data preserved                         | Create a draft, close the browser, reopen and verify all fields are intact               |
| SC-2 | Submitters can complete and submit a draft in under 2 minutes (resuming from existing draft)                       | Timed user test from opening a draft to successful submission                            |
| SC-3 | Draft ideas do not appear in the public idea listing or admin review dashboard                                     | Verify listing and admin pages exclude draft-status ideas                                |
| SC-4 | Only the draft owner can access their own drafts                                                                  | Attempt to access another user's draft via direct URL returns authorization error         |
| SC-5 | Auto-save preserves content without manual intervention                                                           | Edit a draft, wait for auto-save indicator, refresh the page, verify changes are saved    |
| SC-6 | Deleting a draft soft-removes it from all visible queries                                                          | Delete a draft, verify it no longer appears in drafts list or any listing; database row retained with `deleted_at` set |
| SC-7 | Submitting a draft enforces the same validation rules as normal idea submission                                    | Attempt to submit a draft with missing required fields and verify validation errors       |
| SC-8 | The number of ideas ultimately submitted increases after the feature is available                                  | Compare submission rate before and after launch over a 30-day period                     |

## Key Entities

### Draft (extension of Idea)

- **idea_id**: Unique identifier (same entity as Idea, distinguished by status)
- **title**: 1+ characters for draft save; 5–100 characters for submission
- **description**: Optional for draft; 20–1000 characters required for submission
- **category**: Optional for draft; required for submission (from predefined list)
- **category_fields**: Optional for draft; validation rules apply at submission
- **status**: "draft" (new status value added to existing status set)
- **submitter_id**: Reference to the owning user
- **attachments**: Zero or more file attachments (same rules as submitted ideas)
- **deleted_at**: Soft-delete timestamp; NULL when active, set when deleted
- **created_at**: Initial draft creation timestamp
- **updated_at**: Last save timestamp (updated on each save/auto-save)

## Scope

### In Scope

- "Save Draft" action on the idea submission form
- "My Drafts" listing page accessible from main navigation
- Resume editing a saved draft with all fields pre-populated
- Submit a completed draft (transitions from "draft" to "submitted")
- Update existing drafts with new content
- Delete drafts with confirmation dialog
- File attachment support for drafts (add/remove, same type and size limits)
- Auto-save with debounce (3-second inactivity trigger)
- Save status indicator (Saving / Saved / Save failed)
- Draft visibility restrictions (hidden from public listing and admin dashboard)
- Owner-only access control for drafts
- New "draft" status added to idea status set

### Out of Scope

- Collaborative editing or sharing drafts with other users
- Draft expiration or automatic cleanup of old drafts
- Offline support or local storage fallback
- Version history or undo/redo for draft edits
- Admin ability to view or manage other users' drafts
- Rich text editing for description field
- Draft templates or pre-filled draft creation
- Notifications or reminders about incomplete drafts
- Bulk operations on drafts (delete all, submit all)

## Dependencies

- Existing idea submission form and validation logic (from portal MVP)
- Existing file attachment infrastructure (from multi-media support feature)
- Existing authentication and role-based access control
- Database schema supports adding "draft" to the idea status constraint
- Database RLS migration to modify existing idea SELECT policy and add owner-only draft policies
- Existing idea listing query can be updated to filter out drafts

## Assumptions

- **Same entity model**: Drafts are stored as ideas with status "draft," not in a separate table. This leverages the existing idea infrastructure (attachments, category fields) without duplication.
- **Relaxed validation for drafts**: No fields are required to save a draft — title may be empty (displayed as "Untitled Draft" in the drafts list). Full validation (title 5–100 chars, description 20–1000 chars, category required) is enforced only at submission time.
- **Private by default**: Drafts are visible only to their owner. Admins cannot see or manage other users' drafts — this is individual workspace, not a shared review artifact.
- **No draft limit**: There is no cap on the number of drafts a submitter can save. If abuse becomes a concern, a limit can be introduced in a future iteration.
- **Auto-save debounce**: A 3-second inactivity debounce was chosen as a reasonable balance between data safety and minimizing server requests. This is a configurable parameter.
- **Attachment handling**: Attachments added to drafts follow the same storage, size, and type rules as submitted ideas. When a draft is soft-deleted, attachment files remain in storage (consistent with the soft-delete approach — data is retained for potential recovery). Future cleanup of orphaned storage files is out of scope and can be addressed with a maintenance job later.
- **Status transition**: The only valid transition from "draft" is to "submitted." Drafts cannot be directly moved to "under_review," "accepted," or "rejected."
- **Existing listing unaffected**: The public idea listing and admin review dashboard will filter out ideas with status "draft," preserving current behavior for all users.
