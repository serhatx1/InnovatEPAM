# Feature Specification: InnovatEPAM Portal MVP

**Created**: 2026-02-24
**Status**: Implemented
**Branch**: 1-portal-mvp

## Overview

The InnovatEPAM Portal MVP delivers an internal employee innovation management platform where employees (submitters) can propose ideas with supporting file attachments, and designated administrators can evaluate those ideas through a structured review workflow. The MVP establishes the foundational user experience for idea lifecycle management — from submission through evaluation.

## Problem Statement

EPAM employees currently lack a centralized, structured channel for submitting innovative ideas and receiving timely feedback. Without a dedicated platform, ideas are lost in email threads, chat messages, or informal conversations. Administrators have no consistent process for evaluating and tracking submitted proposals. This leads to missed innovation opportunities, low employee engagement in ideation, and no visibility into the pipeline of proposed improvements.

## User Scenarios & Testing

### Primary Scenarios

#### S1: New User Registration

**As** an employee, **I want to** create an account with my email and password **so that** I can access the portal.

- **Given** an unregistered user visits the registration page
- **When** they provide a valid email address and a password meeting minimum requirements
- **Then** their account is created, they are assigned the "submitter" role by default, and they are redirected to the ideas listing page

#### S2: User Login

**As** a registered user, **I want to** log in with my email and password **so that** I can access my account.

- **Given** a registered user visits the login page
- **When** they enter their correct email and password
- **Then** they are authenticated and redirected to the ideas listing page

#### S3: User Logout

**As** an authenticated user, **I want to** log out **so that** my session is securely ended.

- **Given** an authenticated user
- **When** they trigger the logout action
- **Then** their session is terminated and they are redirected to the login page

#### S4: Submit a New Idea

**As** a submitter, **I want to** submit an idea with a title, description, category, and optional file attachment **so that** it can be reviewed by administrators.

- **Given** an authenticated submitter navigates to the new idea form
- **When** they fill in the title (required, 5–100 characters), description (required, 20–1000 characters), select a category from a predefined list, optionally attach a single file (max 5 MB; PDF, PNG, JPG, or DOCX), and submit
- **Then** the idea is saved with status "submitted," the attached file (if any) is stored securely, and the submitter is redirected to the idea detail view

#### S5: Browse Ideas

**As** an authenticated user, **I want to** see a list of all submitted ideas **so that** I can browse innovation proposals.

- **Given** an authenticated user visits the ideas listing page
- **When** the page loads
- **Then** they see a list of ideas displaying each idea's title, category, current status, and submission date, ordered by most recent first

#### S6: View Idea Details

**As** an authenticated user, **I want to** view the full details of an idea **so that** I can understand the proposal completely.

- **Given** an authenticated user clicks on an idea from the listing
- **When** the detail page loads
- **Then** they see the title, full description, category, status, submission date, submitter name, attached file (with download link if present), and any admin review comments

#### S7: Admin Evaluates an Idea — Accept

**As** an admin, **I want to** accept a submitted idea **so that** it can move forward in the innovation pipeline.

- **Given** an admin views a submitted idea with status "submitted" or "under review"
- **When** they choose "Accept" and optionally add a comment
- **Then** the idea status changes to "accepted" and the comment (if provided) is saved

#### S8: Admin Evaluates an Idea — Reject

**As** an admin, **I want to** reject a submitted idea with a mandatory explanation **so that** the submitter understands why.

- **Given** an admin views a submitted idea with status "submitted" or "under review"
- **When** they choose "Reject"
- **Then** they must provide a comment (required, minimum 10 characters) before the rejection is completed, and the idea status changes to "rejected"

#### S9: Admin Review Dashboard

**As** an admin, **I want to** see a dashboard of ideas pending review **so that** I can efficiently manage my evaluation workload.

- **Given** an admin navigates to the admin review page
- **When** the page loads
- **Then** they see ideas filtered by actionable statuses (submitted, under review) with the ability to act on each

### Edge Cases

- **EC1: Duplicate registration** — A user attempts to register with an email that already exists. The system displays a clear error message without revealing whether the email is already registered (for privacy).
- **EC2: Invalid form submission** — A submitter submits the idea form with missing required fields or values that violate length constraints. Validation errors are displayed inline next to each invalid field.
- **EC3: Oversized file upload** — A submitter attaches a file exceeding 5 MB. The system rejects the upload with a clear error message before form submission.
- **EC4: Unsupported file type** — A submitter attaches a file with a disallowed extension. The system rejects the upload with a message listing accepted formats.
- **EC5: Unauthorized admin access** — A submitter attempts to access the admin review page or admin evaluation endpoints. The system denies access and returns an appropriate authorization error.
- **EC6: Reject without comment** — An admin attempts to reject an idea without providing a comment. The system prevents the action and displays a validation error requiring a comment.
- **EC7: Session expiration** — A user's session expires during activity. The system redirects to the login page, preserving the intended destination for post-login redirect.
- **EC8: Empty idea list** — A user visits the idea listing when no ideas exist. The system displays an appropriate empty state message.

