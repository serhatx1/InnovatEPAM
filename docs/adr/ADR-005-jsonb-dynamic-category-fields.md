# ADR-005: JSONB Column for Dynamic Category Fields

**Status**: Accepted  
**Date**: 2026-02-24  
**Context**: Smart Category-Based Submission Form (1-smart-category-form)

## Decision

Store category-specific submission values in a single JSONB column (`category_fields`) on the `idea` table, validated at both client and server using shared Zod schemas. Category field definitions live in application constants (versioned in code).

## Context

The smart category form feature requires each idea category to collect different additional fields (e.g., "estimated savings" for Cost Reduction, "affected teams" for Process Improvement). The system needs to persist these varying field sets without requiring schema migrations every time a category's fields change.

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| **JSONB column on idea** | No schema churn, simple queries, MVP-friendly, single column per idea | Harder to index individual fields, no per-field DB constraints |
| EAV table (idea_category_field_value) | Flexible, queryable per-field, supports analytics | Complex joins, more tables, harder to validate atomically |
| One column per dynamic field | Strong DB-level typing and constraints | Brittle, migration-heavy, doesn't scale with new categories |

## Rationale

- JSONB is the smallest-change path: one `ALTER TABLE ADD COLUMN` migration, no new tables or joins.
- Shared Zod validation on client and server compensates for the lack of per-field DB constraints — the application layer enforces required fields, types, and ranges before persistence.
- Category field definitions in code constants (not DB) keep the MVP simple, predictable, and easy to test. Runtime configuration via admin UI can be added later without changing the storage model.
- On category switch, inactive category values are cleared before submission (satisfying EC-2/EC-5), preventing stale data from being persisted.
- PostgreSQL JSONB supports `@>` containment queries and GIN indexing if future analytics needs arise.

## Consequences

- `idea.category_fields` column added via migration `003_add_category_fields.sql` (`JSONB DEFAULT '{}'::jsonb`).
- Field definitions maintained in `src/lib/constants.ts` (`CATEGORY_FIELD_DEFINITIONS`).
- Validation schemas in `src/lib/validation/category-fields.ts` enforce required/format/range rules per category.
- API routes validate the JSONB payload server-side before insert.
- If field definitions eventually move to the database (admin-configurable), the JSONB storage model remains unchanged — only the source of field definitions shifts.
