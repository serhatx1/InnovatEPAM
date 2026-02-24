# InnovatEPAM Portal Constitution

## Core Principles

### I. Simplicity First
Keep architecture simple and maintainable. Single Next.js app, no microservices. YAGNI — do not add features beyond MVP scope. Every complexity addition must be justified.

### II. Test-First (NON-NEGOTIABLE)
TDD approach: write tests before implementation when possible. Red-Green-Refactor cycle. All features must have unit tests. Critical user flows (register → login → submit → review) require integration/e2e coverage.

### III. Secure by Default
- No secrets committed to repository; use environment variables only.
- Validate all inputs on server boundaries using Zod schemas.
- Enforce role-based authorization for admin actions via RLS + server checks.
- Supabase Auth manages sessions; middleware refreshes tokens.

### IV. Type Safety
TypeScript strict mode everywhere. Shared types for API contracts. Zod schemas as single source of truth for validation — derive types from schemas.

### V. Spec-Driven Development
Reference specs and ADRs when building features. Update specs when requirements change. AI prompts must include relevant spec context.

## Testing Principles

- **Unit tests**: Vitest + React Testing Library; test behavior, not implementation.
- **Integration tests**: Test API route handlers with mocked Supabase client.
- **E2E smoke tests**: Playwright for critical happy paths only (auth flow, idea submission, admin review).
- **Coverage target**: 80%+ for core logic (`src/lib/`), best-effort for UI components.
- **Test location**: `tests/unit/`, `tests/integration/`, `tests/e2e/`.
- **Naming**: `*.test.ts` or `*.test.tsx`.

## Security Requirements

- RLS policies on all Supabase tables — no direct table access without policies.
- Admin endpoints verify role server-side before any mutation.
- File uploads restricted by type and size (configurable per Supabase bucket policy).
- CORS and CSP headers configured for production deployment.

## Development Workflow

1. Read the relevant spec/story/ADR.
2. Write or update tests (RED).
3. Implement code to pass tests (GREEN).
4. Refactor if needed.
5. Commit with meaningful message; push frequently.

## Governance

This constitution supersedes ad-hoc decisions. Any deviation must be documented as an ADR in `docs/adr/`. All code changes should verify compliance with these principles.

**Version**: 1.0.0 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-24
