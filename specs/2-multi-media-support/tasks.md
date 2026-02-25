# Tasks: Multi-Media Support

**Feature**: 2-multi-media-support
**Created**: 2026-02-25
**Plan**: [impl-plan.md](impl-plan.md)

---

## Phase 1: Foundation — Constants, Types & Validation (TDD)

### T1: Update shared constants for multi-file support [P]

- [X] Write tests for `MAX_FILE_SIZE` equals 10 MB (10,485,760 bytes) in tests/unit/constants.test.ts
- [X] Write tests for `MAX_TOTAL_ATTACHMENT_SIZE` equals 25 MB (26,214,400 bytes)
- [X] Write tests for `MAX_ATTACHMENTS` equals 5
- [X] Write tests for `ALLOWED_FILE_TYPES` contains exactly 9 unique MIME types (pdf, png, jpeg, gif, webp, docx, xlsx, pptx, csv)
- [X] Write tests for `FILE_TYPE_LABELS` maps to human-readable labels for UI display
- [X] Update `MAX_FILE_SIZE` from 5MB → 10MB in src/lib/constants.ts
- [X] Add `MAX_TOTAL_ATTACHMENT_SIZE = 25 * 1024 * 1024` in src/lib/constants.ts
- [X] Add `MAX_ATTACHMENTS = 5` in src/lib/constants.ts
- [X] Expand `ALLOWED_FILE_TYPES` array with new MIME types in src/lib/constants.ts
- [X] Add `FILE_TYPE_LABELS` map (MIME → display label) in src/lib/constants.ts
- [X] Verify all new + existing constants tests pass; update tests referencing old 5MB limit

### T2: Add IdeaAttachment type and update shared types [P]

- [X] Write tests for `IdeaAttachment` type has required fields: id, idea_id, original_file_name, file_size, mime_type, storage_path, upload_order, created_at in tests/unit/types.test.ts
- [X] Write tests that `Idea` type retains `attachment_url` as `string | null` (legacy)
- [X] Add `IdeaAttachment` interface to src/types/index.ts
- [X] Keep existing `Idea.attachment_url` field unchanged (backward compat)
- [X] Verify type tests pass; no downstream type errors

### T3: Update file validation for multi-file rules

- [X] Write tests for `validateFile` rejects files > 10 MB (updated from 5 MB) in tests/unit/validation.test.ts
- [X] Write tests for `validateFile` rejects empty (0-byte) files
- [X] Write tests for `validateFile` rejects disallowed MIME types
- [X] Write tests for `validateFile` accepts all 9 supported MIME types
- [X] Write tests for `validateFiles` (new) rejects if count > 5
- [X] Write tests for `validateFiles` rejects if total size > 25 MB
- [X] Write tests for `validateFiles` returns per-file errors without failing all valid files
- [X] Write tests for `validateFiles` returns null (success) for 0 files (optional)
- [X] Write tests for `validateFiles` returns null for 1–5 valid files within total size
- [X] Update `validateFile` to check for 0-byte and use new 10MB limit + expanded types in src/lib/validation/idea.ts
- [X] Create `validateFiles(files: File[])` that validates count, individual files, and total size in src/lib/validation/idea.ts
- [X] Return structured error: `{ countError?, totalSizeError?, fileErrors?, valid[] } | null`
- [X] Verify all validation tests pass; update existing tests referencing old 5MB limit

---

## Phase 2: Database & Storage

### T4: Create idea_attachment migration

- [X] Create `supabase/migrations/004_add_idea_attachments.sql` with `idea_attachment` table
- [X] Table columns: id (UUID PK), idea_id (FK → idea ON DELETE CASCADE), original_file_name (TEXT NOT NULL), file_size (BIGINT NOT NULL), mime_type (TEXT NOT NULL), storage_path (TEXT NOT NULL UNIQUE), upload_order (INT NOT NULL), created_at (TIMESTAMPTZ DEFAULT now())
- [X] Add index on `idea_id` (FK index)
- [X] Add composite index on `(idea_id, upload_order)` for ordered retrieval
- [X] Enable RLS on `idea_attachment`
- [X] Add SELECT policy: all authenticated users can read all attachments
- [X] Add INSERT policy: user can insert attachments for ideas they own
- [X] Add DELETE policy: admins only
- [X] Verify migration runs without error

### T5: Add batch storage operations with atomic cleanup

