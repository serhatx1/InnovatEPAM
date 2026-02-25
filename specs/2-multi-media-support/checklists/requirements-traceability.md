# Requirements Traceability Checklist: Multi-Media Support

**Feature**: 2-multi-media-support
**Created**: 2026-02-25

## Multi-File Upload

- [X] FR-01: Up to 5 files per idea; 6th file blocked with clear message
- [X] FR-02: Accepted formats: PDF, PNG, JPG, JPEG, GIF, WEBP, DOCX, XLSX, PPTX, CSV (client + server)
- [X] FR-03: Individual file limit 10 MB (client + server)
- [X] FR-04: Combined size limit 25 MB per idea (client + server)
- [X] FR-05: Attachment list on form shows file name, size, and type for each file
- [X] FR-06: Individual file removal from attachment list before submission
- [X] FR-07: Attachments remain optional; ideas submit with zero files
- [X] FR-08: Zero-byte (empty) files rejected with clear error

## File Storage & Retrieval

- [X] FR-09: Files stored with unique identifiers to prevent naming collisions
- [X] FR-10: Attachment metadata (original name, size, MIME type, storage path) persisted
- [X] FR-11: All authenticated users can download any attachment from any idea
- [X] FR-12: Downloaded files preserve original file name

## Display & Compatibility

- [X] FR-13: Detail page shows all attachments (name, type indicator, size, download action)
- [X] FR-14: Image attachments show inline thumbnail (~120px) with click-to-expand lightbox
- [X] FR-15: Legacy single-attachment ideas display correctly in new multi-attachment UI
- [X] FR-16: Attachment list ordered by upload sequence

## Non-Functional: UI/UX

- [X] NFR-01: Drag-and-drop zone + traditional file picker button
- [X] NFR-02: Individual file validation errors appear inline without clearing valid selections
- [X] NFR-03: Running total of combined file size relative to 25 MB limit
- [X] NFR-04: File type indicators use recognizable icons/labels
- [X] NFR-05: Single overall upload progress indicator during submission

## Edge Cases

- [X] EC-1: Exceed maximum file count (6th file blocked)
- [X] EC-2: Individual file exceeds 10 MB (rejected, others preserved)
- [X] EC-3: Total attachment size exceeds 25 MB (addition blocked)
- [X] EC-4: Unsupported file type (rejected, others preserved)
- [X] EC-5: Duplicate file names handled (unique storage identifiers)
- [X] EC-6: File removal during selection (excluded from submission)
- [X] EC-7: Zero-byte file rejected
- [X] EC-8: Legacy single-attachment ideas display correctly
- [X] EC-9: Browser back/refresh — unsaved attachments lost, no partial data
- [X] EC-10: Partial upload failure — entire submission rejected, uploaded files cleaned up

## Success Criteria

- [X] SC-1: Test submission with 5 valid files of different types succeeds
- [X] SC-2: Upload/download each supported type; file integrity verified
- [X] SC-3: Invalid file attempts (oversized, empty, wrong type) produce specific error messages
- [X] SC-4: Multiple user roles (submitter, admin) can access same attachments
- [X] SC-5: Legacy single-attachment ideas display in new multi-attachment UI
- [X] SC-6: Submission with 3 attachments completes in under 3 minutes
- [X] SC-7: Attachment area usable on mobile viewports (375px+)

## Testing

- [X] T-01: Unit tests for file validation (size, type, count, empty)
- [X] T-02: Unit tests for attachment query functions
- [X] T-03: Unit tests for storage helper functions
- [X] T-04: Component tests for FileUploadZone and attachment list UI
- [X] T-05: Integration tests for multi-file upload API flow
- [X] T-06: All unit and integration tests pass
