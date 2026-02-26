import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreAggregate from "@/components/score-aggregate";

describe("ScoreAggregate", () => {
  it("shows 'No scores yet' when scoreCount is 0", () => {
    render(<ScoreAggregate avgScore={null} scoreCount={0} />);
    expect(screen.getByTestId("score-empty")).toHaveTextContent("No scores yet");
  });

  it("displays average score and count", () => {
    render(<ScoreAggregate avgScore={3.7} scoreCount={5} />);
    const el = screen.getByTestId("score-aggregate");
    expect(el).toHaveTextContent("3.7");
    expect(el).toHaveTextContent("5 evaluators");
  });

  it("uses singular 'evaluator' for count of 1", () => {
    render(<ScoreAggregate avgScore={4.0} scoreCount={1} />);
    expect(screen.getByTestId("score-aggregate")).toHaveTextContent("1 evaluator");
  });

  it("formats avgScore to one decimal", () => {
    render(<ScoreAggregate avgScore={4} scoreCount={2} />);
    expect(screen.getByTestId("score-aggregate")).toHaveTextContent("4.0");
  });
});
