# Research: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Created**: 2026-02-24

## R1: Validation Schema Alignment

**Unknown**: The existing `ideaSchema` only enforces `min(1)` (non-empty) for title and description. The spec requires title 5–100 chars (FR-10) and description 20–1000 chars (FR-11).

**Decision**: Update the Zod schema at `src/lib/validation/idea.ts` to enforce spec-level constraints:
- `title: z.string().min(5).max(100)`
- `description: z.string().min(20).max(1000)`
- `category: z.enum([...CATEGORIES])` (not free-text)

**Rationale**: Zod is the single source of truth for validation per the constitution. Updating the schema ensures both client and server validation match the spec. Custom error messages should be added for clarity.

**Alternatives considered**:
- Separate client/server validation — rejected (violates single-source-of-truth principle)
- HTML-only validation — rejected (not server-enforceable)

---

## R2: File Upload Validation

**Unknown**: No file type or size validation exists in Zod or the API route. Spec requires max 5 MB and only PDF, PNG, JPG, DOCX (FR-14, FR-15).

**Decision**: Create a `fileSchema` in `src/lib/validation/idea.ts` that validates:
- File size ≤ 5 MB (5 * 1024 * 1024 bytes)
- MIME type in allowed list: `application/pdf`, `image/png`, `image/jpeg`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Apply in the `POST /api/ideas` route handler before calling `uploadIdeaAttachment`

**Rationale**: Server-side validation is mandatory per "Secure by Default" constitution principle. Client-side `accept` attribute is supplementary only.

**Alternatives considered**:
- Supabase storage policy only — rejected (error messages would be opaque)
- Custom middleware — rejected (YAGNI; validation in the route handler is simpler)

---

## R3: Status Transition Enforcement

**Unknown**: The admin status API (`PATCH /api/admin/ideas/[id]/status`) accepts any valid status string without checking the idea's current status. Spec FR-22 requires: submitted → under_review → accepted/rejected (no skipping or reversal).

**Decision**: Add a `VALID_TRANSITIONS` map and validate the transition in the PATCH handler:
```
submitted → under_review
under_review → accepted
under_review → rejected
```
Also allow `submitted → accepted` and `submitted → rejected` to support both direct evaluation and two-step review (per spec Assumptions: "under review" may be implicit).

**Rationale**: The spec says "submitted → under review → accepted/rejected" but the admin dashboard already shows Accept/Reject on submitted ideas. Allowing direct accepted/rejected from submitted preserves existing UX while still preventing invalid transitions like rejected → accepted.

**Alternatives considered**:
- Strict two-step only (must go through under_review) — rejected (would force extra click with no user value)
- No enforcement (status quo) — rejected (violates FR-22)

---

## R4: Rejection Comment Minimum Length

**Unknown**: The current PATCH handler checks `!evaluatorComment.trim()` (non-empty) but spec FR-26 requires minimum 10 characters.

**Decision**: Create a `statusUpdateSchema` Zod schema that validates:
- `status: z.enum(["under_review", "accepted", "rejected"])`
- `evaluatorComment: z.string().min(10)` when status is "rejected"
- `evaluatorComment: z.string().optional()` when status is not "rejected"

Use a Zod discriminated union or `.refine()` to conditionally require the comment.

**Rationale**: Consistent with constitution requirement that all input validation uses Zod schemas.

**Alternatives considered**:
- Inline if-check (current approach) — rejected (doesn't enforce min length, not schema-based)

---

## R5: Category List Standardization

**Unknown**: The new idea page uses `["Process Improvement", "Product Feature", "Cost Reduction", "Culture", "Other"]`. The spec Assumptions suggest `["Process Improvement", "Technology Innovation", "Cost Reduction", "Customer Experience", "Employee Engagement"]`.

**Decision**: Define the canonical category list in a shared constants file `src/lib/constants.ts`:
```typescript
export const IDEA_CATEGORIES = [
  "Process Improvement",
  "Technology Innovation",
  "Cost Reduction",
  "Customer Experience",
  "Employee Engagement",
] as const;
```
Use this in the Zod schema (`z.enum(IDEA_CATEGORIES)`) and in the UI form. The spec's list is authoritative.

**Rationale**: Single source of truth, DRY, and change-safe (modify once, applies everywhere).

**Alternatives considered**:
- Keep current list — rejected (doesn't match spec)
- Database-driven categories — rejected (YAGNI for MVP, spec says "defined in application code")

---

## R6: "Under Review" Status Trigger

**Unknown**: Spec Assumption: "The 'under review' status may be set implicitly when an admin first accesses an idea for evaluation, or explicitly via an admin action."

**Decision**: Use **explicit** trigger — the admin clicks "Start Review" button (already present in `AdminActions.tsx`) to move from submitted → under_review. This is cleaner and more auditable than implicit state changes on page view.

**Rationale**: Explicit is better than implicit. The button already exists in the UI. Implicit triggers on page load would cause unintended side effects (e.g., accidental status change from just browsing).

**Alternatives considered**:
- Implicit on page view — rejected (side-effect-prone, hard to test)
- Remove under_review entirely — rejected (spec requires four statuses)

---

## R7: Idea Visibility / RLS Policy Gap

**Unknown**: FR-17 says "display a listing of all ideas" visible to "all authenticated users." But current implementation scopes submitters to their own ideas via `listIdeas({ userId: user.id })`, and the RLS policy `"Users can read own ideas"` limits visibility.

**Decision**: This is a significant gap. The spec clearly states all authenticated users should see all ideas (FR-17). The implementation must:
1. Update RLS: Add a policy `"Authenticated users can read all ideas"` on `public.idea` with `USING (auth.role() = 'authenticated')`. Remove the restrictive `"Users can read own ideas"` policy.
2. Update `GET /api/ideas` and ideas listing page: Remove the `userId` scoping. All authenticated users see all ideas.
3. Keep the detail page access open to all authenticated users (not just owner + admin).

**Rationale**: The spec is unambiguous — FR-17 requires all ideas visible to all authenticated users. Current implementation contradicts this.

**Alternatives considered**:
- Keep owner-scoped listing — rejected (violates FR-17)
- Show all in listing but restrict detail — rejected (inconsistent UX, spec says detail should show all info FR-19)

---

## Summary

| # | Unknown | Resolution | Impact |
|---|---------|-----------|--------|
| R1 | Validation constraints | Tighten Zod schema to match spec | Medium — schema + tests |
| R2 | File validation | Add file schema + route validation | Medium — new schema + route change |
| R3 | Status transitions | Add transition map + validation | Medium — route change + tests |
| R4 | Reject comment length | Zod schema with min(10) | Low — schema + route change |
| R5 | Category list | Shared constants file | Low — new file + update refs |
| R6 | Under review trigger | Explicit button (already exists) | None — no code change needed |
| R7 | Idea visibility | Update RLS + remove userId scoping | High — migration + route + page changes |
