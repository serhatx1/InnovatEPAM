import { describe, it, expect } from "vitest";
import {
  shouldAnonymize,
  anonymizeIdeaResponse,
  anonymizeIdeaList,
} from "@/lib/review/blind-review";
import type { Idea } from "@/types";

/**
 * UI-level verification that the anonymization logic correctly
 * preserves the submitter's own identity during blind review.
 * These tests validate the data-shaping functions that feed into the UI.
 */

function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: "idea-1",
    user_id: "submitter-1",
    title: "My Idea",
    description: "Description",
    category: "technology",
    category_fields: {},
    status: "under_review",
    attachment_url: null,
    evaluator_comment: null,
    deleted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Submitter self-view: listing page data", () => {
  it("submitter's own idea is NOT anonymized in list even with blind review ON", () => {
    const ideas = [
      makeIdea({ id: "own-idea", user_id: "submitter-1" }),
      makeIdea({ id: "other-idea", user_id: "other-user" }),
    ];
    const result = anonymizeIdeaList(ideas, "submitter", "submitter-1", true);

    // Own idea: identity visible
    expect(result[0].user_id).toBe("submitter-1");
    expect(result[0].submitter_display_name).toBeUndefined();

    // Other's idea: masked
    expect(result[1].user_id).toBe("anonymous");
    expect(result[1].submitter_display_name).toBe("Anonymous Submitter");
  });
});

describe("Submitter self-view: detail page data", () => {
  it("submitter's own idea detail is NOT anonymized with blind review ON", () => {
    const idea = makeIdea({ user_id: "submitter-1" });
    const mask = shouldAnonymize({
      viewerRole: "submitter",
      viewerId: "submitter-1",
      ideaUserId: "submitter-1",
      terminalOutcome: null,
      blindReviewEnabled: true,
    });
    const result = anonymizeIdeaResponse(idea, mask);

    expect(result.user_id).toBe("submitter-1");
    expect(result.submitter_display_name).toBeUndefined();
  });

  it("other user's idea detail IS anonymized for submitter with blind review ON", () => {
    const idea = makeIdea({ user_id: "other-user" });
    const mask = shouldAnonymize({
      viewerRole: "submitter",
      viewerId: "submitter-1",
      ideaUserId: "other-user",
      terminalOutcome: null,
      blindReviewEnabled: true,
    });
    const result = anonymizeIdeaResponse(idea, mask);

    expect(result.user_id).toBe("anonymous");
    expect(result.submitter_display_name).toBe("Anonymous Submitter");
  });
});
