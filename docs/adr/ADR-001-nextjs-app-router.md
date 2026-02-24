# ADR-001: Use Next.js App Router as Application Framework

**Status**: Accepted  
**Date**: 2026-02-24  
**Context**: InnovatEPAM Portal MVP

## Decision

Use Next.js 16.1 with the App Router pattern as the sole application framework.

## Context

The MVP requires server-side rendering, API routes, and a modern React frontend. We need a single deployable unit that covers UI, server actions, and API endpoints without introducing microservice complexity.

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| **Next.js 16.1 App Router** | SSR + API routes in one project, Vercel deployment, React Server Components | Newer pattern, smaller community examples |
| Vite + Express | Flexible, fast dev server | Two deployable units, more wiring |
| Remix | Good data loading model | Smaller ecosystem, less Supabase integration material |

## Rationale

- Single deployment simplifies MVP delivery within sprint constraints.
- App Router provides built-in layouts, route groups, and server components — reducing boilerplate.
- Strong Supabase integration guides exist for Next.js.
- Vercel hosting gives zero-config deployment.

## Consequences

- All routes live under `src/app/`.
- API mutations use route handlers (`route.ts`) rather than a separate backend.
- Team must follow App Router conventions (server vs client components).
