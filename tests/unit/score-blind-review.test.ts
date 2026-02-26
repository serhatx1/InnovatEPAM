import { describe, it, expect } from "vitest";
import { anonymizeScoreEntry } from "@/lib/review/score-anonymize";
import type { IdeaScore } from "@/types";

function makeScore(overrides: Partial<IdeaScore> = {}): IdeaScore {
  return {
    id: "score-1",
    idea_id: "idea-1",
    evaluator_id: "eval-1",
    score: 4,
    comment: "Good idea",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("anonymizeScoreEntry", () => {
  it("returns score unchanged when mask is false", () => {
    const score = makeScore();
    const result = anonymizeScoreEntry(score, false);

    expect(result.evaluator_id).toBe("eval-1");
    expect(result.evaluatorDisplayName).toBeUndefined();
    expect(result.score).toBe(4);
    expect(result.comment).toBe("Good idea");
  });

  it("masks evaluator_id and sets display name when mask is true", () => {
    const score = makeScore({ evaluator_id: "real-eval" });
    const result = anonymizeScoreEntry(score, true);

    expect(result.evaluator_id).toBe("anonymous");
    expect(result.evaluatorDisplayName).toBe("Anonymous Evaluator");
  });

  it("preserves score value and comment when masking", () => {
    const score = makeScore({ score: 5, comment: "Excellent" });
    const result = anonymizeScoreEntry(score, true);

    expect(result.score).toBe(5);
    expect(result.comment).toBe("Excellent");
  });

  it("preserves id and timestamps when masking", () => {
    const score = makeScore();
    const result = anonymizeScoreEntry(score, true);

    expect(result.id).toBe("score-1");
    expect(result.idea_id).toBe("idea-1");
    expect(result.created_at).toBe("2026-01-01T00:00:00Z");
    expect(result.updated_at).toBe("2026-01-01T00:00:00Z");
  });

  it("handles null comment", () => {
    const score = makeScore({ comment: null });
    const result = anonymizeScoreEntry(score, true);

    expect(result.comment).toBeNull();
    expect(result.evaluator_id).toBe("anonymous");
  });
});
