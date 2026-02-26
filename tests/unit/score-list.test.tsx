import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreList, { type ScoreEntry } from "@/components/score-list";

function makeEntry(overrides: Partial<ScoreEntry> = {}): ScoreEntry {
  return {
    id: "s1",
    evaluatorId: "eval-1",
    evaluatorDisplayName: "Jane Smith",
    score: 4,
    comment: "Good idea",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ScoreList", () => {
  it("shows empty message when no scores", () => {
    render(<ScoreList scores={[]} />);
    expect(screen.getByTestId("score-list-empty")).toHaveTextContent("No individual scores to display");
  });

  it("renders score entries", () => {
    const scores = [
      makeEntry({ id: "s1", evaluatorDisplayName: "Jane" }),
      makeEntry({ id: "s2", evaluatorId: "eval-2", evaluatorDisplayName: "Bob", score: 3 }),
    ];
    render(<ScoreList scores={scores} />);

    expect(screen.getByTestId("score-list")).toBeDefined();
    expect(screen.getByText("Jane")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  it("highlights own score entry", () => {
    const scores = [
      makeEntry({ id: "s1", evaluatorId: "eval-1", evaluatorDisplayName: "Me" }),
      makeEntry({ id: "s2", evaluatorId: "eval-2", evaluatorDisplayName: "Other" }),
    ];
    render(<ScoreList scores={scores} currentUserId="eval-1" />);

    expect(screen.getByTestId("score-entry-own")).toBeDefined();
    expect(screen.getByText("(you)")).toBeDefined();
  });

  it("shows anonymous evaluator name for blind review", () => {
    const scores = [
      makeEntry({ id: "s1", evaluatorId: "anonymous", evaluatorDisplayName: "Anonymous Evaluator" }),
    ];
    render(<ScoreList scores={scores} />);
    expect(screen.getByText("Anonymous Evaluator")).toBeDefined();
  });

  it("displays score value as X/5", () => {
    const scores = [makeEntry({ score: 5 })];
    render(<ScoreList scores={scores} />);
    expect(screen.getByText("5/5")).toBeDefined();
  });

  it("displays comment when present", () => {
    const scores = [makeEntry({ comment: "Excellent work!" })];
    render(<ScoreList scores={scores} />);
    expect(screen.getByText("Excellent work!")).toBeDefined();
  });
});
