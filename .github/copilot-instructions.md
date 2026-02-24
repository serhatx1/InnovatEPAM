# Copilot Instructions

<!-- AUTO-GENERATED SECTION: DO NOT EDIT BETWEEN MARKERS -->
<!-- BEGIN SPECKIT CONTEXT -->
## Project: InnovatEPAM Portal

### Tech Stack
- **Runtime**: Next.js 16.1 (App Router), React 19, Node.js 20+
- **Language**: TypeScript 5.9 (strict mode)
- **Backend**: Supabase (Postgres with RLS, Auth, Storage)
- **Auth**: Supabase Auth (email/password) via @supabase/ssr
- **Validation**: Zod 4.3 (single source of truth for all input validation)
- **Testing**: Vitest 4 + React Testing Library + jest-dom (unit/integration), Playwright (E2E)
- **Deployment**: Vercel

### Key Patterns
- Zod schemas are the single source of truth — TypeScript types derive from them
- TDD: RED → GREEN → REFACTOR for all production code
- Server-side validation on all API boundaries
- Supabase RLS + server-side role checks for authorization
- Path alias: `@/*` maps to `./src/*`
- Tests in `tests/unit/`, `tests/integration/`, `tests/e2e/`
- Coverage target: 80%+ for `src/lib/`

### Current Feature: 1-portal-mvp
- Spec: `specs/1-portal-mvp/spec.md`
- Plan: `specs/1-portal-mvp/impl-plan.md`
- Contracts: `specs/1-portal-mvp/contracts/api.md`
<!-- END SPECKIT CONTEXT -->

## Manual Instructions

Add any manual Copilot instructions below this line.
