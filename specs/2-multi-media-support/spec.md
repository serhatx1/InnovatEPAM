# Feature Specification: Multi-Media Support

**Created**: 2026-02-25
**Status**: Draft
**Branch**: 2-multi-media-support

## Overview

This feature upgrades the idea submission experience from a single file attachment to multiple file attachments per idea, with expanded support for various file types. Submitters can upload several files (documents, images, presentations, spreadsheets) to better illustrate and support their innovation proposals, and all authenticated users can view and download the full set of attachments on the idea detail page.

## Problem Statement

The current portal limits each idea to a single file attachment restricted to four formats (PDF, PNG, JPG, DOCX). This forces submitters to consolidate supporting materials into one file — or choose only their most important artifact — leading to lost context and weaker proposals. Reviewers often lack the visual aids, supplementary data, or multi-format evidence they need to make informed evaluation decisions. Complex ideas that benefit from diagrams, spreadsheets, presentations, and photos are particularly underserved by the single-attachment constraint.

## Clarifications

### Session 2026-02-25

- Q: How should partial upload failures be handled (e.g., 3 of 5 files succeed, then one fails)? → A: Atomic — entire submission fails if any file upload fails; all already-uploaded files are cleaned up.
- Q: What thumbnail size should image previews use on the detail page? → A: Small fixed thumbnails (~120px, aspect-ratio preserved) with click-to-expand to a larger lightbox/modal view.
- Q: Should file size and type validation be enforced on the server in addition to the client? → A: Both — client-side for instant feedback, server-side as the authoritative security check.
- Q: Should new multi-attachment ideas also populate the legacy single-attachment field? → A: No — new ideas use only the new attachments model; the legacy field is read-only for old ideas.
- Q: Should the system show upload progress indication during submission? → A: Single overall progress indicator showing upload status (e.g., "Uploading 3 of 5 files...").

## User Scenarios & Testing

### Primary Scenarios

#### S1: Attach Multiple Files During Idea Submission

**As** a submitter, **I want to** attach multiple files when creating an idea **so that** I can provide comprehensive supporting materials.

- **Given** an authenticated submitter is on the idea submission form
- **When** they select multiple files (up to the defined limit) from their device
- **Then** all selected files appear in an attachment list on the form with file name, size, and a remove option for each

#### S2: Remove an Attachment Before Submission

**As** a submitter, **I want to** remove an individual file from my attachment list before submitting **so that** I can correct mistakes or swap files.

- **Given** a submitter has added multiple files to the submission form
- **When** they click the remove action next to a specific file
- **Then** that file is removed from the attachment list and the remaining files are preserved

#### S3: Submit an Idea with Multiple Attachments

**As** a submitter, **I want to** submit my idea with all attached files **so that** reviewers receive the complete set of materials.

- **Given** a submitter has filled in all required fields and attached one or more valid files
- **When** they submit the form
- **Then** the idea is saved with status "submitted," all attached files are securely stored, and the submitter is redirected to the idea detail view showing all attachments

#### S4: View All Attachments on Idea Detail

**As** an authenticated user, **I want to** see all files attached to an idea **so that** I can review the complete set of supporting materials.

- **Given** an authenticated user views the detail page of an idea with multiple attachments
- **When** the page loads
- **Then** they see a list of all attached files showing file name, file type indicator, and file size, with a download link for each

#### S5: Download an Individual Attachment

**As** an authenticated user, **I want to** download any individual attachment from an idea **so that** I can review it in detail.

- **Given** an authenticated user is on the idea detail page
- **When** they click the download link for a specific attachment
- **Then** the file downloads to their device with the original file name preserved

#### S6: Submit an Idea Without Attachments

**As** a submitter, **I want to** submit an idea without any file attachments **so that** attachments remain optional.

- **Given** a submitter has filled in all required fields but has not added any files
- **When** they submit the form
- **Then** the idea is saved successfully with zero attachments

### Edge Cases

- **EC1: Exceed maximum file count** — A submitter attempts to add more files than the allowed limit. The system prevents the addition and displays a message indicating the maximum number of files allowed.
- **EC2: Individual file exceeds size limit** — A submitter selects a file larger than 10 MB. The system rejects that specific file with a clear message while preserving other valid files already in the list.
- **EC3: Total attachment size exceeds limit** — A submitter's combined file sizes exceed 25 MB. The system prevents the addition and informs the user of the total size limit.
- **EC4: Unsupported file type** — A submitter selects a file with a disallowed extension (e.g., .exe, .bat). The system rejects that file with a message listing accepted formats while preserving other valid files.
- **EC5: Duplicate file name** — A submitter attempts to attach two files with the same name. The system allows both uploads (storage uses unique identifiers) but displays both files distinctly in the attachment list.
- **EC6: File removal during upload** — A submitter removes a file from the list while other files are still being selected. The removed file is excluded from the final submission.
- **EC7: Zero-byte file** — A submitter attaches an empty file. The system rejects the file with a message indicating the file is empty.
- **EC8: Legacy idea with single attachment** — An idea submitted before this feature (with the old single-attachment model) is viewed. The system displays the existing single attachment correctly in the new multi-attachment UI.
- **EC9: Browser back/refresh during upload** — A submitter navigates away during file selection. Standard browser behavior applies; unsaved attachments are lost and no partial data is persisted.
- **EC10: Partial upload failure** — One or more files fail to upload during submission (e.g., network error mid-upload). The entire submission is rejected, any already-uploaded files are cleaned up, and the submitter is shown a clear error indicating the failure. No idea or partial attachment data is persisted.

