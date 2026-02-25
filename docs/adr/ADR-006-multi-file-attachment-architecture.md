# ADR-006: Normalized Attachment Table with Atomic Upload Strategy

**Status**: Accepted  
**Date**: 2026-02-25  
**Context**: Multi-Media Support (2-multi-media-support)

## Decision

Model multiple file attachments per idea using a normalized `idea_attachment` child table with a foreign key to `idea`. File uploads follow an all-or-nothing strategy: if any file fails to upload, the entire submission is rejected and partially uploaded files are cleaned up. The legacy `attachment_url` column on `idea` is retained read-only for backward compatibility.

## Context

The MVP limited each idea to a single file stored as `attachment_url` on the `idea` row. Multi-media support requires 1–5 files per idea across 10 file types, with metadata tracking (original name, size, MIME type, upload order). The system must handle partial upload failures gracefully and display both legacy single-attachment ideas and new multi-attachment ideas in the same UI.

## Considered Options

### Storage Model

| Option | Pros | Cons |
|--------|------|------|
| **Normalized child table (`idea_attachment`)** | Referential integrity, per-row constraints, RLS-compatible, indexable | Extra table, JOIN on detail queries |
| JSON array on idea row | Simpler migration, no joins | No referential integrity, can't constrain per-file, no per-attachment RLS, harder to query |
| Storage-only (no DB records) | Zero schema changes | Loses metadata, no ordering, can't list without scanning storage |

### Upload Strategy

| Option | Pros | Cons |
|--------|------|------|
| **Atomic (all-or-nothing)** | Simple UX, clean data integrity, easy to test | User must re-upload all files on failure |
| Partial save with retry | Preserves successful uploads | Complex UX ("3 of 5 saved"), data integrity edge cases |
| Background upload with polling | Non-blocking UX | Over-engineered for ≤5 files × 10 MB |

## Rationale

### Normalized Table
- Standard relational approach for one-to-many: each attachment is a first-class row with its own metadata, constraints, and RLS policies.
- Enables `ORDER BY upload_order` for deterministic display ordering.
- Supports future per-attachment features (comments, versioning) without schema changes to `idea`.

### Atomic Uploads
- Prevents confusing partial states — submitters intended N files, and either all N are saved or none are.
- Cleanup is cheap: `supabase.storage.from(bucket).remove(paths[])` deletes partially uploaded files in a single call.
- Orphaned storage files (if cleanup itself fails) are harmless — never referenced by any DB record — and can be addressed by periodic audit.

### Legacy Compatibility
- Retaining `attachment_url` read-only avoids a data migration for existing ideas.
- Application-layer merge logic: if `idea_attachment` records exist → show those; else if `attachment_url` exists → show as single legacy attachment; else → no attachments.
- New ideas never write to `attachment_url`.

## Consequences

- Migration `004_add_idea_attachments.sql` creates `idea_attachment` table with FK, indexes, and RLS policies.
- `src/lib/queries/attachments.ts` handles CRUD for the new table.
- `src/lib/constants.ts` defines `MAX_ATTACHMENTS` (5), `MAX_FILE_SIZE` (10 MB), `MAX_TOTAL_ATTACHMENT_SIZE` (25 MB), and expanded `ALLOWED_FILE_TYPES` (9 MIME types / 10 extensions).
- API route (`POST /api/ideas`) implements the atomic upload pipeline: validate → upload all → insert DB records → or rollback.
- Detail page (`GET /api/ideas/[id]`) returns `IdeaWithAttachments` including both legacy `signed_attachment_url` and new `attachments[]` array.
- File validation enforced on both client (instant feedback) and server (security boundary).
