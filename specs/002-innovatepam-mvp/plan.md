# Implementation Plan: InnovatEPAM Portal MVP

**Branch**: `002-innovatepam-mvp` | **Date**: 2026-02-24 | **Spec**: `/specs/002-innovatepam-mvp/spec.md`
**Input**: Feature specification from `/specs/002-innovatepam-mvp/spec.md`

## Summary

Build an MVP portal using Next.js App Router deployed on Vercel, with Supabase Auth + Postgres + Storage. Deliver role-aware authentication, idea submission with one file attachment, idea listing/detail, and admin decision workflow.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Next.js 15 (App Router), React, Supabase JS SDK, Zod, React Hook Form  
**Storage**: Supabase Postgres + Supabase Storage  
**Testing**: Vitest + React Testing Library (unit), Playwright (critical flow smoke)  
**Target Platform**: Web (Vercel-hosted)  
**Project Type**: Web application (single Next.js app)  
**Performance Goals**: Core pages interactive within 2s on typical broadband  
**Constraints**: MVP scope only, one attachment per idea, no extra non-required features  
**Scale/Scope**: Small internal pilot (tens to hundreds of users)

## Constitution Check

- Keep architecture simple and maintainable
- Enforce role-based authorization for admin actions
- No secrets committed to repository
- Validate inputs on server boundaries

## Project Structure

### Documentation (this feature)

```text
specs/002-innovatepam-mvp/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/
│   ├── ideas/
│   ├── admin/
│   └── api/
├── components/
├── lib/
│   ├── supabase/
│   ├── auth/
│   └── validation/
└── types/

tests/
├── unit/
├── integration/
└── e2e/
```

**Structure Decision**: Single Next.js app with route groups for auth/user/admin workflows and server routes for mutation endpoints.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
