# EPIC-01: Identity & Access

## Goal
Enable secure access to InnovatEPAM Portal with role-aware behavior.

## Scope
- User registration
- User login
- User logout
- Role distinction (`submitter`, `admin`)
- Route and action protection based on role

## Related Story
- US1: Authentication & Access (`stories/US1-authentication-access.md`)

## Related Tasks
- Task list: `EPIC-01-tasks.md`

## Acceptance Summary
- Users can register/login/logout successfully.
- Protected pages require authentication.
- Admin-only actions are blocked for non-admin users.
