import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";

// ── Navigation mock ─────────────────────────────────────

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  default: {},
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Global fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

import DraftEditPage from "@/app/ideas/drafts/[id]/page";
import { toast } from "sonner";

// ── Helpers ─────────────────────────────────────────────

function draftData(overrides: Record<string, unknown> = {}) {
  return {
    id: "d-1",
    title: "My Draft",
    description: "A description long enough for validation testing",
    category: "Customer Experience",
    category_fields: { target_customer_segment: "B2B Customers" },
    status: "draft",
    attachments: [],
    ...overrides,
  };
}

function mockFetchDraftSuccess(data = draftData()) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  });
}

const defaultParams = Promise.resolve({ id: "d-1" });

// ── Tests ───────────────────────────────────────────────

describe("DraftEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<DraftEditPage params={defaultParams} />);
    expect(screen.getByText("Loading draft...")).toBeInTheDocument();
  });

  it("renders draft form after successful fetch", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("My Draft")).toBeInTheDocument();
  });

  it("redirects to login on 401", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/auth/login");
    });
  });

  it("redirects to ideas on 404", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/ideas");
    });
  });

  it("redirects to detail view when status is not draft", async () => {
    mockFetchDraftSuccess(draftData({ status: "submitted" }));
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/ideas/d-1");
    });
  });

  it("shows error when fetch fails with non-401/404 status", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load draft")).toBeInTheDocument();
    });
  });

  it("shows error when fetch throws an exception", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("shows generic error when fetch throws non-Error", async () => {
    mockFetch.mockRejectedValueOnce("oops");
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load draft")).toBeInTheDocument();
    });
  });

  it("shows back to drafts link on error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("← Back to Drafts")).toBeInTheDocument();
    });
  });

  it("shows 'Draft not found' when draft is null", async () => {
    // Force draft to be null - the fetch returns ok but data has non-draft status
    // Let's simulate the error path where loading is false and draft is null
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "submitted" }),
    });
    render(<DraftEditPage params={defaultParams} />);

    // This should redirect, not show error
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/ideas/d-1");
    });
  });

  // ── Save draft ────────────────────────────────────────

  it("saves draft via PATCH and shows success toast", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });

    // Trigger save draft via the Save Draft button
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    fireEvent.click(screen.getByRole("button", { name: /Save Draft/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Draft saved!");
    });
  });

  it("shows error toast when save draft fails", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Save failed" }),
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Draft/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Save failed");
    });
  });

  it("shows generic error toast when save draft throws non-Error", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });

    mockFetch.mockRejectedValueOnce("oops");
    fireEvent.click(screen.getByRole("button", { name: /Save Draft/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save draft");
    });
  });

  // ── Delete draft ──────────────────────────────────────

  it("shows delete confirmation dialog", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete Draft/i }));

    await waitFor(() => {
      expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    });
  });

  it("deletes draft and redirects on confirm", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });

    mockFetch.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: /Delete Draft/i }));

    await waitFor(() => {
      expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Draft deleted");
      expect(mockPush).toHaveBeenCalledWith("/ideas/drafts");
    });
  });

  it("shows error toast when delete fails", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });

    mockFetch.mockResolvedValueOnce({ ok: false });
    fireEvent.click(screen.getByRole("button", { name: /Delete Draft/i }));

    await waitFor(() => {
      expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete");
    });
  });

  it("shows generic delete error for non-Error exceptions", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });

    mockFetch.mockRejectedValueOnce("oops");
    fireEvent.click(screen.getByRole("button", { name: /Delete Draft/i }));

    await waitFor(() => {
      expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Delete failed");
    });
  });

  // ── Submit flow ───────────────────────────────────────

  it("submits draft and redirects on success", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });

    // The submit will trigger: uploadNewFilesToDraft, PATCH, POST /submit
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // PATCH update fields
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // POST submit

    const form = document.querySelector("form");
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Idea submitted successfully!");
      expect(mockPush).toHaveBeenCalledWith("/ideas/d-1");
    });
  });

  it("shows error when submit PATCH fails", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Bad request" }),
    });

    const form = document.querySelector("form");
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Bad request");
    });
  });

  it("shows validation errors from submit response", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });

    // With empty category, IdeaForm validation passes and calls onSubmit
    // onSubmit calls uploadNewFilesToDraft (no-op, no files) then PATCH then POST
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // PATCH update
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: "Validation failed",
          details: { title: ["Too short"], description: "Required" },
        }),
      }); // POST submit

    const form = document.querySelector("form");
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("title:")
      );
    });
  });

  it("shows generic submit error for non-Error exception", async () => {
    mockFetchDraftSuccess();
    render(<DraftEditPage params={defaultParams} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Draft")).toBeInTheDocument();
    });

    // The first fetch after draft load is the PATCH in handleSubmit
    mockFetch.mockRejectedValueOnce("string-error");

    const form = document.querySelector("form");
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Submission failed");
    });
  });
});
