# Implementation Plan: Multi-Media Support

**Feature**: 2-multi-media-support
**Branch**: 2-multi-media-support
**Created**: 2026-02-25
**Spec**: [spec.md](spec.md)

## Technical Context

| Area         | Technology                                  | Version  |
| ------------ | ------------------------------------------- | -------- |
| Runtime      | Next.js (App Router)                        | 16.1     |
| UI           | React + shadcn/ui + Tailwind CSS            | 19 / 0.x / 4 |
| Styling      | Tailwind CSS utility-first                  | 4        |
| Components   | shadcn/ui (Radix primitives, owned source)  | latest   |
| Language     | TypeScript (strict mode)                    | 5.9      |
| Backend      | Supabase (Postgres + RLS, Auth, Storage)    | Latest   |
| Validation   | Zod                                         | 4.3      |
| Testing      | Vitest + React Testing Library              | 4.0      |
| Auth         | Supabase Auth (email/password)              | via @supabase/ssr |
| Deployment   | Vercel                                      | —        |

### Existing Assets

- Database schema: `supabase/migrations/001_create_schema.sql` (profiles, ideas with single `attachment_url`, storage bucket, triggers, indexes, RLS)
- Additional migration: `supabase/migrations/003_add_category_fields.sql` (JSONB field for category-specific data)
- Shared types: `src/types/index.ts` (Idea with `attachment_url: string | null`, UserProfile, IdeaStatus)
- Constants: `src/lib/constants.ts` (MAX_FILE_SIZE=5MB, ALLOWED_FILE_TYPES=[pdf,png,jpeg,docx], IDEA_CATEGORIES, VALID_TRANSITIONS, CATEGORY_FIELD_DEFINITIONS)
- Validation: `src/lib/validation/idea.ts` (ideaSchema, validateFile — single file, 5MB, 4 types)
- Storage: `src/lib/supabase/storage.ts` (uploadIdeaAttachment — single file, getAttachmentUrl — signed URL)
- Queries: `src/lib/queries/ideas.ts` (listIdeas, getIdeaById, createIdea with single attachment_url, updateIdeaStatus)
- API routes: POST `/api/ideas` (accepts single `file` from FormData), GET `/api/ideas/[id]` (returns signed_attachment_url)
- Pages: idea submission form (single file input), idea detail (single download link)
- Tests: unit + integration covering single-file validation, upload, and queries

### Key Changes Required

1. **New database table**: `idea_attachment` for multi-file metadata (FK to idea)
2. **New migration**: Add `idea_attachment` table with RLS policies
3. **Updated constants**: New MAX_FILE_SIZE (10MB), new MAX_TOTAL_SIZE (25MB), new MAX_ATTACHMENTS (5), expanded ALLOWED_FILE_TYPES (10 types)
4. **Updated validation**: Multi-file validation (count, individual size, total size, expanded types, empty-file check), dual client+server enforcement
5. **New queries**: CRUD for idea_attachment (batch insert, list by idea, delete by idea)
6. **Updated API**: POST `/api/ideas` accepts multiple files, atomic upload with cleanup on failure
7. **Updated storage**: Batch upload with rollback capability, delete function for cleanup
8. **New UI components**: Drag-and-drop upload zone, attachment list with metadata, progress indicator, image lightbox
9. **Updated pages**: Submission form (multi-file), detail page (attachment list with thumbnails)
10. **Backward compatibility**: Detail page reads both legacy `attachment_url` and new `idea_attachment` records

## Constitution Check

| Principle          | Compliance | Notes                                                       |
| ------------------ | ---------- | ----------------------------------------------------------- |
| Simplicity First   | ✅ PASS    | Single Next.js app; new `idea_attachment` table is minimum viable add. No microservices or complex upload services. |
| Test-First (TDD)   | ✅ PLAN    | All new validation, queries, and API changes will be test-first. Tasks specify RED→GREEN→REFACTOR order. |
| Secure by Default  | ✅ PLAN    | Dual client+server file validation; RLS on new table; server-side MIME/size enforcement; authenticated-only access. |
| Type Safety        | ✅ PLAN    | New `IdeaAttachment` type derived from Zod schema; strict mode; no `any`. |
| Spec-Driven        | ✅ PASS    | Spec exists with clarifications; this plan references FR/NFR IDs throughout. |

### Gate Result: **PASS**

No violations. All principles addressed by design.

### Post-Design Re-evaluation

