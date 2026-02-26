import { describe, it, expect } from "vitest";
import {
  shouldAnonymize,
  anonymizeIdeaResponse,
  anonymizeIdeaList,
  type AnonymizeParams,
} from "@/lib/review/blind-review";
import type { Idea } from "@/types";

// ── Fixtures ─────────────────────────────────────────────

function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: "idea-1",
    user_id: "submitter-1",
    title: "Test Idea",
    description: "A test idea",
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

// ── shouldAnonymize ─────────────────────────────────────

describe("shouldAnonymize", () => {
  const baseParams: AnonymizeParams = {
    viewerRole: "submitter", // acts as evaluator (non-admin, non-owner)
    viewerId: "viewer-1",
    ideaUserId: "submitter-1",
    terminalOutcome: null,
    blindReviewEnabled: true,
  };

  it("returns true when blind review ON + non-admin + non-owner + non-terminal", () => {
    expect(shouldAnonymize(baseParams)).toBe(true);
  });

  it("returns false when blind review is OFF", () => {
    expect(shouldAnonymize({ ...baseParams, blindReviewEnabled: false })).toBe(false);
  });

  it("returns false when viewer is admin", () => {
    expect(shouldAnonymize({ ...baseParams, viewerRole: "admin" })).toBe(false);
  });

  it("returns false when viewer is the idea owner (self-view)", () => {
    expect(
      shouldAnonymize({ ...baseParams, viewerId: "submitter-1", ideaUserId: "submitter-1" })
    ).toBe(false);
  });

  it("returns false when idea has terminal outcome (accepted)", () => {
    expect(
      shouldAnonymize({ ...baseParams, terminalOutcome: "accepted" })
    ).toBe(false);
  });

  it("returns false when idea has terminal outcome (rejected)", () => {
    expect(
      shouldAnonymize({ ...baseParams, terminalOutcome: "rejected" })
    ).toBe(false);
  });

  it("returns true when admin field is wrong case (non-admin)", () => {
    // Only exact "admin" role is exempt
    expect(shouldAnonymize({ ...baseParams, viewerRole: "Admin" })).toBe(true);
  });
});

// ── anonymizeIdeaResponse ───────────────────────────────

describe("anonymizeIdeaResponse", () => {
  it("masks user_id and adds anonymous display name when mask=true", () => {
    const idea = makeIdea();
    const result = anonymizeIdeaResponse(idea, true);

    expect(result.user_id).toBe("anonymous");
    expect(result.submitter_display_name).toBe("Anonymous Submitter");
  });

  it("preserves all fields when mask=false", () => {
    const idea = makeIdea({ user_id: "real-user" });
    const result = anonymizeIdeaResponse(idea, false);

    expect(result.user_id).toBe("real-user");
    expect(result.submitter_display_name).toBeUndefined();
  });

  it("preserves other idea fields when masking", () => {
    const idea = makeIdea({ title: "My Great Idea", category: "tech" });
    const result = anonymizeIdeaResponse(idea, true);

    expect(result.title).toBe("My Great Idea");
    expect(result.category).toBe("tech");
    expect(result.id).toBe("idea-1");
  });
});

// ── anonymizeIdeaList ───────────────────────────────────

describe("anonymizeIdeaList", () => {
  it("anonymizes all ideas for non-owner evaluator with blind review ON", () => {
    const ideas = [
      makeIdea({ id: "idea-1", user_id: "user-a" }),
      makeIdea({ id: "idea-2", user_id: "user-b" }),
    ];
    const result = anonymizeIdeaList(ideas, "submitter", "viewer-1", true);

    expect(result[0].user_id).toBe("anonymous");
    expect(result[1].user_id).toBe("anonymous");
  });

  it("does NOT anonymize for admin viewer", () => {
    const ideas = [makeIdea()];
    const result = anonymizeIdeaList(ideas, "admin", "admin-1", true);

    expect(result[0].user_id).toBe("submitter-1");
    expect(result[0].submitter_display_name).toBeUndefined();
  });

  it("reveals identity for ideas with terminal outcome", () => {
    const ideas = [
      makeIdea({ id: "idea-1", user_id: "user-a" }),
      makeIdea({ id: "idea-2", user_id: "user-b" }),
    ];
    const terminalOutcomes = new Map<string, "accepted" | "rejected" | null>([
      ["idea-1", "accepted"],
      ["idea-2", null],
    ]);
    const result = anonymizeIdeaList(ideas, "submitter", "viewer-1", true, terminalOutcomes);

    expect(result[0].user_id).toBe("user-a"); // terminal → revealed
    expect(result[1].user_id).toBe("anonymous"); // non-terminal → masked
  });

  it("preserves owner identity when viewer is idea submitter", () => {
    const ideas = [
      makeIdea({ id: "idea-1", user_id: "viewer-1" }), // viewer owns this
      makeIdea({ id: "idea-2", user_id: "someone-else" }),
    ];
    const result = anonymizeIdeaList(ideas, "submitter", "viewer-1", true);

    expect(result[0].user_id).toBe("viewer-1"); // self-view → visible
    expect(result[1].user_id).toBe("anonymous"); // not owner → masked
  });

  it("returns unmasked when blind review is OFF", () => {
    const ideas = [makeIdea()];
    const result = anonymizeIdeaList(ideas, "submitter", "viewer-1", false);

    expect(result[0].user_id).toBe("submitter-1");
  });
});

// ── Submitter self-view exemption (US3) ─────────────────

describe("shouldAnonymize — submitter self-view", () => {
  it("submitter sees own identity even with blind review ON + non-terminal", () => {
    expect(
      shouldAnonymize({
        viewerRole: "submitter",
        viewerId: "user-a",
        ideaUserId: "user-a",
        terminalOutcome: null,
        blindReviewEnabled: true,
      })
    ).toBe(false);
  });

  it("submitter sees own identity even when idea is terminal + blind review ON", () => {
    expect(
      shouldAnonymize({
        viewerRole: "submitter",
        viewerId: "user-a",
        ideaUserId: "user-a",
        terminalOutcome: "accepted",
        blindReviewEnabled: true,
      })
    ).toBe(false);
  });

  it("submitter does NOT see other user identity with blind review ON", () => {
    expect(
      shouldAnonymize({
        viewerRole: "submitter",
        viewerId: "user-a",
        ideaUserId: "user-b",
        terminalOutcome: null,
        blindReviewEnabled: true,
      })
    ).toBe(true);
  });
});

describe("anonymizeIdeaList — submitter self-view across mixed ideas", () => {
  it("submitter sees own ideas un-masked, other ideas masked", () => {
    const ideas = [
      makeIdea({ id: "own-idea", user_id: "me" }),
      makeIdea({ id: "other-idea", user_id: "someone-else" }),
      makeIdea({ id: "another-own", user_id: "me" }),
    ];
    const result = anonymizeIdeaList(ideas, "submitter", "me", true);

    expect(result[0].user_id).toBe("me");
    expect(result[0].submitter_display_name).toBeUndefined();
    expect(result[1].user_id).toBe("anonymous");
    expect(result[1].submitter_display_name).toBe("Anonymous Submitter");
    expect(result[2].user_id).toBe("me");
    expect(result[2].submitter_display_name).toBeUndefined();
  });
});
