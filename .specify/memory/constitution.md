<!--
Sync Impact Report
===================
Version change: 1.0.2 → 1.1.0
Updated sections:
  - Guiding Principles § Secure by Default (review workflow integrity and visibility)
  - Testing Principles (review workflow conflict/visibility validation)
  - Governance (explicit compliance checkpoints)
Added sections:
  - None
Removed sections:
  - None
Reason:
  - Align governance with multi-stage review requirements:
    optimistic concurrency for stage transitions and role-scoped
    visibility during non-terminal review.
  - Keep security and test obligations explicit and testable.
Templates requiring updates:
  - .specify/templates/spec-template.md ✅ reviewed, no changes required
  - .specify/templates/plan-template.md ⚠ pending (template missing)
  - .specify/templates/tasks-template.md ⚠ pending (template missing)
  - .specify/templates/commands/*.md ⚠ pending (directory missing)
  - README.md ✅ reviewed, no principle-reference changes required
  - project-guide.md ✅ reviewed, no principle-reference changes required
Follow-up TODOs:
  - TODO(TEMPLATE_SYNC): Add missing `.specify/templates/plan-template.md` and `.specify/templates/tasks-template.md`.
  - TODO(COMMAND_TEMPLATES): Add `.specify/templates/commands/` command docs and align wording with updated governance.
-->

# InnovatEPAM Portal Constitution

**Created**: 2026-02-24
**Last Amended**: 2026-02-26
**Version**: 1.1.0

## Purpose

InnovatEPAM Portal is an internal employee innovation management
platform. Submitters propose ideas with file attachments and admins
evaluate them through a structured review workflow. This constitution
defines the non-negotiable principles, priorities, and constraints
that govern all development decisions.

## Guiding Principles

1. **Simplicity First**: Keep architecture simple and maintainable.
   Single Next.js 16.1 App Router application — no microservices, no
   unnecessary abstractions. YAGNI applies: every added complexity
   MUST be justified by a concrete requirement. Prefer convention
   over configuration.

2. **Test-First (TDD)**: All production code MUST be preceded by a
  failing test (RED → GREEN → REFACTOR). Unit tests cover isolated
  logic. Integration tests cover API route handlers. Coverage target:
  80%+ for `src/lib/`. E2E smoke tests are optional until Playwright
  is added to the repository. This principle is NON-NEGOTIABLE.

3. **Secure by Default**: No secrets committed to the repository;
   environment variables only. All user input MUST be validated on
   server boundaries using Zod schemas. Role-based authorization
   MUST be enforced via Supabase RLS policies AND server-side
   checks. Admin endpoints MUST verify role before any mutation.
  Review-stage transitions MUST use optimistic concurrency and
  MUST reject stale updates instead of overwriting current state.
  During non-terminal review, submitter-facing views MUST hide
  evaluator identity and evaluator comments unless explicitly
  authorized by role policy.
   File uploads MUST be validated on both client (UX feedback)
   and server (security boundary): max 10 MB per file, max 5
   files per idea, max 25 MB total, restricted MIME types.
   Multi-file submissions MUST be atomic — all files succeed or
   the entire submission is rolled back (see ADR-006).

4. **Type Safety**: TypeScript strict mode is enabled everywhere.
   Shared types define API contracts. Zod schemas serve as the
   single source of truth for validation — TypeScript types MUST
   be derived from Zod schemas where applicable. No `any` types
   except with explicit justification.

5. **Spec-Driven Development**: Every feature MUST reference its
   spec or user story before implementation begins. ADRs MUST
   document non-trivial technical decisions. AI prompts MUST
   include relevant spec context. Specs MUST be updated when
   requirements change.

## Priorities

- Working software over comprehensive documentation
- Correctness and security over speed of delivery
- Readable, maintainable code over clever optimizations
- Tested behavior over implementation coverage
- Incremental delivery with frequent commits

## Constraints

- **Runtime**: Node.js 20+, Next.js 16.1 (App Router), React 19
- **Backend**: Supabase (Postgres with RLS, Auth, Storage)
- **Language**: TypeScript 5 (strict mode)
- **Validation**: Zod for all input boundaries
- **Testing**: Vitest + React Testing Library (unit/integration)
- **Deployment**: Vercel
- **Auth**: Supabase Auth (email/password); middleware refreshes
  tokens on every request

## Testing Principles

- **Unit tests**: Vitest + React Testing Library; test behavior,
  not implementation details.
- **Integration tests**: Test API route handlers with mocked
  Supabase client.
- **Review workflow tests**: MUST include conflict handling
  (`409` stale-write rejection) and role-scoped visibility checks.
- **E2E smoke tests**: Optional until Playwright is configured.
- **Coverage target**: 80%+ for core logic (`src/lib/`),
  best-effort for UI components.
- **Test location**: `tests/unit/`, `tests/integration/`.
- **Naming**: `*.test.ts` or `*.test.tsx`.
- **Discipline**: Tests MUST pass before any merge or deploy.

## Development Methodology

This project follows **Spec-Driven, Test-Driven Development**:

1. **Specify**: Define what needs to be built (clear requirements)
2. **Plan**: Break down into testable tasks
3. **Implement**: Build with TDD (RED → GREEN → REFACTOR)
4. **Validate**: Quality gates ensure we stay on track
5. **Commit**: Push frequently with meaningful messages

## Governance

- This constitution supersedes ad-hoc decisions. Any deviation
  MUST be documented as an ADR in `docs/adr/`.
- Amendments follow semantic versioning (MAJOR: principle removal
  or redefinition; MINOR: new principle or expanded guidance;
  PATCH: clarifications and typo fixes).
- All code changes MUST verify compliance with these principles.
- Plans MUST include Constitution Check results before design and
  after design updates when architecture or policy constraints change.
- Constitution reviews occur when scope or tech stack changes.

---

*This constitution serves as the north star for all decisions
in this project. When in doubt, refer back to these principles.*