| Principle          | Status   | Evidence                                                    |
| ------------------ | -------- | ----------------------------------------------------------- |
| Simplicity First   | ✅ PASS  | Single `idea_attachment` table; HTML5 native drag-and-drop (no external library); shadcn Dialog lightbox; no microservices or queues. |
| Test-First (TDD)   | ✅ PASS  | All 14 tasks begin with "Write tests first"; T14 dedicated coverage sweep targeting ≥80% for `src/lib/`. |
| Secure by Default  | ✅ PASS  | Dual client+server validation (T3, T7); 3 RLS policies on `idea_attachment` (T4); server-side MIME/size enforcement; atomic upload with storage rollback. |
| Type Safety        | ✅ PASS  | `IdeaAttachment` interface in strict TS (T2); Zod schemas as validation source of truth (T3); no `any` types. |
| Spec-Driven        | ✅ PASS  | All tasks reference FR/NFR IDs; full artifact chain: spec → research → data-model → contracts → impl-plan. |

**Post-Design Gate: PASS** — No regressions from initial check.

## Research Summary

All unknowns resolved — see [research.md](research.md) for full details.

| # | Decision | Impact |
|---|----------|--------|
| R1 | New `idea_attachment` table with FK to `idea`, RLS matching existing pattern | High — core schema change |
| R2 | Expand ALLOWED_FILE_TYPES to 10 MIME types (add gif, webp, xlsx, pptx, csv) | Medium — constants + validation |
| R3 | Increase MAX_FILE_SIZE to 10MB, add MAX_TOTAL_SIZE (25MB), MAX_ATTACHMENTS (5) | Medium — constants + validation |
| R4 | Atomic upload: upload all files first, insert DB records, rollback storage on any failure | High — storage + API route |
| R5 | Legacy `attachment_url` read-only; detail page merges both sources | Medium — queries + UI |
| R6 | Supabase Storage delete API for atomic cleanup on failure | Medium — storage utility |
| R7 | Client-side drag-and-drop via HTML5 Drag & Drop API + input[type=file][multiple] | Low — well-understood pattern |

---

## Implementation Tasks

### Phase 1: Foundation — Constants, Types & Validation (TDD)

#### T1: Update shared constants for multi-file support

**Files**: `src/lib/constants.ts`
**Tests**: `tests/unit/constants.test.ts`
**Spec refs**: FR-01, FR-02, FR-03, FR-04

1. **Write tests first** for:
   - `MAX_FILE_SIZE` equals 10 MB (10,485,760 bytes)
   - `MAX_TOTAL_ATTACHMENT_SIZE` equals 25 MB (26,214,400 bytes)
   - `MAX_ATTACHMENTS` equals 5
   - `ALLOWED_FILE_TYPES` contains exactly 10 MIME types (existing 4 + gif, webp, xlsx, pptx, csv, image/gif)
   - `ALLOWED_FILE_EXTENSIONS` maps to human-readable labels for UI display

2. **Implement**:
   - Update `MAX_FILE_SIZE` from 5MB → 10MB
   - Add `MAX_TOTAL_ATTACHMENT_SIZE = 25 * 1024 * 1024`
   - Add `MAX_ATTACHMENTS = 5`
   - Expand `ALLOWED_FILE_TYPES` array with new MIME types
   - Add `ALLOWED_FILE_EXTENSIONS` map (MIME → display label) for UI error messages

3. **Verify**: All new + existing constants tests pass. Existing tests referencing old 5MB limit are updated.

---

#### T2: Add IdeaAttachment type and update shared types

**Files**: `src/types/index.ts`
**Tests**: `tests/unit/types.test.ts`
**Spec refs**: FR-10, Key Entity: Idea Attachment

1. **Write tests first** for:
   - `IdeaAttachment` type has required fields: id, idea_id, original_file_name, file_size, mime_type, storage_path, upload_order, created_at
   - `Idea` type retains `attachment_url` as `string | null` (legacy)

2. **Implement**:
   - Add `IdeaAttachment` interface to `src/types/index.ts`
   - Keep existing `Idea.attachment_url` field unchanged (backward compat)

3. **Verify**: Type tests pass; no downstream type errors.

---

#### T3: Update file validation for multi-file rules

**Files**: `src/lib/validation/idea.ts`
**Tests**: `tests/unit/validation.test.ts`
**Spec refs**: FR-01, FR-02, FR-03, FR-04, FR-07, FR-08

