import { describe, it, expect } from "vitest";
import type {
  Idea,
  IdeaStatus,
  UserProfile,
  IdeaAttachment,
  AttachmentResponse,
  IdeaWithAttachments,
  ReviewTransitionAction,
  ReviewWorkflow,
  ReviewStage,
  IdeaStageState,
  ReviewStageEvent,
} from "@/types";

describe("type contracts", () => {
  it("IdeaStatus accepts valid statuses including draft", () => {
    const statuses: IdeaStatus[] = ["draft", "submitted", "under_review", "accepted", "rejected"];
    expect(statuses).toHaveLength(5);
  });

  it('IdeaStatus includes "draft"', () => {
    const status: IdeaStatus = "draft";
    expect(status).toBe("draft");
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
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(idea.status).toBe("submitted");
    expect(idea.attachment_url).toBeNull();
  });

  it("Idea has deleted_at field that accepts string | null", () => {
    const activeIdea: Idea = {
      id: "1", user_id: "2", title: "Active", description: "Not deleted",
      category: "Process Improvement", category_fields: {}, status: "draft",
      attachment_url: null, evaluator_comment: null, deleted_at: null,
      created_at: "2026-01-01", updated_at: "2026-01-01",
    };
    expect(activeIdea.deleted_at).toBeNull();

    const deletedIdea: Idea = {
      id: "1", user_id: "2", title: "Deleted", description: "Soft deleted",
      category: "Process Improvement", category_fields: {}, status: "draft",
      attachment_url: null, evaluator_comment: null, deleted_at: "2026-01-15T12:00:00Z",
      created_at: "2026-01-01", updated_at: "2026-01-01",
    };
    expect(deletedIdea.deleted_at).toBe("2026-01-15T12:00:00Z");
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
      deleted_at: null,
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
      evaluator_comment: null, deleted_at: null, created_at: "2026-01-01", updated_at: "2026-01-01",
    };
    expect(ideaWithUrl.attachment_url).toBe("user-id/123-file.pdf");

    const ideaWithoutUrl: Idea = {
      id: "1", user_id: "2", title: "New", description: "No legacy attachment",
      category: "Process Improvement", category_fields: {}, status: "submitted",
      attachment_url: null,
      evaluator_comment: null, deleted_at: null, created_at: "2026-01-01", updated_at: "2026-01-01",
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
      attachment_url: null, evaluator_comment: null, deleted_at: null,
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
      attachment_url: "user-uuid/old-file.pdf", evaluator_comment: null, deleted_at: null,
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

  it("ReviewTransitionAction accepts allowed action values", () => {
    const actions: ReviewTransitionAction[] = [
      "advance",
      "return",
      "hold",
      "terminal_accept",
      "terminal_reject",
    ];

    expect(actions).toHaveLength(5);
  });

  it("ReviewWorkflow object shape matches data model", () => {
    const workflow: ReviewWorkflow = {
      id: "550e8400-e29b-41d4-a716-446655440031",
      version: 2,
      is_active: true,
      created_by: "550e8400-e29b-41d4-a716-446655440001",
      created_at: "2026-02-26T10:00:00Z",
      activated_at: "2026-02-26T10:01:00Z",
    };

    expect(workflow.version).toBe(2);
    expect(workflow.is_active).toBe(true);
  });

  it("ReviewStage object shape matches data model", () => {
    const stage: ReviewStage = {
      id: "550e8400-e29b-41d4-a716-446655440032",
      workflow_id: "550e8400-e29b-41d4-a716-446655440031",
      name: "Technical Review",
      position: 2,
      is_enabled: true,
      created_at: "2026-02-26T10:02:00Z",
    };

    expect(stage.position).toBe(2);
    expect(stage.name).toBe("Technical Review");
  });

  it("IdeaStageState object shape matches data model", () => {
    const state: IdeaStageState = {
      idea_id: "550e8400-e29b-41d4-a716-446655440000",
      workflow_id: "550e8400-e29b-41d4-a716-446655440031",
      current_stage_id: "550e8400-e29b-41d4-a716-446655440032",
      state_version: 3,
      terminal_outcome: null,
      updated_by: "550e8400-e29b-41d4-a716-446655440010",
      updated_at: "2026-02-26T10:03:00Z",
    };

    expect(state.state_version).toBe(3);
    expect(state.terminal_outcome).toBeNull();
  });

  it("ReviewStageEvent object shape matches data model", () => {
    const event: ReviewStageEvent = {
      id: "550e8400-e29b-41d4-a716-446655440033",
      idea_id: "550e8400-e29b-41d4-a716-446655440000",
      workflow_id: "550e8400-e29b-41d4-a716-446655440031",
      from_stage_id: "550e8400-e29b-41d4-a716-446655440032",
      to_stage_id: "550e8400-e29b-41d4-a716-446655440034",
      action: "advance",
      evaluator_comment: "Passed technical checks",
      actor_id: "550e8400-e29b-41d4-a716-446655440010",
      occurred_at: "2026-02-26T10:04:00Z",
    };

    expect(event.action).toBe("advance");
    expect(event.evaluator_comment).toBe("Passed technical checks");
  });
});
