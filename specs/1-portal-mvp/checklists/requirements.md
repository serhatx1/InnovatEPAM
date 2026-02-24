# Requirements Checklist: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Created**: 2026-02-24

## Authentication & Authorization

- [X] FR-01: Email/password registration creates account with "submitter" role
- [X] FR-02: Registered users can log in with email and password
- [X] FR-03: Authenticated users can log out and session is terminated
- [X] FR-04: Unauthenticated requests are redirected to login
- [X] FR-05: Only admin role can access admin review dashboard
- [X] FR-06: Only admin role can update idea status
- [X] FR-07: Role is stored in user profile, not in JWT claims
- [X] FR-08: Admin-only endpoints return 403 for non-admin users

## Idea Submission

- [X] FR-10: Title is required, 5–100 characters
- [X] FR-11: Description is required, 20–1000 characters
- [X] FR-12: Category must be from predefined list (5 categories)
- [X] FR-13: Submitted ideas default to "submitted" status
- [X] FR-14: File attachment is optional, max 5 MB
- [X] FR-15: Allowed file types: PDF, PNG, JPG, DOCX only
- [X] FR-16: File is stored in Supabase Storage bucket "idea-attachments"

## Idea Visibility

- [X] FR-17: All authenticated users can see all ideas in listing
- [X] FR-18: Ideas are ordered by most recent first
- [X] FR-19: All authenticated users can view any idea's detail page
- [X] FR-20: Attachment is accessible via signed URL if present

## Admin Review / Evaluation

- [X] FR-21: Admin can transition idea from "submitted" to "under_review"
- [X] FR-22: Status transitions are validated (only valid transitions allowed)
- [X] FR-23: Admin can approve (move to "accepted") from "submitted" or "under_review"
- [X] FR-24: Admin can reject (move to "rejected") from "submitted" or "under_review"
- [X] FR-25: Terminal states (accepted, rejected) cannot be changed
- [X] FR-26: Rejection requires evaluator comment of at least 10 characters
- [X] FR-27: Approval comment is optional

## Data Integrity

- [X] FR-28: Database enforces category CHECK constraint matching app constants

## Edge Cases

- [X] EC-1: Registration with duplicate email shows appropriate error
- [X] EC-2: Submission with fields below/above character limits is rejected
- [X] EC-3: Uploading file exceeding 5 MB is rejected with clear error
- [X] EC-4: Uploading disallowed file type is rejected with clear error
- [X] EC-5: Accessing non-existent idea returns 404
- [X] EC-6: Invalid status transition returns 400 with descriptive message
- [X] EC-7: Rejection without comment (or <10 chars) returns 400
- [X] EC-8: Concurrent status updates don't cause data corruption (RLS + single update)

## Testing

- [X] SC-10: Unit test coverage ≥ 80% for src/lib/
- [X] SC-09: All unit and integration tests pass

## Database & Infrastructure

- [X] DB-01: Migration 001_create_schema.sql creates all tables, indexes, RLS, triggers
- [X] DB-02: RLS policies use `(SELECT auth.uid())` wrapping for performance
- [X] DB-03: `is_admin()` SECURITY DEFINER helper prevents RLS recursion
- [X] DB-04: FK index on idea.user_id for JOIN/CASCADE performance
- [X] DB-05: Partial composite index for admin review queue
- [X] DB-06: Storage bucket "idea-attachments" with authenticated upload/read policies