1. **Write tests first** for:
   - `validateFile` rejects files > 10 MB (updated from 5 MB)
   - `validateFile` rejects empty (0-byte) files
   - `validateFile` rejects disallowed MIME types
   - `validateFile` accepts all 10 supported MIME types
   - `validateFiles` (new) rejects if count > 5
   - `validateFiles` rejects if total size > 25 MB
   - `validateFiles` returns per-file errors without failing all valid files
   - `validateFiles` returns null (success) for 0 files (optional)
   - `validateFiles` returns null for 1–5 valid files within total size

2. **Implement**:
   - Update `validateFile` to check for 0-byte and use new 10MB limit + expanded types
   - Create `validateFiles(files: File[])` that validates count, individual files, and total size
   - Return structured error: `{ valid: File[]; errors: Array<{ index: number; name: string; error: string }> } | null`

3. **Verify**: All validation tests pass. Update existing tests referencing old 5MB limit.

---

### Phase 2: Database & Storage

#### T4: Create idea_attachment migration

**Files**: `supabase/migrations/004_add_idea_attachments.sql`
**Tests**: Manual verification via Supabase dashboard
**Spec refs**: FR-09, FR-10, FR-16

1. **Create migration**:
   - `idea_attachment` table: id (UUID PK), idea_id (FK → idea ON DELETE CASCADE), original_file_name (TEXT NOT NULL), file_size (BIGINT NOT NULL), mime_type (TEXT NOT NULL), storage_path (TEXT NOT NULL), upload_order (INT NOT NULL), created_at (TIMESTAMPTZ DEFAULT now())
   - Index on `idea_id` (FK index)
   - Composite index on `(idea_id, upload_order)` for ordered retrieval
   - RLS: Enable, authenticated SELECT, owner INSERT (via idea.user_id), admin DELETE

2. **RLS Policies**:
   - SELECT: All authenticated users can read all attachments (matches idea visibility)
   - INSERT: User can insert attachments for ideas they own
   - DELETE: Admins only (for potential cleanup; not exposed in UI)

3. **Verify**: Migration runs without error. RLS policies tested manually.

---

#### T5: Add batch storage operations with atomic cleanup

**Files**: `src/lib/supabase/storage.ts`
**Tests**: `tests/unit/storage.test.ts`
**Spec refs**: FR-09, FR-12, EC10, Clarification (atomic uploads)

1. **Write tests first** for:
   - `uploadMultipleAttachments` uploads N files and returns N storage paths
   - `uploadMultipleAttachments` rolls back all uploaded files if any upload fails
   - `deleteAttachments` deletes files by storage paths (for cleanup)
   - `getAttachmentDownloadUrl` generates signed URL with original file name in Content-Disposition
   - Existing `uploadIdeaAttachment` and `getAttachmentUrl` continue to work (legacy)

2. **Implement**:
   - `uploadMultipleAttachments(files: File[], userId: string)`: Upload sequentially, track paths, on error call `deleteAttachments` for already-uploaded files, throw
   - `deleteAttachments(paths: string[])`: Bulk delete from bucket
   - `getAttachmentDownloadUrl(storagePath: string, originalName: string)`: Signed URL with download disposition

3. **Verify**: All storage tests pass. Rollback scenario verified.

---

#### T6: Add idea_attachment query functions

**Files**: `src/lib/queries/attachments.ts`, `src/lib/queries/index.ts`
**Tests**: `tests/unit/queries-attachments.test.ts`
**Spec refs**: FR-10, FR-13, FR-15, FR-16

1. **Write tests first** for:
   - `createAttachments(supabase, attachments[])` inserts batch and returns created rows
   - `getAttachmentsByIdeaId(supabase, ideaId)` returns attachments ordered by `upload_order`
   - `deleteAttachmentsByIdeaId(supabase, ideaId)` deletes all attachments for an idea
   - `getAttachmentsForIdeas(supabase, ideaIds[])` returns attachments grouped by idea (for listing page)

2. **Implement**:
   - Create `src/lib/queries/attachments.ts` with all four functions
   - Export from `src/lib/queries/index.ts`

3. **Verify**: All query tests pass (mocked Supabase client).

---

### Phase 3: API Route Updates

#### T7: Update POST /api/ideas for multi-file upload

**Files**: `src/app/api/ideas/route.ts`
**Tests**: `tests/integration/api-ideas-multifile.test.ts`
**Spec refs**: FR-01–FR-08, FR-09, FR-10, EC10, Clarification (atomic)

