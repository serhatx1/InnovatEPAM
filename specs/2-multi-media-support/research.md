# Research: Multi-Media Support

**Feature**: 2-multi-media-support
**Created**: 2026-02-25

## R1: Database Schema for Multi-File Attachments

**Task**: How to model multiple file attachments per idea in the existing Postgres schema.

**Decision**: Create a new `idea_attachment` table with a foreign key to `idea`.

**Rationale**: The current schema stores a single `attachment_url` directly on the `idea` row. Extending to multiple files requires a one-to-many relationship — a separate child table is the standard relational approach. This avoids JSON arrays (which can't be indexed or constrained at the DB level) and keeps the schema normalized. The existing `attachment_url` column is retained read-only for backward compatibility with legacy ideas.

**Alternatives considered**:
- **JSON array on idea row**: Simpler migration, but loses referential integrity, cannot enforce per-row constraints (file size, type), harder to query individual attachments, and doesn't support RLS per-attachment.
- **Separate storage-only approach (no DB records)**: Would lose metadata (original name, size, type, order) and make listing/ordering impossible without scanning storage.

---

## R2: Expanded File Type Support

**Task**: Which additional file types to support beyond the MVP set (PDF, PNG, JPG, DOCX).

**Decision**: Add GIF, WEBP, XLSX, PPTX, and CSV, totaling 10 accepted MIME types.

**Rationale**: These cover the most common business document and visual formats employees would use to support innovation proposals. GIF/WEBP expand image support (animated diagrams, modern web images). XLSX covers data/spreadsheet evidence. PPTX covers presentations. CSV covers lightweight data exports. All are safe, standard formats with no executable risk.

**MIME type mapping**:
| Extension | MIME Type |
|-----------|-----------|
| PDF | `application/pdf` |
| PNG | `image/png` |
| JPG/JPEG | `image/jpeg` |
| GIF | `image/gif` |
| WEBP | `image/webp` |
| DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| XLSX | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| PPTX | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| CSV | `text/csv` |

**Alternatives considered**:
- **Include ZIP/archives**: Rejected — security risk (can contain executables), hard to validate contents.
- **Include SVG**: Rejected — SVG can contain embedded JavaScript, posing XSS risk.
- **Include MP4/video**: Rejected — significantly increases storage costs and complexity; out of scope.

---

## R3: File Size Limits

**Task**: Determine appropriate per-file and total size limits for multi-file upload.

**Decision**: 10 MB per file, 25 MB total per idea, maximum 5 files.

**Rationale**: The MVP limit of 5 MB per single file was adequate for one attachment but is restrictive for presentations and spreadsheets. 10 MB handles large PPTX/XLSX files comfortably. The 25 MB total limit (5 × 5 MB or 2.5 × 10 MB combinations) prevents abuse while allowing substantive submissions. 5 files is sufficient for "diagram + spreadsheet + presentation + supporting docs" scenarios without encouraging attachment dumping.

**Alternatives considered**:
- **Keep 5 MB per file**: Too restrictive for PPTX/XLSX which commonly exceed 5 MB.
- **50 MB total**: Excessive for an innovation portal; increases storage costs and upload times unnecessarily.
- **10 files max**: More files than needed for idea proposals; increases complexity and storage risk.

---

## R4: Atomic Upload Strategy

**Task**: How to handle partial upload failures to ensure data consistency (Clarification Q1).

**Decision**: All-or-nothing — upload all files first, then insert DB records. If any upload fails, delete all already-uploaded files and return an error. No idea or attachment records are persisted.

**Rationale**: Partial saves create confusing UX (submitter intended 5 files, only 3 saved) and data integrity issues. Atomic behavior is simpler to reason about and test. The cleanup cost (deleting a few uploaded files on failure) is negligible.

**Implementation approach**:
1. Validate all files client-side (immediate feedback)
2. Validate all files server-side (security boundary)
3. Upload files sequentially to storage, tracking paths
4. If any upload fails: call `storage.remove(uploadedPaths)` and return 500
5. If all uploads succeed: insert idea row + attachment records in a single DB operation
6. If DB insert fails: call `storage.remove(allPaths)` and return 500

**Alternatives considered**:
- **Partial save with retry**: More complex, confusing UX, harder to test.
- **Background upload with status polling**: Over-engineered for 5 files × 10 MB max.
- **Transactional storage + DB**: Supabase Storage doesn't support transactions across storage + DB natively.

---

## R5: Legacy Backward Compatibility

**Task**: How to handle existing ideas that have a single `attachment_url` (Clarification Q4).

**Decision**: Keep `attachment_url` column read-only. New ideas use only `idea_attachment` table. Detail page merges both sources for display.

**Rationale**: Avoids a data migration that would need to create `idea_attachment` rows for every existing idea. The application layer checks both sources: if an idea has `idea_attachment` records, show those; if it has only `attachment_url` (legacy), show that as a single attachment in the multi-attachment UI format.

**Display logic**:
```
if idea has idea_attachment records → display those
else if idea has attachment_url → display as single legacy attachment
else → no attachments
```

**Alternatives considered**:
- **Migrate all existing data**: Creates risk of data migration failures; unnecessary complexity for potentially few legacy ideas.
- **Dual-write (populate both)**: Increases write complexity and creates inconsistency risk for new ideas.

---

## R6: Supabase Storage Delete for Cleanup

**Task**: Verify that Supabase Storage supports batch file deletion for atomic cleanup.

**Decision**: Use `supabase.storage.from(bucket).remove(paths[])` — the Supabase JS client natively supports deleting multiple files in one call.

**Rationale**: The `remove()` method accepts an array of file paths and deletes them all. This is sufficient for cleaning up partially uploaded files on failure. If the cleanup itself fails, orphaned files in storage are harmless (they're never referenced by any DB record) and can be cleaned up via a periodic storage audit if needed.

**Alternatives considered**:
- **Individual delete calls per file**: Works but less efficient. The array-based `remove()` is a single network call.
- **Storage lifecycle/TTL policies**: Supabase doesn't natively support expiration policies on objects.

---

## R7: Client-Side Drag-and-Drop Implementation

**Task**: Best approach for drag-and-drop file upload in the React/Next.js context.

**Decision**: Use native HTML5 Drag & Drop API with React event handlers (`onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop`). No external library.

**Rationale**: The HTML5 Drag & Drop API is well-supported across all modern browsers and sufficient for this use case (dropping files into a zone). Combined with `<input type="file" multiple>` for the fallback button, this covers both interaction modes specified in NFR-01. Adding a library (react-dropzone, etc.) is unnecessary complexity per the Simplicity First principle.

**Alternatives considered**:
- **react-dropzone**: Popular library, but adds a dependency for something achievable in ~50 lines of native code.
- **react-dnd**: Overkill — designed for complex drag-and-drop UI (sortable lists, kanban), not file drops.

---

## R8: Image Thumbnail Previews

**Task**: How to implement image thumbnails and lightbox on the detail page (Clarification Q2).

**Decision**: Render thumbnails using `<img>` tags with `max-width: 120px` and `object-fit: contain`. Lightbox uses shadcn `Dialog` component.

**Rationale**: No server-side thumbnail generation is needed — the browser handles resizing via CSS. The original image is loaded and scaled down. For typical idea attachments (photos, diagrams), the file sizes are manageable (≤10 MB). The shadcn `Dialog` component provides an accessible modal that fits the existing component system.

**Image detection logic**: Check MIME type against image types (`image/png`, `image/jpeg`, `image/gif`, `image/webp`). If image → render thumbnail + lightbox. If not → render file type icon.

**Alternatives considered**:
- **Server-side thumbnail generation**: Adds complexity (image processing dependency, storage for thumbnails). Unnecessary for ≤10 MB images.
- **Third-party lightbox library**: Adds dependency. shadcn `Dialog` is already in the component system and sufficient.