- [X] Write tests for `uploadMultipleAttachments` uploads N files and returns N storage paths in tests/unit/storage.test.ts
- [X] Write tests for `uploadMultipleAttachments` rolls back all uploaded files if any upload fails
- [X] Write tests for `deleteAttachments` deletes files by storage paths (for cleanup)
- [X] Write tests for `getAttachmentDownloadUrl` generates signed URL with original file name
- [X] Write tests that existing `uploadIdeaAttachment` and `getAttachmentUrl` continue to work (legacy)
- [X] Implement `uploadMultipleAttachments(files: File[], userId: string)` in src/lib/supabase/storage.ts
- [X] Implement `deleteAttachments(paths: string[])` in src/lib/supabase/storage.ts
- [X] Implement `getAttachmentDownloadUrl(storagePath: string, originalName: string)` in src/lib/supabase/storage.ts
- [X] Verify all storage tests pass; rollback scenario verified

### T6: Add idea_attachment query functions

- [X] Write tests for `createAttachments(supabase, attachments[])` inserts batch and returns created rows in tests/unit/queries-attachments.test.ts
- [X] Write tests for `getAttachmentsByIdeaId(supabase, ideaId)` returns attachments ordered by `upload_order`
- [X] Write tests for `deleteAttachmentsByIdeaId(supabase, ideaId)` deletes all attachments for an idea
- [X] Write tests for `getAttachmentsForIdeas(supabase, ideaIds[])` returns attachments grouped by idea
- [X] Implement all four functions in src/lib/queries/attachments.ts
- [X] Export from src/lib/queries/index.ts
- [X] Verify all query tests pass (mocked Supabase client)

---

## Phase 3: API Route Updates

### T7: Update POST /api/ideas for multi-file upload

- [X] Write tests for POST with 0 files → 201 (attachments optional) in tests/integration/api-ideas-multifile.test.ts
- [X] Write tests for POST with 1 valid file → 201 with attachment record
- [X] Write tests for POST with 5 valid files → 201 with 5 attachment records
- [X] Write tests for POST with 6 files → 400 "Maximum 5 files allowed"
- [X] Write tests for POST with oversized file → 400 with specific error
- [X] Write tests for POST with invalid MIME type → 400 with specific error
- [X] Write tests for POST with 0-byte file → 400 with specific error
- [X] Write tests for POST with combined size > 25 MB → 400 with total size error
- [X] Write tests for POST with upload failure mid-batch → 500 + cleanup (no partial data)
- [X] Write tests for POST without auth → 401
- [X] Update POST handler to extract multiple files from FormData (`formData.getAll("files")`) in src/app/api/ideas/route.ts
- [X] Call `validateFiles()` for server-side validation (security boundary)
- [X] Call `uploadMultipleAttachments()` (atomic with rollback)
- [X] Insert idea row (without `attachment_url` — new model)
- [X] Call `createAttachments()` with file metadata + storage paths
- [X] On any DB failure after upload, call `deleteAttachments()` for cleanup
- [X] Return idea with attachments in response
- [X] Verify all integration tests pass; atomic behavior verified

### T8: Update GET /api/ideas/[id] for multi-attachment response

- [X] Write tests for GET returns idea with `attachments[]` array (new model) in tests/unit/api-idea-detail.test.ts
- [X] Write tests for GET returns idea with `signed_attachment_url` for legacy ideas (backward compat)
- [X] Write tests that each attachment in array has `download_url` (signed) and `original_file_name`
- [X] Write tests for attachments ordered by `upload_order`
- [X] Write tests that legacy idea with `attachment_url` renders as single attachment in response
- [X] Fetch `getAttachmentsByIdeaId()` after fetching idea in src/app/api/ideas/[id]/route.ts
- [X] Generate signed download URLs for each attachment (with original name)
- [X] Handle legacy `attachment_url` fallback: if no `idea_attachment` records, include legacy as first attachment
- [X] Return merged response
- [X] Verify all detail tests pass for both new and legacy ideas

---

## Phase 4: UI Components

### T9: Create multi-file upload component

- [X] Write tests for `FileUploadZone` renders drag-and-drop area with file picker button in tests/unit/file-upload-zone.test.tsx
- [X] Write tests for selecting files adds them to attachment list
- [X] Write tests for selecting a 6th file shows max count error
- [X] Write tests for selecting oversized/invalid/empty file shows inline error, keeps valid files
- [X] Write tests for remove button removes specific file from list
- [X] Write tests for running total displays current/max combined size
- [X] Write tests for drag-and-drop events add files correctly
- [X] Implement `FileUploadZone` with HTML5 drag-and-drop + `<input type="file" multiple>` in src/components/ui/file-upload-zone.tsx
- [X] Implement `AttachmentListForm` with file metadata, remove button, size total bar in src/components/ui/attachment-list-form.tsx
- [X] Use shadcn/ui Button, Card, Badge components
- [X] Add file type icons via mapped labels
- [X] Verify component tests pass

### T10: Create attachment list detail component with thumbnails + lightbox

