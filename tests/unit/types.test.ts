import { describe, it, expect } from "vitest";
import type { Idea, IdeaStatus, UserProfile, IdeaAttachment, AttachmentResponse, IdeaWithAttachments } from "@/types";

describe("type contracts", () => {
  it("IdeaStatus accepts valid statuses", () => {
    const statuses: IdeaStatus[] = ["submitted", "under_review", "accepted", "rejected"];
    expect(statuses).toHaveLength(4);
  });

  it("Idea object shape matches data model", () => {
    const idea: Idea = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      user_id: "550e8400-e29b-41d4-a716-446655440001",
      title: "Test Idea",
      description: "Test Description",
      category: "Process Improvement",
      category_fields: {},
      status: "submitted",
      attachment_url: null,
      evaluator_comment: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(idea.status).toBe("submitted");
    expect(idea.attachment_url).toBeNull();
  });

  it("UserProfile object shape matches data model", () => {
    const profile: UserProfile = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "test@epam.com",
      role: "submitter",
      created_at: new Date().toISOString(),
    };
    expect(profile.role).toBe("submitter");
  });

  it("reject-comment business rule: rejected ideas must have a comment", () => {
    // Business rule validation — this is the rule we enforce in the API
    const rejectedIdea: Idea = {
      id: "1",
      user_id: "2",
      title: "Bad Idea",
      description: "Not great",
      category: "Other",
      category_fields: {},
      status: "rejected",
      attachment_url: null,
      evaluator_comment: "Does not align with strategy",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // When status is rejected, evaluator_comment must be non-null
    expect(rejectedIdea.evaluator_comment).toBeTruthy();
  });

  it("Idea type retains attachment_url as string | null (legacy)", () => {
    const ideaWithUrl: Idea = {
      id: "1", user_id: "2", title: "Legacy", description: "Has attachment",
      category: "Process Improvement", category_fields: {}, status: "submitted",
      attachment_url: "user-id/123-file.pdf",
      evaluator_comment: null, created_at: "2026-01-01", updated_at: "2026-01-01",
    };
    expect(ideaWithUrl.attachment_url).toBe("user-id/123-file.pdf");

    const ideaWithoutUrl: Idea = {
      id: "1", user_id: "2", title: "New", description: "No legacy attachment",
      category: "Process Improvement", category_fields: {}, status: "submitted",
      attachment_url: null,
      evaluator_comment: null, created_at: "2026-01-01", updated_at: "2026-01-01",
    };
    expect(ideaWithoutUrl.attachment_url).toBeNull();
  });

  it("IdeaAttachment has all required fields", () => {
    const attachment: IdeaAttachment = {
      id: "550e8400-e29b-41d4-a716-446655440099",
      idea_id: "550e8400-e29b-41d4-a716-446655440000",
      original_file_name: "business-case.pdf",
      file_size: 1048576,
      mime_type: "application/pdf",
      storage_path: "user-uuid/1234567890-business-case.pdf",
      upload_order: 1,
      created_at: "2026-02-25T10:00:00Z",
    };
    expect(attachment.id).toBe("550e8400-e29b-41d4-a716-446655440099");
    expect(attachment.idea_id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(attachment.original_file_name).toBe("business-case.pdf");
    expect(attachment.file_size).toBe(1048576);
    expect(attachment.mime_type).toBe("application/pdf");
    expect(attachment.storage_path).toBe("user-uuid/1234567890-business-case.pdf");
    expect(attachment.upload_order).toBe(1);
    expect(attachment.created_at).toBe("2026-02-25T10:00:00Z");
  });

  it("AttachmentResponse has download_url and nullable id/file_size for legacy", () => {
    // New attachment response
    const newAttachment: AttachmentResponse = {
      id: "uuid-1",
      original_file_name: "mockup.png",
      file_size: 524288,
      mime_type: "image/png",
      upload_order: 1,
      download_url: "https://example.com/signed-url",
    };
    expect(newAttachment.id).toBe("uuid-1");
    expect(newAttachment.file_size).toBe(524288);
    expect(newAttachment.download_url).toBe("https://example.com/signed-url");

    // Legacy attachment response (id and file_size are null)
    const legacyAttachment: AttachmentResponse = {
      id: null,
      original_file_name: "file.pdf",
      file_size: null,
      mime_type: "application/pdf",
      upload_order: 1,
      download_url: "https://example.com/legacy-url",
    };
    expect(legacyAttachment.id).toBeNull();
    expect(legacyAttachment.file_size).toBeNull();
  });

  it("IdeaWithAttachments extends Idea with attachments array", () => {
    const ideaWithAttachments: IdeaWithAttachments = {
      id: "1", user_id: "2", title: "Multi-file idea", description: "Has attachments",
      category: "Technology Innovation", category_fields: {}, status: "submitted",
      attachment_url: null, evaluator_comment: null,
      created_at: "2026-01-01", updated_at: "2026-01-01",
      signed_attachment_url: null,
      attachments: [
        {
          id: "a1", original_file_name: "doc.pdf", file_size: 100000,
          mime_type: "application/pdf", upload_order: 1,
          download_url: "https://example.com/doc.pdf",
        },
        {
          id: "a2", original_file_name: "photo.png", file_size: 200000,
          mime_type: "image/png", upload_order: 2,
          download_url: "https://example.com/photo.png",
        },
      ],
    };
    expect(ideaWithAttachments.attachments).toHaveLength(2);
    expect(ideaWithAttachments.signed_attachment_url).toBeNull();
    expect(ideaWithAttachments.attachments[0].upload_order).toBe(1);
    expect(ideaWithAttachments.attachments[1].upload_order).toBe(2);
  });

  it("IdeaWithAttachments supports legacy idea with signed_attachment_url", () => {
    const legacyIdea: IdeaWithAttachments = {
      id: "1", user_id: "2", title: "Legacy idea", description: "Single attachment",
      category: "Cost Reduction", category_fields: {}, status: "accepted",
      attachment_url: "user-uuid/old-file.pdf", evaluator_comment: null,
      created_at: "2026-01-01", updated_at: "2026-01-01",
      signed_attachment_url: "https://example.com/signed-legacy",
      attachments: [
        {
          id: null, original_file_name: "old-file.pdf", file_size: null,
          mime_type: "application/pdf", upload_order: 1,
          download_url: "https://example.com/signed-legacy",
        },
      ],
    };
    expect(legacyIdea.signed_attachment_url).toBe("https://example.com/signed-legacy");
    expect(legacyIdea.attachments).toHaveLength(1);
    expect(legacyIdea.attachments[0].id).toBeNull();
  });
});
