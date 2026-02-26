import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StageActions from "@/app/admin/review/StageActions";

// ── Mocks ───────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const sampleState = {
  ideaId: "idea-1",
  workflowId: "wf-1",
  currentStageId: "s-2",
  currentStageName: "Technical",
  stateVersion: 3,
  terminalOutcome: null,
  updatedAt: "2026-01-01T00:00:00Z",
  events: [
    {
      id: "ev-1",
      fromStage: null,
      toStage: "Screening",
      action: "advance",
      evaluatorComment: null,
      actorId: "u-1",
      occurredAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "ev-2",
      fromStage: "Screening",
      toStage: "Technical",
      action: "advance",
      evaluatorComment: "Looks good",
      actorId: "u-1",
      occurredAt: "2026-01-02T00:00:00Z",
    },
  ],
};

// ── Tests ───────────────────────────────────────────────

describe("StageActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<StageActions ideaId="idea-1" />);
    expect(screen.getByText("Loading stage info...")).toBeInTheDocument();
  });

  it("shows 'Not in staged review' when 404", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    render(<StageActions ideaId="idea-1" />);
    await waitFor(() => {
      expect(screen.getByText("Not in staged review")).toBeInTheDocument();
    });
  });

  it("renders current stage name, version, and action buttons", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleState,
    });

    render(<StageActions ideaId="idea-1" />);

    await waitFor(() => {
      expect(screen.getByText("Technical")).toBeInTheDocument();
    });

    expect(screen.getByText("v3")).toBeInTheDocument();

    // Action buttons
    expect(screen.getByRole("button", { name: /Advance/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Return/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hold/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Accept \(Final\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reject \(Final\)/i })).toBeInTheDocument();
  });

  it("renders event history", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleState,
    });

    render(<StageActions ideaId="idea-1" />);

    await waitFor(() => {
      expect(screen.getByText("Stage History")).toBeInTheDocument();
    });

    expect(screen.getByText(/Looks good/)).toBeInTheDocument();
  });

  it("shows terminal state without action buttons", async () => {
    const terminalState = {
      ...sampleState,
      terminalOutcome: "accepted",
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => terminalState,
    });

    render(<StageActions ideaId="idea-1" />);

    await waitFor(() => {
      expect(screen.getByText("accepted")).toBeInTheDocument();
    });

    expect(screen.getByText(/Review completed/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Advance/i })).not.toBeInTheDocument();
  });

  it("sends transition request on Advance click", async () => {
    // First call: fetchState, second: transition POST, third: re-fetch
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sampleState,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...sampleState, currentStageName: "Final", stateVersion: 4 }),
      });

    render(<StageActions ideaId="idea-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Advance/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Advance/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/review/ideas/idea-1/transition",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "advance",
            expectedStateVersion: 3,
          }),
        })
      );
    });
  });

  it("handles 409 conflict by refreshing state", async () => {
    const { toast } = await import("sonner");

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sampleState,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: "Conflict" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...sampleState, stateVersion: 4 }),
      });

    render(<StageActions ideaId="idea-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Hold/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Hold/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Conflict")
      );
    });

    // Should re-fetch after conflict
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
