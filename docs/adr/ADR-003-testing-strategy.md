# ADR-003: Testing Strategy — Vitest + React Testing Library

**Status**: Accepted  
**Date**: 2026-02-24  
**Context**: InnovatEPAM Portal MVP

## Decision

- **Unit / Integration tests**: Vitest with React Testing Library
- **E2E smoke tests**: Optional; add Playwright in a follow-up phase if needed

## Context

The project guide requires passing tests, Testing Principles in the constitution, and ideally 80%+ coverage. We need a testing stack that works well with Next.js App Router and TypeScript.

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| **Vitest + RTL** | Fast, ESM-native, great TS support, compatible with React 19 | Newer than Jest |
| Jest + RTL | Mature ecosystem | Slower, ESM config friction with Next.js 15 |
| Cypress | Good E2E | Heavy for unit tests, slower CI |

## Rationale

- Vitest aligns with the Vite-compatible tooling ecosystem and runs TypeScript natively.
- React Testing Library promotes testing user behavior over implementation details.
- Current repository already has comprehensive Vitest unit/integration coverage and does not include Playwright config yet.
- E2E coverage can be introduced incrementally without blocking MVP completion.

## E2E Adoption Trigger

Add Playwright E2E tests when **any** of the following conditions is met:

1. **Multi-step user flows** span 3+ pages (e.g., submission → review → status change) and cannot be adequately covered by integration tests alone.
2. **Visual regressions** are reported that unit/integration tests do not catch (e.g., layout breakage across viewports).
3. **CI false-greens** — tests pass but production users report broken flows, indicating a gap between test coverage and real-browser behaviour.

Until a trigger fires, the current Vitest + RTL stack provides sufficient confidence.

## Consequences

- Test files live under `tests/unit/` and `tests/integration/`.
- `vitest.config.ts` configures path aliases matching `tsconfig.json`.
- CI should run `npm test` (Vitest). If Playwright is added later, include a separate E2E job.