## Functional Requirements

### Authentication

| ID    | Requirement                                                                                                   | Acceptance Criteria                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FR-01 | The system shall allow users to register with an email address and password                                    | Account created; user assigned "submitter" role; redirected to ideas listing                       |
| FR-02 | The system shall allow registered users to log in with email and password                                      | Valid credentials grant access; invalid credentials show an error                                  |
| FR-03 | The system shall allow authenticated users to log out                                                         | Session terminated; user redirected to login page                                                  |
| FR-04 | The system shall protect all routes except login and registration behind authentication                        | Unauthenticated requests to protected routes redirect to login                                    |
| FR-05 | The system shall refresh authentication tokens transparently on each request                                   | Users remain logged in without manual re-authentication during active sessions                     |

### Role Management

| ID    | Requirement                                                                                                   | Acceptance Criteria                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FR-06 | The system shall assign the "submitter" role to all newly registered users by default                          | New accounts have "submitter" role in their profile                                               |
| FR-07 | The system shall support two roles: "submitter" and "admin"                                                    | Role is stored with the user profile and determines feature access                                |
| FR-08 | The system shall restrict admin-only features (review dashboard, accept/reject actions) to users with the "admin" role | Submitters cannot access admin features; requests return authorization error                    |

### Idea Submission

| ID    | Requirement                                                                                                   | Acceptance Criteria                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FR-09 | The system shall provide a form for submitters to create a new idea with title, description, and category      | Form displays all required fields with appropriate input types                                    |
| FR-10 | Title shall be required, between 5 and 100 characters                                                         | Submissions with titles outside this range are rejected with validation errors                     |
| FR-11 | Description shall be required, between 20 and 1000 characters                                                 | Submissions with descriptions outside this range are rejected with validation errors               |
| FR-12 | Category shall be selected from a predefined list of options                                                   | Only predefined categories are accepted; free-text entry is not allowed                           |
| FR-13 | The system shall allow an optional single file attachment per idea                                             | Ideas can be submitted with zero or one file attachment                                           |
| FR-14 | Attached files shall not exceed 5 MB in size                                                                   | Files larger than 5 MB are rejected with a clear error message                                    |
| FR-15 | Attached files shall be restricted to PDF, PNG, JPG, and DOCX formats                                         | Files with other extensions/MIME types are rejected with a message listing accepted formats        |
| FR-16 | Newly submitted ideas shall have the initial status of "submitted"                                             | Ideas are created with status "submitted" regardless of any other input                           |

### Idea Listing & Details

| ID    | Requirement                                                                                                   | Acceptance Criteria                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FR-17 | The system shall display a listing of all ideas showing title, category, status, and submission date           | All ideas visible to authenticated users; display fields present for each entry                    |
| FR-18 | The idea listing shall be ordered by submission date, most recent first                                        | Newest ideas appear at the top of the list                                                        |
| FR-19 | The system shall display a detail view for each idea including all submitted information                       | Detail page shows title, description, category, status, submission date, submitter, attachment, and admin comments |
| FR-20 | If an idea has an attached file, the detail view shall provide a download link                                 | Clicking the link downloads/opens the attached file                                               |

### Status Tracking

| ID    | Requirement                                                                                                   | Acceptance Criteria                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FR-21 | The system shall support four idea statuses: submitted, under review, accepted, rejected                       | Status values are constrained to these four options                                               |
| FR-22 | Status transitions shall follow the allowed flow: submitted → under review → accepted/rejected                 | No skipping or reversal of statuses is permitted                                                  |
| FR-23 | The current status of an idea shall be visible on both listing and detail views                                 | Status badge or label is displayed prominently                                                    |

### Admin Evaluation Workflow

| ID    | Requirement                                                                                                   | Acceptance Criteria                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FR-24 | The system shall provide an admin review dashboard showing ideas with actionable statuses                       | Admin dashboard lists ideas with "submitted" or "under review" statuses                           |
| FR-25 | Admins shall be able to accept an idea, optionally providing a comment                                         | Status changes to "accepted"; comment saved if provided                                           |
| FR-26 | Admins shall be able to reject an idea, with a mandatory comment (minimum 10 characters)                       | Rejection without a comment is blocked; status changes to "rejected" when comment is provided      |
| FR-27 | Admin evaluation actions shall only be available for ideas in "submitted" or "under review" status              | Accept/reject controls are hidden or disabled for ideas already in "accepted" or "rejected" status |
| FR-28 | Admin comments shall be visible on the idea detail view to all authenticated users                              | Comments appear on the detail page after evaluation                                               |

## Success Criteria

