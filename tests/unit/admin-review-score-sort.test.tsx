import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScoreSortToggle from "@/components/score-sort-toggle";

// ── Mock next/navigation ────────────────────────────────

const mockPush = vi.fn();
const mockSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => {
    const params = mockSearchParams();
    return {
      get: (key: string) => params.get(key),
      toString: () => params.toString(),
    };
  },
}));

function setSearchParams(obj: Record<string, string> = {}) {
  const params = new URLSearchParams(obj);
  mockSearchParams.mockReturnValue(params);
}

// ── Tests ───────────────────────────────────────────────

describe("ScoreSortToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSearchParams();
  });

  it("renders 'Sort by Score' when not active", () => {
    render(<ScoreSortToggle />);
    expect(screen.getByTestId("score-sort-toggle")).toHaveTextContent("Sort by Score");
  });

  it("navigates with sortBy=avgScore&sortDir=desc on first click", () => {
    render(<ScoreSortToggle />);
    fireEvent.click(screen.getByTestId("score-sort-toggle"));
    expect(mockPush).toHaveBeenCalledWith("?sortBy=avgScore&sortDir=desc");
  });

  it("shows 'Score ↓' when sorting desc", () => {
    setSearchParams({ sortBy: "avgScore", sortDir: "desc" });
    render(<ScoreSortToggle />);
    expect(screen.getByTestId("score-sort-toggle")).toHaveTextContent("Score ↓");
  });

  it("switches to asc when clicking while desc", () => {
    setSearchParams({ sortBy: "avgScore", sortDir: "desc" });
    render(<ScoreSortToggle />);
    fireEvent.click(screen.getByTestId("score-sort-toggle"));
    expect(mockPush).toHaveBeenCalledWith("?sortBy=avgScore&sortDir=asc");
  });

  it("shows 'Score ↑' when sorting asc", () => {
    setSearchParams({ sortBy: "avgScore", sortDir: "asc" });
    render(<ScoreSortToggle />);
    expect(screen.getByTestId("score-sort-toggle")).toHaveTextContent("Score ↑");
  });

  it("removes sort when clicking while asc", () => {
    setSearchParams({ sortBy: "avgScore", sortDir: "asc" });
    render(<ScoreSortToggle />);
    fireEvent.click(screen.getByTestId("score-sort-toggle"));
    expect(mockPush).toHaveBeenCalledWith("?");
  });
});