## Functional Requirements

### Multi-File Upload

| ID    | Requirement                                                                                                   | Acceptance Criteria                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FR-01 | The system shall allow submitters to attach up to 5 files per idea submission                                  | Attempts to add a 6th file are blocked with a clear message                                       |
| FR-02 | The system shall accept files in the following formats: PDF, PNG, JPG, JPEG, GIF, WEBP, DOCX, XLSX, PPTX, CSV | Files with other extensions or MIME types are rejected with a message listing accepted formats; validation enforced on both client and server |
| FR-03 | Each individual file shall not exceed 10 MB in size                                                            | Files larger than 10 MB are rejected with a clear error message; enforced on both client and server |
| FR-04 | The total combined size of all attachments per idea shall not exceed 25 MB                                     | Additions that would exceed 25 MB total are blocked with a message showing current and maximum sizes; enforced on both client and server |
| FR-05 | The system shall display an attachment list on the submission form showing file name, file size, and file type for each selected file | All selected files are visible with their metadata before submission                              |
| FR-06 | The system shall allow submitters to remove individual files from the attachment list before submission         | Removed files are excluded from the submission; remaining files are unaffected                     |
| FR-07 | File attachments shall remain optional; ideas can be submitted with zero attachments                           | Ideas without attachments are saved successfully                                                  |
| FR-08 | The system shall reject zero-byte (empty) files                                                                | Empty files are rejected with a clear error message                                               |

### File Storage & Retrieval

| ID    | Requirement                                                                                                   | Acceptance Criteria                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FR-09 | Each uploaded file shall be stored securely with a unique identifier to prevent naming collisions               | Multiple files with the same name can coexist; storage paths use unique identifiers                |
| FR-10 | The system shall maintain a record of each attachment's original file name, file size, MIME type, and storage location | Attachment metadata is retrievable for display and download purposes                              |
| FR-11 | All authenticated users shall be able to download any attachment from any idea                                  | Download links function for all authenticated users, not just the submitter or admins              |
| FR-12 | Downloaded files shall preserve the original file name                                                         | The browser download uses the original file name, not the storage identifier                       |

### Display & Compatibility

| ID    | Requirement                                                                                                   | Acceptance Criteria                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FR-13 | The idea detail page shall display all attachments in a list showing file name, file type indicator, file size, and a download action | Each attachment is individually identifiable and downloadable                                      |
| FR-14 | Image attachments (PNG, JPG, JPEG, GIF, WEBP) shall display inline thumbnail previews (~120px, aspect-ratio preserved) on the idea detail page, with click-to-expand to a larger lightbox/modal view | Image files show a small visual preview; clicking the thumbnail opens a larger view; non-image files show a file type icon |
| FR-15 | The system shall correctly display legacy ideas that have a single attachment from the previous model           | Pre-existing ideas with one attachment render correctly in the new multi-attachment UI              |
| FR-16 | The attachment list on the idea detail page shall be ordered by upload sequence (first uploaded appears first)  | Attachments maintain their original upload order                                                  |

## Non-Functional Requirements: UI/UX

| ID     | Requirement                                                                                                  | Acceptance Criteria |
| ------ | ------------------------------------------------------------------------------------------------------------ | ------------------- |
| NFR-01 | The file upload area shall provide a drag-and-drop zone as well as a traditional file picker button            | Users can add files via drag-and-drop or button click                                             |
| NFR-02 | Individual file validation errors (size, type, empty) shall appear inline next to the rejected file without clearing valid selections | Valid files remain in the list; only the problematic file shows an error                          |
| NFR-03 | The attachment list shall display a running total of combined file size relative to the 25 MB limit            | Users can see how much upload capacity remains                                                    |
| NFR-04 | File type indicators shall use recognizable icons or labels (e.g., PDF icon, image icon, spreadsheet icon)     | Users can identify file types at a glance without reading the extension                           |
| NFR-05 | During form submission with attachments, the system shall display a single overall progress indicator showing upload status (e.g., "Uploading 3 of 5 files...") | Users see clear feedback that uploads are in progress; the submit button is disabled until complete |

## Success Criteria