1. **Write tests first** for:
   - POST with 0 files → 201 (attachments optional)
   - POST with 1 valid file → 201 with attachment record
   - POST with 5 valid files → 201 with 5 attachment records
   - POST with 6 files → 400 "Maximum 5 files allowed"
   - POST with oversized file → 400 with specific error
   - POST with invalid MIME type → 400 with specific error
   - POST with 0-byte file → 400 with specific error
   - POST with combined size > 25 MB → 400 with total size error
   - POST with upload failure mid-batch → 500 + cleanup (no partial data)
   - POST without auth → 401

2. **Implement**:
   - Update POST handler to extract multiple files from FormData (`formData.getAll("files")`)
   - Call `validateFiles()` for server-side validation (security boundary)
   - Call `uploadMultipleAttachments()` (atomic with rollback)
   - Insert idea row (without `attachment_url` — new model)
   - Call `createAttachments()` with file metadata + storage paths
   - On any DB failure after upload, call `deleteAttachments()` for cleanup
   - Return idea with attachments in response

3. **Verify**: All integration tests pass. Atomic behavior verified.

---

#### T8: Update GET /api/ideas/[id] for multi-attachment response

**Files**: `src/app/api/ideas/[id]/route.ts`
**Tests**: `tests/unit/api-idea-detail.test.ts`
**Spec refs**: FR-11, FR-12, FR-13, FR-15, FR-16

1. **Write tests first** for:
   - GET returns idea with `attachments[]` array (new model)
   - GET returns idea with `signed_attachment_url` for legacy ideas (backward compat)
   - Each attachment in array has `download_url` (signed) and `original_file_name`
   - Attachments ordered by `upload_order`
   - Legacy idea with `attachment_url` renders as single attachment in response

2. **Implement**:
   - After fetching idea, also fetch `getAttachmentsByIdeaId()`
   - Generate signed download URLs for each attachment (with original name)
   - If idea has legacy `attachment_url` and no `idea_attachment` records, include legacy as first attachment in response
   - Return merged response

3. **Verify**: All detail tests pass for both new and legacy ideas.

---

### Phase 4: UI Components

#### T9: Create multi-file upload component

**Files**: `src/components/ui/file-upload-zone.tsx`, `src/components/ui/attachment-list-form.tsx`
**Tests**: `tests/unit/file-upload-zone.test.tsx`
**Spec refs**: FR-01, FR-05, FR-06, FR-08, NFR-01, NFR-02, NFR-03, NFR-05

1. **Write tests first** for:
   - `FileUploadZone` renders drag-and-drop area with file picker button
   - Selecting files adds them to attachment list
   - Selecting a 6th file shows max count error
   - Selecting oversized/invalid/empty file shows inline error, keeps valid files
   - Remove button removes specific file from list
   - Running total displays current/max combined size
   - Drag-and-drop events add files correctly

2. **Implement**:
   - `FileUploadZone`: HTML5 drag-and-drop zone + `<input type="file" multiple accept="...">`, calls `validateFiles()` client-side
   - `AttachmentListForm`: Renders selected files with name, size, type icon, remove button. Shows size total bar (current/25MB).
   - Use shadcn/ui `Button`, `Card`, `Badge` components
   - File type icons via mapped labels (PDF icon, image icon, spreadsheet icon, etc.)

3. **Verify**: Component tests pass. Visual review in dev.

---

#### T10: Create attachment list detail component with thumbnails + lightbox

**Files**: `src/components/ui/attachment-list-detail.tsx`, `src/components/ui/image-lightbox.tsx`
**Tests**: `tests/unit/attachment-list-detail.test.tsx`
**Spec refs**: FR-13, FR-14, FR-16, NFR-04, Clarification (thumbnails + lightbox)

1. **Write tests first** for:
   - `AttachmentListDetail` renders list of attachments with name, type icon, size, download link
   - Image attachments show ~120px thumbnail preview
   - Clicking thumbnail opens `ImageLightbox` modal with larger image
   - Non-image attachments show file type icon (no thumbnail)
   - Download link triggers file download with original name
   - Legacy single attachment renders in same list format
   - Attachments ordered by upload sequence

2. **Implement**:
   - `AttachmentListDetail`: Maps attachments to rows with conditional thumbnail vs icon
   - `ImageLightbox`: shadcn `Dialog` wrapping full-size image, click-outside to close
   - Thumbnails: `<img>` with `max-width: 120px` + `object-fit: contain`

3. **Verify**: Component tests pass.

---

#### T11: Create upload progress indicator component

**Files**: `src/components/ui/upload-progress.tsx`
**Tests**: `tests/unit/upload-progress.test.tsx`
**Spec refs**: NFR-05, Clarification (progress indicator)

1. **Write tests first** for:
   - `UploadProgress` shows "Uploading X of Y files..." text
   - Submit button is disabled during upload
   - Progress updates as files complete

