import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorkflowConfigPage from "@/app/admin/review/workflow/page";

// ── Mocks ───────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

const sampleWorkflow = {
  id: "wf-1",
  version: 1,
  is_active: true,
  activated_at: "2026-01-01T00:00:00Z",
  stages: [
    { id: "s-1", name: "Screening", position: 1, is_enabled: true },
    { id: "s-2", name: "Technical", position: 2, is_enabled: true },
    { id: "s-3", name: "Final", position: 3, is_enabled: true },
  ],
};

// ── Tests ───────────────────────────────────────────────

describe("WorkflowConfigPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<WorkflowConfigPage />);

    expect(screen.getByText("Loading workflow configuration...")).toBeInTheDocument();
  });

  it("renders form when no active workflow exists (404)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "No active workflow" }),
    });

    render(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText("Configure Stages")).toBeInTheDocument();
    });

    // Should show 3 empty stage inputs by default
    expect(screen.getByLabelText("Stage 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Stage 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Stage 3")).toBeInTheDocument();
  });

  it("renders existing workflow when loaded", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleWorkflow,
    });

    render(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText("Active Workflow")).toBeInTheDocument();
    });

    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("1. Screening")).toBeInTheDocument();
    expect(screen.getByText("Create New Version")).toBeInTheDocument();
  });

  it("allows adding stages up to max", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "No active workflow" }),
    });

    render(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText("Configure Stages")).toBeInTheDocument();
    });

    // Start with 3 stages, add up to 7
    const addButton = screen.getByText("+ Add Stage");
    fireEvent.click(addButton); // 4
    fireEvent.click(addButton); // 5
    fireEvent.click(addButton); // 6
    fireEvent.click(addButton); // 7

    expect(screen.getByLabelText("Stage 7")).toBeInTheDocument();

    // Add button should be disabled at 7
    expect(addButton).toBeDisabled();
  });

  it("removes stage button is disabled at minimum stages", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "No active workflow" }),
    });

    render(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText("Configure Stages")).toBeInTheDocument();
    });

    // With 3 stages (min), remove buttons should be disabled
    const removeButtons = screen.getAllByRole("button", { name: /Remove stage/ });
    removeButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("shows error message on access denied", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Forbidden" }),
    });

    render(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText("Access denied")).toBeInTheDocument();
    });
  });

  it("submits workflow and shows success message", async () => {
    // First fetch (GET) returns 404
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "No active workflow" }),
    });

    render(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText("Configure Stages")).toBeInTheDocument();
    });

    // Fill in stage names
    fireEvent.change(screen.getByLabelText("Stage 1"), {
      target: { value: "Screening" },
    });
    fireEvent.change(screen.getByLabelText("Stage 2"), {
      target: { value: "Technical" },
    });
    fireEvent.change(screen.getByLabelText("Stage 3"), {
      target: { value: "Final" },
    });

    // Mock PUT response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleWorkflow, version: 1 }),
    });

    fireEvent.click(screen.getByText("Activate Workflow"));

    await waitFor(() => {
      expect(screen.getByText(/v1 activated successfully/)).toBeInTheDocument();
    });
  });
});
