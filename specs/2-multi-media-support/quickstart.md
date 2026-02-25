# Quickstart: Multi-Media Support

**Feature**: 2-multi-media-support
**Branch**: 2-multi-media-support

## Prerequisites

- Node.js 20+
- Supabase project running (local or hosted) with Auth, Database, and Storage enabled
- `idea-attachments` storage bucket exists (created by 001_create_schema.sql)
- All prior migrations applied (001–003)

## Setup

```bash
# 1. Checkout the feature branch
git checkout 2-multi-media-support

# 2. Install dependencies (if any new packages added)
npm install

# 3. Apply the new migration
# In Supabase SQL Editor or via CLI:
# Run supabase/migrations/004_add_idea_attachments.sql

# 4. Verify the migration
# Check that idea_attachment table exists with correct columns and indexes
# Check that RLS policies are active

# 5. Start development server
npm run dev
```

## Verification Checklist

### Database

- [ ] `idea_attachment` table exists with columns: id, idea_id, original_file_name, file_size, mime_type, storage_path, upload_order, created_at
- [ ] FK index `idx_idea_attachment_idea_id` exists on idea_id
- [ ] Composite index `idx_idea_attachment_order` exists on (idea_id, upload_order)
- [ ] RLS enabled on `idea_attachment`
- [ ] SELECT policy allows all authenticated users
- [ ] INSERT policy restricts to idea owner
- [ ] DELETE policy restricts to admins
- [ ] Existing `idea` table is unchanged (attachment_url column still present)

### Constants & Validation

- [ ] `MAX_FILE_SIZE` updated to 10 MB (10,485,760 bytes)
- [ ] `MAX_TOTAL_ATTACHMENT_SIZE` set to 25 MB (26,214,400 bytes)
- [ ] `MAX_ATTACHMENTS` set to 5
- [ ] `ALLOWED_FILE_TYPES` contains 10 MIME types
- [ ] `validateFile()` rejects empty files, oversized files, and unsupported types
- [ ] `validateFiles()` rejects count > 5 and total size > 25 MB
- [ ] Validation runs on both client and server

### API

- [ ] POST `/api/ideas` accepts `files` (multiple) via FormData
- [ ] POST creates `idea_attachment` records for each file
- [ ] POST does NOT write to `idea.attachment_url` for new ideas
- [ ] POST returns idea with `attachments[]` array
- [ ] POST rolls back all uploads on any failure (atomic)
- [ ] GET `/api/ideas/[id]` returns `attachments[]` with signed download URLs
- [ ] GET `/api/ideas/[id]` handles legacy ideas (attachment_url → single attachment in array)

### UI

- [ ] Submission form shows drag-and-drop upload zone
- [ ] Submission form shows file picker button
- [ ] Selected files appear in attachment list with name, size, type
- [ ] Running total shows combined size / 25 MB
- [ ] Individual file errors appear inline (size, type, empty)
- [ ] Remove button removes a file from the list
- [ ] Progress indicator shows "Uploading X of Y files..." during submit
- [ ] Submit button is disabled during upload
- [ ] Detail page shows all attachments with name, type icon, size, download link
- [ ] Image attachments show ~120px thumbnails
- [ ] Clicking thumbnail opens lightbox with larger image
- [ ] Non-image attachments show file type icon
- [ ] Legacy ideas show single attachment in multi-attachment format

### Tests

- [ ] All existing tests pass
- [ ] New validation tests pass (constants, file validation, multi-file validation)
- [ ] New query tests pass (attachment CRUD)
- [ ] New storage tests pass (batch upload, rollback, delete)
- [ ] New API integration tests pass (multi-file POST, GET with attachments)
- [ ] New component tests pass (upload zone, attachment list, lightbox, progress)
- [ ] Coverage ≥ 80% for `src/lib/`

## Key File Locations

| Area | Path |
|------|------|
| Migration | `supabase/migrations/004_add_idea_attachments.sql` |
| Constants | `src/lib/constants.ts` |
| Types | `src/types/index.ts` |
| File validation | `src/lib/validation/idea.ts` |
| Storage utilities | `src/lib/supabase/storage.ts` |
| Attachment queries | `src/lib/queries/attachments.ts` |
| Ideas API (POST) | `src/app/api/ideas/route.ts` |
| Idea detail API (GET) | `src/app/api/ideas/[id]/route.ts` |
| Submission form | `src/app/ideas/new/page.tsx` |
| Idea detail page | `src/app/ideas/[id]/page.tsx` |
| Upload zone component | `src/components/ui/file-upload-zone.tsx` |
| Attachment list (form) | `src/components/ui/attachment-list-form.tsx` |
| Attachment list (detail) | `src/components/ui/attachment-list-detail.tsx` |
| Image lightbox | `src/components/ui/image-lightbox.tsx` |
| Upload progress | `src/components/ui/upload-progress.tsx` |

## Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/unit/validation.test.ts
npx vitest run tests/unit/queries-attachments.test.ts
npx vitest run tests/integration/api-ideas-multifile.test.ts
```
