# US1: Authentication & Access (Priority: P1)

## Story
As an employee, I can register, log in, and log out so I can securely access the portal.

## Why this priority
All other features require authenticated access and role-aware behavior.

## Independent test
Register a new account, log in, log out, and confirm protected pages require authentication.

## Acceptance Scenarios
1. **Given** a new user, **When** they submit valid email and password, **Then** an account is created and the user can sign in.
2. **Given** a user with valid credentials, **When** they log in, **Then** they are redirected to the application home.
3. **Given** an authenticated user, **When** they log out, **Then** the session is terminated and protected pages are inaccessible.
