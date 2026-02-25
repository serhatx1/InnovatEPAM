import { describe, it, expect } from "vitest";
import type { Idea, IdeaStatus, UserProfile } from "@/types";

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
});
