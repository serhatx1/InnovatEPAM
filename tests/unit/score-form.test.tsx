import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ScoreForm from "@/components/score-form";

// ── Mock fetch ──────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── Tests ───────────────────────────────────────────────

describe("ScoreForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders score selector buttons 1–5", () => {
    render(<ScoreForm ideaId="idea-1" />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole("radio", { name: new RegExp(`Score ${i}`) })).toBeDefined();
    }
  });

  it("renders comment textarea", () => {
    render(<ScoreForm ideaId="idea-1" />);
    expect(screen.getByPlaceholderText("Add a comment...")).toBeDefined();
  });

  it("renders submit button as 'Submit Score' for new score", () => {
    render(<ScoreForm ideaId="idea-1" />);
    expect(screen.getByRole("button", { name: "Submit Score" })).toBeDefined();
  });

  it("renders submit button as 'Update Score' when pre-filled", () => {
    render(<ScoreForm ideaId="idea-1" existingScore={3} existingComment="Old" />);
    expect(screen.getByRole("button", { name: "Update Score" })).toBeDefined();
  });

  it("pre-fills existing score and comment", () => {
    render(<ScoreForm ideaId="idea-1" existingScore={4} existingComment="Good" />);
    const btn = screen.getByRole("radio", { name: /Score 4/ });
    expect(btn.getAttribute("aria-checked")).toBe("true");
    const textarea = screen.getByPlaceholderText("Add a comment...") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Good");
  });

  it("disables submit button when no score is selected", () => {
    render(<ScoreForm ideaId="idea-1" />);
    const submitBtn = screen.getByRole("button", { name: "Submit Score" });
    expect(submitBtn).toBeDisabled();
  });

  it("makes PUT request on submit with selected score", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "s1", score: 4 }),
    });

    render(<ScoreForm ideaId="idea-1" />);

    fireEvent.click(screen.getByRole("radio", { name: /Score 4/ }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Score" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/ideas/idea-1/score",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ score: 4, comment: null }),
        })
      );
    });
  });

  it("shows success message on successful submission", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "s1", score: 4 }),
    });

    render(<ScoreForm ideaId="idea-1" />);

    fireEvent.click(screen.getByRole("radio", { name: /Score 4/ }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Score" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Score submitted");
    });
  });

  it("shows API error message on failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Cannot score own idea" }),
    });

    render(<ScoreForm ideaId="idea-1" />);

    fireEvent.click(screen.getByRole("radio", { name: /Score 4/ }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Score" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Cannot score own idea");
    });
  });

  it("disables all inputs when disabled prop is true", () => {
    render(<ScoreForm ideaId="idea-1" disabled disabledReason="Idea is accepted" />);

    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole("radio", { name: new RegExp(`Score ${i}`) })).toBeDisabled();
    }

    const textarea = screen.getByPlaceholderText("Add a comment...");
    expect(textarea).toBeDisabled();
    expect(screen.getByText("Idea is accepted")).toBeDefined();
  });
});