| ID   | Criterion                                                                                                       | Measurement                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| SC-1 | Submitters can attach and submit up to 5 files with a single idea                                                | Test submission with 5 valid files of different types succeeds |
| SC-2 | All supported file types are uploadable and downloadable without data corruption                                  | Upload then download each supported type; verify file integrity via checksum |
| SC-3 | File validation prevents oversized, empty, and unsupported files with clear user feedback                         | Attempted upload of each invalid file type produces a specific, actionable error message |
| SC-4 | All authenticated users can view and download all attachments on any idea                                         | Multiple users (submitter, other submitter, admin) can all access the same attachments |
| SC-5 | Legacy single-attachment ideas display correctly in the new UI                                                    | Existing ideas with one attachment show the attachment in the multi-attachment list format |
| SC-6 | Idea submission with multiple attachments completes in under 3 minutes                                            | Timed user test from form load to successful submission with 3 attachments |
| SC-7 | The attachment area is usable on mobile viewports (375px+)                                                        | File upload and attachment list render without horizontal scroll on mobile |

## Key Entities

### Idea (modified)

- **idea_id**: Unique identifier
- **title**: 5–100 characters
- **description**: 20–1000 characters
- **category**: Value from predefined category list
- **status**: One of "submitted", "under_review", "accepted", "rejected"
- **submitter_id**: Reference to the user who submitted
- **legacy_attachment**: (Legacy, read-only) Optional reference to a single stored file — retained only for displaying pre-existing ideas; new submissions do not write to this field
- **created_at**: Submission timestamp
- **updated_at**: Last modification timestamp

### Idea Attachment (new)

- **attachment_id**: Unique identifier
- **idea_id**: Reference to the parent idea
- **original_file_name**: The file name as uploaded by the user
- **file_size**: File size in bytes
- **file_type**: The format of the uploaded file (e.g., PDF, PNG, spreadsheet)
- **storage_reference**: Unique reference to the stored file
- **upload_order**: Sequence number indicating the order the file was added (for display ordering)
- **created_at**: Upload timestamp

## Scope

### In Scope

- Multiple file attachments per idea (up to 5 files)
- Expanded file type support: PDF, PNG, JPG, JPEG, GIF, WEBP, DOCX, XLSX, PPTX, CSV
- Individual file size limit of 10 MB and combined size limit of 25 MB per idea
- Drag-and-drop and button-based file selection
- Attachment list with file metadata display on both submission form and detail page
- Individual file removal from attachment list before submission
- Inline thumbnail previews for image attachments on the detail page
- Download of individual attachments with original file names preserved
- Backward compatibility for legacy ideas with single `attachment_url`
- Unique storage identifiers to handle duplicate file names
- Running total of combined attachment size on the submission form

### Out of Scope

- File versioning or replacing an attachment after submission
- Bulk download of all attachments (e.g., as a ZIP)
- In-browser file preview for non-image types (PDF viewer, document viewer)
- Attachment reordering after selection
- Virus/malware scanning of uploaded files
- Image resizing or compression
- Attachment comments or annotations
- Sharing individual attachment links outside the portal
- Attachment-level access control (all authenticated users can access all attachments)
- Editing or removing attachments after idea submission

## Dependencies

- Existing idea submission flow and form infrastructure
- Existing file storage infrastructure with authenticated access controls
- Existing user data and authentication system
- Role-based access control in place

## Assumptions

- **Backward compatibility**: Ideas submitted before this feature (with a single attachment) will continue to display correctly. Legacy single-file ideas will appear seamlessly alongside new multi-attachment ideas without requiring data migration. New idea submissions will use only the new attachments model and will not populate the legacy single-attachment field.
- **File type expansion**: The expanded list of accepted formats (adding GIF, WEBP, XLSX, PPTX, CSV) covers common business and visual file types. Executable files and archives are excluded for security.
- **Size limits**: The 10 MB per-file limit (doubled from the 5 MB MVP limit) and 25 MB total limit balance usability with reasonable storage costs. These limits are enforced before upload begins.
- **Validation layers**: All file validation (size, type, empty-file checks) is enforced both client-side (for immediate user feedback) and server-side (as the authoritative security boundary). Client-side validation alone is not sufficient since it can be bypassed.
- **Upload behavior**: Files are uploaded as part of the form submission flow. There is no background upload or resumable upload mechanism.
- **Upload atomicity**: File uploads are all-or-nothing. If any individual file fails to upload, the entire idea submission is rejected and any partially uploaded files are cleaned up. No idea or attachment data is persisted in a partial state.
- **Naming collisions**: Each file is stored with a unique identifier to prevent naming collisions. The original file name is preserved for download and display purposes.
- **Ordering**: Attachments are displayed in the order they were added by the submitter. No reordering capability is provided.
- **Thumbnail previews**: Image thumbnails on the detail page are generated from the original stored image at display time. No pre-generated thumbnail versions are required.