| ID   | Criterion                                                                                                      | Measurement                                                |
| ---- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| SC-1 | Users can register, log in, and log out successfully                                                           | All three authentication flows complete without errors      |
| SC-2 | A submitter can create and submit a new idea in under 3 minutes                                                | Timed user test from form load to successful submission     |
| SC-3 | File attachments are uploaded and downloadable without data loss                                                | Upload a file, download it, verify file integrity           |
| SC-4 | Admins can evaluate (accept or reject) a submitted idea in under 1 minute                                      | Timed user test from dashboard to completed evaluation      |
| SC-5 | Role-based access is enforced: submitters cannot access admin features                                          | Submitter attempts to reach admin routes and is denied      |
| SC-6 | Rejection requires a comment; acceptance does not                                                               | Attempt reject without comment fails; accept succeeds       |
| SC-7 | All ideas are visible to all authenticated users on the listing page                                            | Multiple users see the same complete list                   |
| SC-8 | Status transitions follow the defined workflow without skipping or reversal                                     | Attempt invalid transitions are denied                      |
| SC-9 | The system handles invalid inputs gracefully with clear error messages                                          | Submit invalid data produces inline validation errors       |
| SC-10| Core logic achieves 80%+ test coverage                                                                         | Coverage report for src/lib/ meets or exceeds 80%          |

## Key Entities

### User / Profile

- **user_id**: Unique identifier (from auth provider)
- **email**: Unique email address
- **role**: One of "submitter" or "admin"
- **created_at**: Account creation timestamp

### Idea

- **idea_id**: Unique identifier
- **title**: 5–100 characters
- **description**: 20–1000 characters
- **category**: Value from predefined category list
- **status**: One of "submitted", "under_review", "accepted", "rejected"
- **submitter_id**: Reference to the user who submitted
- **attachment_url**: Optional URL to the stored file
- **created_at**: Submission timestamp
- **updated_at**: Last modification timestamp

### Admin Review / Evaluation

- **review_id**: Unique identifier
- **idea_id**: Reference to the evaluated idea
- **reviewer_id**: Reference to the admin who evaluated
- **action**: One of "accepted" or "rejected"
- **comment**: Text comment (required for rejection, minimum 10 characters; optional for acceptance)
- **created_at**: Evaluation timestamp

## Scope

### In Scope

- User registration, login, and logout (email/password)
- Two-role system: submitter and admin
- Idea submission form with title, description, category, and optional file attachment
- Single file attachment per idea (PDF, PNG, JPG, DOCX; max 5 MB)
- Idea listing page (all ideas, all users)
- Idea detail page with full information and admin comments
- Four-status tracking: submitted → under review → accepted → rejected
- Admin review dashboard for actionable ideas
- Admin accept/reject workflow with comment support
- Reject-comment enforcement (mandatory comment on rejection)
- Route protection and role-based access control

### Out of Scope

- User profile editing or account settings
- Password reset / forgot password flow
- Email notifications or in-app notifications
- Idea search, filtering, or sorting on the listing page
- Multiple file attachments per idea
- Idea editing or deletion after submission
- Comment threads or multi-round feedback
- Voting, scoring, or ranking of ideas
- Analytics or reporting dashboards
- Multi-stage review workflows
- Draft/auto-save for idea submissions
- User management (admin cannot create/delete/modify other users)
- Internationalization or localization

## Dependencies

- Supabase project provisioned with Auth, Database (Postgres + RLS), and Storage enabled
- Database schema with tables for profiles, ideas, and evaluations (with RLS policies)
- Pre-seeded category list for idea categorization
- At least one admin account provisioned (manual role assignment or seed script)

## Assumptions

- **Default role**: All new users are assigned the "submitter" role. Admin roles are assigned manually or via a database seed script — there is no self-service role elevation.
- **Predefined categories**: The category list (e.g., "Process Improvement," "Technology Innovation," "Cost Reduction," "Customer Experience," "Employee Engagement") is defined in application code and can be updated by developers without a database migration.
- **File storage**: Uploaded files are stored in a dedicated storage bucket with access controlled by authentication. Files are accessible to all authenticated users (not restricted to submitter-only or admin-only).
- **Status transitions**: The "under review" status may be set implicitly when an admin first accesses an idea for evaluation, or explicitly via an admin action — the exact trigger is a design decision for planning phase.
- **Single evaluation**: Each idea receives one evaluation decision (accept or reject). Re-evaluation or status reversal is out of scope for the MVP.
- **Session management**: Authentication sessions are managed by the auth provider with automatic token refresh. Standard session duration and expiration policies apply.
- **Data retention**: All submitted ideas and evaluations are retained indefinitely within the MVP. No archival or deletion policies are in scope.
- **Concurrent access**: The MVP does not require optimistic locking or conflict resolution for simultaneous admin evaluations of the same idea. Standard database-level consistency is sufficient.
