# ADR-002: Use Supabase for Auth, Database, and Storage

**Status**: Accepted  
**Date**: 2026-02-24  
**Context**: InnovatEPAM Portal MVP

## Decision

Use Supabase as the managed backend providing:
- **Auth**: Email/password authentication via Supabase Auth
- **Database**: Postgres with Row-Level Security (RLS)
- **Storage**: Supabase Storage for idea file attachments

## Context

The MVP needs user authentication, a relational database for ideas/profiles, and file storage for single attachments per idea. A managed solution reduces infrastructure work during a time-constrained sprint.

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| **Supabase (Auth + DB + Storage)** | Single platform, built-in RLS, JS SDK, generous free tier | Vendor lock-in risk |
| Firebase + Firestore | Real-time, mature Auth | NoSQL mismatch for relational data model |
| Custom JWT + raw Postgres | Full control | Significant implementation effort for MVP |

## Rationale

- Supabase Auth handles registration, login, logout, and session management out of the box.
- RLS policies enforce authorization at the database level, reducing server-side guard code.
- Supabase Storage provides signed URLs and bucket policies for file uploads.
- Single SDK (`@supabase/supabase-js` + `@supabase/ssr`) covers all three concerns.

## Consequences

- Auth tokens are managed by Supabase; middleware refreshes sessions via `@supabase/ssr`.
- Role is stored in the `user_profile` table and checked via server-side helpers + RLS.
- File uploads go to a Supabase Storage bucket with per-user path policies.
- Migration to another provider would require rewriting auth and storage layers.
