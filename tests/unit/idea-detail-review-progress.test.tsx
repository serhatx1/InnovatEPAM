import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ReviewProgressTimeline from "@/components/review-progress-timeline";

// ── Mocks ───────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

const submitterProgress = {
  ideaId: "idea-1",
  currentStage: "Technical",
  currentStageUpdatedAt: "2026-01-02T10:00:00Z",
  events: [
    { toStage: "Screening", occurredAt: "2026-01-01T10:00:00Z" },
    { toStage: "Technical", occurredAt: "2026-01-02T10:00:00Z" },
  ],
};

const fullProgress = {
  ideaId: "idea-1",
  currentStage: "Technical",
  currentStageUpdatedAt: "2026-01-02T10:00:00Z",
  terminalOutcome: null,
  stateVersion: 3,
  events: [
    {
      id: "ev-1",
      fromStage: null,
      toStage: "Screening",
      action: "advance",
      evaluatorComment: null,
      actorId: "admin-1",
      occurredAt: "2026-01-01T10:00:00Z",
    },
    {
      id: "ev-2",
      fromStage: "Screening",
      toStage: "Technical",
      action: "advance",
      evaluatorComment: "Solid work",
      actorId: "admin-1",
      occurredAt: "2026-01-02T10:00:00Z",
    },
  ],
};

// ── Tests ───────────────────────────────────────────────

describe("ReviewProgressTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<ReviewProgressTimeline ideaId="idea-1" />);
    expect(screen.getByText("Loading review progress...")).toBeInTheDocument();
  });

  it("renders nothing when API returns 404", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const { container } = render(
      <ReviewProgressTimeline ideaId="idea-1" />
    );
    await waitFor(() => {
      expect(container.textContent).not.toContain("Loading review progress...");
    });
    // Should render nothing (no timeline content)
    expect(screen.queryByText("Current Stage:")).not.toBeInTheDocument();
  });

  it("renders submitter progress (stripped events)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => submitterProgress,
    });

    render(<ReviewProgressTimeline ideaId="idea-1" />);

    await waitFor(() => {
      expect(screen.getByText("Review Timeline")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Technical").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Screening")).toBeInTheDocument();
    // Should NOT show action (submitter view has no action field)
    expect(screen.queryByText(/Action:/)).not.toBeInTheDocument();
  });

  it("renders full progress with actions and comments", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fullProgress,
    });

    render(<ReviewProgressTimeline ideaId="idea-1" />);

    await waitFor(() => {
      expect(screen.getByText("Review Timeline")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Technical").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Action: advance").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Solid work/)).toBeInTheDocument();
  });

  it("renders terminal outcome badge", async () => {
    const terminalProgress = {
      ...fullProgress,
      terminalOutcome: "accepted",
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => terminalProgress,
    });

    render(<ReviewProgressTimeline ideaId="idea-1" />);

    await waitFor(() => {
      expect(screen.getByText("accepted")).toBeInTheDocument();
    });

    expect(screen.getByText(/Review completed/)).toBeInTheDocument();
  });

  it("renders rejected terminal outcome with destructive badge", async () => {
    const rejectedProgress = {
      ...fullProgress,
      terminalOutcome: "rejected",
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => rejectedProgress,
    });

    render(<ReviewProgressTimeline ideaId="idea-1" />);

    await waitFor(() => {
      expect(screen.getByText("rejected")).toBeInTheDocument();
    });
  });

  it("renders nothing when API returns 403 (forbidden)", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });
    const { container } = render(
      <ReviewProgressTimeline ideaId="idea-1" />
    );
    await waitFor(() => {
      expect(container.textContent).not.toContain("Loading review progress...");
    });
    expect(screen.queryByText("Current Stage:")).not.toBeInTheDocument();
  });
});
