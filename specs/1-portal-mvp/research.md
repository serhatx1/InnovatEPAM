# Research: InnovatEPAM Portal MVP

**Feature**: 1-portal-mvp
**Created**: 2026-02-24

## Research Questions & Decisions

### R1: Tighten ideaSchema constraints

**Question**: Current ideaSchema uses `min(1)` for title and description. Spec requires title 5–100, description 20–1000 chars.

**Decision**: Update ideaSchema to use `min(5).max(100)` for title and `min(20).max(1000)` for description.

**Impact**: Medium — affects validation tests and form inputs.

---

### R2: File validation schema

**Question**: No file validation exists. Spec requires max 5 MB, restricted to PDF/PNG/JPG/DOCX.

**Decision**: Add `validateFile()` function using `MAX_FILE_SIZE` and `ALLOWED_FILE_TYPES` constants. Validate at both client (inline error) and server (400 response) levels.

**Impact**: Medium — new schema + constants, API & form updates.

---

### R3: Status transition enforcement

**Question**: Current PATCH endpoint accepts any valid status without checking the current state. Spec requires ordered transitions.

**Decision**: Add `VALID_TRANSITIONS` map and `isValidTransition()` function. PATCH endpoint fetches current status and validates before applying.

**Impact**: Medium — new validation logic, API update, new tests.

---

### R4: Rejection comment minimum length

**Question**: Current endpoint requires non-empty comment for rejection. Spec requires minimum 10 characters.

**Decision**: Use Zod `.refine()` in `statusUpdateSchema` to enforce `evaluatorComment.trim().length >= 10` when status = "rejected".

**Impact**: Low — schema refinement + test updates.

---

### R5: Shared IDEA_CATEGORIES constant

**Question**: Form page uses hardcoded `CATEGORIES` array with different values from the DB CHECK constraint.

**Decision**: Create `src/lib/constants.ts` with `IDEA_CATEGORIES` as single source of truth. Import in form, validation schema, and integration tests.

**Categories**: Process Improvement, Technology Innovation, Cost Reduction, Customer Experience, Employee Engagement.

**Impact**: Low — create file, update imports.

---

### R6: "Start Review" explicit button

**Question**: How should the `submitted → under_review` transition be triggered?

**Decision**: Already exists — `AdminActions` component has a "Start Review" button for submitted ideas.

**Impact**: None — already implemented.

---

### R7: Fix RLS for idea visibility

**Question**: Current RLS separates SELECT policies by role (users see own, admins see all). Spec FR-17 says all authenticated users should see all ideas.

**Decision**: Replace per-user/per-admin SELECT policies with a single `"Authenticated users can read all ideas"` policy checking `auth.role() = 'authenticated'`. Already consolidated in `001_create_schema.sql`.

**Impact**: High — RLS policy change, API route simplification (remove userId scoping), UI cleanup (remove admin-only labels).

---

## Technology Choices

| Choice | Alternative Considered | Reason |
|--------|----------------------|--------|
| Zod `.refine()` for conditional validation | Manual if/else in handler | Co-located with schema; cleaner error messages |
| `VALID_TRANSITIONS` as `Record<string, string[]>` | State machine library (e.g., xstate) | Overkill for 4 states; simple map is sufficient |
| Client + server file validation | Server-only | Better UX — instant feedback without network round-trip |
| Single 001 migration (drop-rebuild) | Additive 002+ migrations | MVP with single dev — simpler; production would use additive |