2. **Implement**:
   - Simple component: spinner + "Uploading X of Y files..." text
   - Receives `current` and `total` props
   - Uses shadcn `Button` disabled state

3. **Verify**: Component tests pass.

---

### Phase 5: Page Integration

#### T12: Update idea submission form for multi-file

**Files**: `src/app/ideas/new/page.tsx`
**Tests**: `tests/unit/new-idea-multifile.test.tsx`
**Spec refs**: FR-01–FR-08, NFR-01–NFR-05, S1–S3, S6

1. **Write tests first** for:
   - Form renders with `FileUploadZone` component
   - Submitting with multiple files sends all files in FormData
   - Submitting without files succeeds (optional)
   - Progress indicator appears during submission
   - Validation errors display for invalid files
   - Successful submission redirects to idea detail

2. **Implement**:
   - Replace single file input with `FileUploadZone` + `AttachmentListForm`
   - Update FormData construction to append multiple files as `files`
   - Add `UploadProgress` during submit
   - Handle API response (success → redirect, error → display)

3. **Verify**: Form tests pass. Manual e2e test with multiple file types.

---

#### T13: Update idea detail page for multi-attachment display

**Files**: `src/app/ideas/[id]/page.tsx`
**Tests**: `tests/unit/idea-detail-attachments.test.tsx`
**Spec refs**: FR-11, FR-13, FR-14, FR-15, FR-16, S4, S5, EC8

1. **Write tests first** for:
   - Detail page renders `AttachmentListDetail` with all attachments
   - Legacy idea with single `attachment_url` shows attachment in list format
   - New idea with multiple attachments shows all with thumbnails/icons
   - Image thumbnails are clickable (lightbox)
   - Download links work for each attachment

2. **Implement**:
   - Fetch attachments from API response
   - Render `AttachmentListDetail` component
   - Handle legacy fallback: if no `attachments[]` but has `attachment_url`, render as single attachment

3. **Verify**: Detail page tests pass for both new and legacy ideas.

---

### Phase 6: Testing Coverage

#### T14: Expand test coverage

**Files**: `tests/unit/`, `tests/integration/`
**Spec refs**: SC-1 through SC-7

1. Verify all existing tests still pass after changes
2. Add integration tests for multi-file upload API flow:
   - Full flow: upload 5 files → verify attachment records → download each → verify integrity
   - Atomic failure: mock one upload failure → verify no records or files persisted
3. Add tests for backward compatibility:
   - Legacy idea (has `attachment_url`, no `idea_attachment` records) renders correctly
4. **Target**: ≥ 80% coverage for `src/lib/`

---

## Task Dependency Graph

```
T1 (constants) ─────┐
                     ├── T3 (multi-file validation) ── T7 (POST API) ── T12 (submission form)
T2 (types) ──────────┘                                       │
                                                              │
T4 (migration) ── T5 (batch storage) ── T7                   │
                  T6 (attachment queries) ── T7               │
                                             │                │
                                             ├── T8 (GET API) ── T13 (detail page)
                                             │
T9 (upload component) ── T12                 │
T10 (detail component) ── T13                │
T11 (progress component) ── T12              │
                                             │
                                        T14 (coverage sweep — last)
```

## Execution Order

1. **T1** → **T2** → **T3** (foundation: constants, types, validation)
2. **T4** (migration — independent, can overlap with T1–T3)
3. **T5** → **T6** (storage + queries, depends on T4 for schema)
4. **T7** (API POST — depends on T3, T5, T6)
5. **T8** (API GET — depends on T6)
6. **T9** → **T10** → **T11** (UI components — can parallel with T7/T8)
7. **T12** (submission form — depends on T7, T9, T11)
8. **T13** (detail page — depends on T8, T10)
9. **T14** (coverage sweep — last)

---

## Generated Artifacts

| Artifact | Path |
| -------- | ---- |
| Feature Spec | [specs/2-multi-media-support/spec.md](spec.md) |
| Research | [specs/2-multi-media-support/research.md](research.md) |
| Data Model | [specs/2-multi-media-support/data-model.md](data-model.md) |
| API Contracts | [specs/2-multi-media-support/contracts/api.md](contracts/api.md) |
| Quickstart | [specs/2-multi-media-support/quickstart.md](quickstart.md) |
| Checklist | [specs/2-multi-media-support/checklists/requirements.md](checklists/requirements.md) |
| This Plan | [specs/2-multi-media-support/impl-plan.md](impl-plan.md) |