- [X] Write tests for `AttachmentListDetail` renders list with name, type icon, size, download link in tests/unit/attachment-list-detail.test.tsx
- [X] Write tests for image attachments show ~120px thumbnail preview
- [X] Write tests for clicking thumbnail opens `ImageLightbox` modal with larger image
- [X] Write tests for non-image attachments show file type icon (no thumbnail)
- [X] Write tests for download link triggers file download with original name
- [X] Write tests for legacy single attachment renders in same list format
- [X] Write tests for attachments ordered by upload sequence
- [X] Implement `AttachmentListDetail` in src/components/ui/attachment-list-detail.tsx
- [X] Implement `ImageLightbox` using shadcn Dialog in src/components/ui/image-lightbox.tsx
- [X] Thumbnails: `<img>` with `max-width: 120px` + `object-fit: contain`
- [X] Verify component tests pass

### T11: Create upload progress indicator component

- [X] Write tests for `UploadProgress` shows "Uploading X of Y files..." text in tests/unit/upload-progress.test.tsx
- [X] Write tests for submit button is disabled during upload
- [X] Write tests for progress updates as files complete
- [X] Implement `UploadProgress` component in src/components/ui/upload-progress.tsx
- [X] Uses shadcn Button disabled state
- [X] Verify component tests pass

---

## Phase 5: Page Integration

### T12: Update idea submission form for multi-file

- [X] Write tests for form renders with `FileUploadZone` component in tests/unit/new-idea-multifile.test.tsx
- [X] Write tests for submitting with multiple files sends all files in FormData
- [X] Write tests for submitting without files succeeds (optional)
- [X] Write tests for progress indicator appears during submission
- [X] Write tests for validation errors display for invalid files
- [X] Write tests for successful submission redirects to idea detail
- [X] Replace single file input with `FileUploadZone` + `AttachmentListForm` in src/app/ideas/new/page.tsx
- [X] Update FormData construction to append multiple files as `files`
- [X] Add `UploadProgress` during submit
- [X] Handle API response (success → redirect, error → display)
- [X] Verify form tests pass

### T13: Update idea detail page for multi-attachment display

- [X] Write tests for detail page renders `AttachmentListDetail` with all attachments in tests/unit/idea-detail-attachments.test.tsx
- [X] Write tests for legacy idea with single `attachment_url` shows attachment in list format
- [X] Write tests for new idea with multiple attachments shows all with thumbnails/icons
- [X] Write tests for image thumbnails are clickable (lightbox)
- [X] Write tests for download links work for each attachment
- [X] Fetch attachments from API response in src/app/ideas/[id]/page.tsx
- [X] Render `AttachmentListDetail` component
- [X] Handle legacy fallback: if no `attachments[]` but has `attachment_url`, render as single attachment
- [X] Verify detail page tests pass for both new and legacy ideas

---

## Phase 6: Testing Coverage

### T14: Expand test coverage

- [ ] Verify all existing tests still pass after changes
- [ ] Add integration test for full flow: upload 5 files → verify attachment records → download each → verify integrity in tests/integration/
- [ ] Add integration test for atomic failure: mock one upload failure → verify no records or files persisted
- [ ] Add tests for backward compatibility: legacy idea (has `attachment_url`, no `idea_attachment` records) renders correctly
- [ ] Verify ≥ 80% coverage for `src/lib/`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Foundation) → Phase 2 (Database) → Phase 3 (API) → Phase 5 (Pages) → Phase 6 (Coverage)
- Phase 4 (UI Components) can parallel with Phase 2/3

### Task-Level Dependency Graph

```
T1 (constants) ─────┐
                     ├── T3 (validation) ── T7 (POST API) ── T12 (submission form)
T2 (types) ──────────┘                           │
                                                  │
T4 (migration) ── T5 (storage) ── T7             │
                  T6 (queries) ── T7              │
                                   │              │
                                   ├── T8 (GET API) ── T13 (detail page)
                                   │
T9 (upload component) ── T12       │
T10 (detail component) ── T13      │
T11 (progress component) ── T12    │
                                   │
                              T14 (coverage sweep — last)
```

### Execution Order

1. **T1** → **T2** → **T3** (foundation: constants, types, validation)
2. **T4** (migration — independent, can overlap with T1–T3)
3. **T5** → **T6** (storage + queries, depends on T4 for schema)
4. **T7** (API POST — depends on T3, T5, T6)
5. **T8** (API GET — depends on T6)
6. **T9** → **T10** → **T11** (UI components — can parallel with T7/T8)
7. **T12** (submission form — depends on T7, T9, T11)
8. **T13** (detail page — depends on T8, T10)
9. **T14** (coverage sweep — last)

### Parallel Execution Examples

- **T1** and **T2** can run in parallel [P] (different files: constants.ts vs types/index.ts)
- **T4** can overlap with T1–T3 (migration is independent of TS code)
- **T9**, **T10**, **T11** can parallel with T7/T8 (UI components vs API routes)
