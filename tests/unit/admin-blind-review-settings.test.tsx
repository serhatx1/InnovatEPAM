import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import BlindReviewToggle from "@/app/admin/review/settings/BlindReviewToggle";

// ── Mocks ───────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockGetSetting(enabled: boolean, updatedBy: string | null = "admin-1", updatedAt: string | null = "2026-01-01T00:00:00Z") {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ enabled, updatedBy, updatedAt }),
  });
}

function mockPutSetting(enabled: boolean) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      enabled,
      updatedBy: "admin-1",
      updatedAt: new Date().toISOString(),
    }),
  });
}

// ── Tests ───────────────────────────────────────────────

describe("BlindReviewToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<BlindReviewToggle />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("displays current setting after load (disabled)", async () => {
    mockGetSetting(false);
    render(<BlindReviewToggle />);

    await waitFor(() => {
      expect(screen.getByText("INACTIVE")).toBeInTheDocument();
    });
  });

  it("displays current setting after load (enabled)", async () => {
    mockGetSetting(true);
    render(<BlindReviewToggle />);

    await waitFor(() => {
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    });
  });

  it("shows error on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Forbidden" }),
    });
    render(<BlindReviewToggle />);

    await waitFor(() => {
      expect(screen.getByText("Forbidden")).toBeInTheDocument();
    });
  });

  it("toggles setting when switch is clicked", async () => {
    mockGetSetting(false);
    render(<BlindReviewToggle />);

    await waitFor(() => {
      expect(screen.getByText("INACTIVE")).toBeInTheDocument();
    });

    mockPutSetting(true);
    // Click the "Enable Blind Review" button
    const enableBtn = screen.getByRole("button", { name: /enable blind review/i });
    fireEvent.click(enableBtn);

    await waitFor(() => {
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    });

    // Verify PUT was called with enabled: true
    const putCall = mockFetch.mock.calls.find(
      (call) => call[1]?.method === "PUT"
    );
    expect(putCall).toBeDefined();
    const putBody = JSON.parse(putCall![1].body);
    expect(putBody.enabled).toBe(true);
  });

  it("shows last updated timestamp", async () => {
    mockGetSetting(true, "admin-1", "2026-02-26T10:00:00Z");
    render(<BlindReviewToggle />);

    await waitFor(() => {
      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });
  });
});
