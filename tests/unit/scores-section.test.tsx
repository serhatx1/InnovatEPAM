import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// ── Mocks ───────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

import ScoresSection from "@/components/scores-section";

describe("ScoresSection", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ScoresSection ideaId="i-1" currentUserId="u-1" />);
    expect(screen.getByText(/loading scores/i)).toBeInTheDocument();
  });

  it("renders score data after successful fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ideaId: "i-1",
        aggregate: { avgScore: 4.2, scoreCount: 5 },
        scores: [
          { id: "s-1", evaluatorId: "u-2", score: 4, comment: "Good", updatedAt: "2026-01-01T00:00:00Z" },
        ],
        myScore: null,
      }),
    });

    render(<ScoresSection ideaId="i-1" currentUserId="u-1" />);

    await waitFor(() => {
      expect(screen.getByText("4.2")).toBeInTheDocument();
    });
  });

  it("renders nothing when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { container } = render(
      <ScoresSection ideaId="i-1" currentUserId="u-1" />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading scores/i)).not.toBeInTheDocument();
    });

    // When data is null, the component returns null
    expect(container.textContent).toBe("");
  });

  it("handles fetch exception silently", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));

    const { container } = render(
      <ScoresSection ideaId="i-1" currentUserId="u-1" />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading scores/i)).not.toBeInTheDocument();
    });

    expect(container.textContent).toBe("");
  });
});
