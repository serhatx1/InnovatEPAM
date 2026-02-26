# Research: Blind Review (Anonymous Evaluation)

**Feature**: 7-blind-review
**Created**: 2026-02-26

## R1: Where to Store the Blind Review Setting

**Decision**: Store as a row in a new `portal_setting` key-value table with key `blind_review_enabled` and a boolean value.

**Rationale**: A generic key-value settings table avoids creating a single-column table for each future portal-wide toggle. The pattern is lightweight, easy to query, and survives restarts since it lives in Postgres. It also establishes a reusable pattern for future portal settings (e.g., Phase 7 scoring configuration).

**Alternatives considered**:
- Dedicated `blind_review_config` table with a single boolean column (simple but inflexible for future settings)
- Environment variable (does not support runtime toggling by admin)
- In-memory flag or cache (does not survive restarts, not consistent across instances)

---

## R2: Anonymization Enforcement Layer

**Decision**: Apply anonymization at the API response layer (server-side) before data reaches the client, not in the UI layer alone.

**Rationale**: UI-only masking is trivially bypassed via browser DevTools or direct API calls. Server-side stripping of `user_id`, submitter name, and email from the response payload ensures the data never leaves the server when blind review is active. This aligns with constitution principle "Secure by Default" — security enforcement must not depend on the client.

**Alternatives considered**:
- UI-only masking via React component logic (bypassable, violates Secure by Default)
- Database-level RLS policy for anonymization (complex, makes non-blind queries harder to write, mixes display concern into storage layer)
- Middleware-level response transformation (too broad, hard to target specific payloads)

---

## R3: View-Time vs Submission-Time Application

**Decision**: Apply the blind review setting at view time (current state of the toggle), not bound at the time of idea submission.

**Rationale**: View-time application is simpler (no per-idea setting snapshot), immediately responsive to admin toggle, and matches the spec requirement (FR-007). It avoids needing a `blind_at_submission` flag on every idea.

**Alternatives considered**:
- Bind blind review state per idea at submission time (more complex data model, harder to toggle for existing ideas, conflicts with FR-007)
- Cached per-session (stale for long sessions, inconsistent across evaluators)

---

## R4: Anonymization Scope — What Gets Masked

**Decision**: Mask only structured identity fields: `user_id`, submitter name (from `user_profile`), and email. Free-text content (idea body, attachment filenames) is not redacted.

**Rationale**: Redacting free-text would require NLP-based entity recognition, which is fragile and out of scope. Structured field masking is deterministic and covers the primary identification vectors. The spec explicitly states this boundary (FR-008).

**Alternatives considered**:
- Full content redaction including body text (requires NLP, error-prone, out of scope)
- Mask attachment filenames (filenames may not contain identity info, adds complexity for marginal benefit)

---

## R5: Admin Exemption from Blind Review

**Decision**: Administrators always see full submitter identity regardless of blind review setting.

**Rationale**: Admins manage users, resolve disputes, and need full context. Masking admin views would create operational gaps. The spec makes this explicit (FR-004).

**Alternatives considered**:
- Apply blind review to admins too (conflicts with admin operational needs)
- Allow per-admin opt-in (unnecessary complexity for MVP scope)

---

## R6: Terminal Idea Identity Reveal

**Decision**: Once an idea reaches a terminal review outcome (accepted/rejected), reveal submitter identity to evaluators regardless of blind review setting.

**Rationale**: After a final decision, the anonymization purpose (bias-free evaluation) is fulfilled. Revealing identity enables proper communication and follow-up. This aligns with FR-006.

**Alternatives considered**:
- Keep identity hidden permanently (impairs post-decision communication)
- Reveal only after admin manually un-blinds (extra step for no clear benefit)

---

## R7: Best Practice — Supabase RLS for Settings Table

**Decision**: Use RLS policies on `portal_setting`: admin can read/write, authenticated users can read (for the API layer to check the flag).

**Rationale**: RLS ensures the setting cannot be modified via direct Supabase client calls from non-admin users, maintaining defense-in-depth alongside server-side role checks.

**Alternatives considered**:
- No RLS, API-only authorization (weaker, violates constitution guidance)
- Service role key bypass (would skip RLS entirely, not safe for client-facing queries)
