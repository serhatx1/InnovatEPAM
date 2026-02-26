import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DraftEditPage from "@/app/ideas/drafts/[id]/page";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockDraft = {
  id: "draft-1",
  title: "Test Draft",
  description: "Long enough description for testing purposes here.",
  category: "Process Improvement",
  category_fields: {},
  status: "draft",
  attachments: [],
};

describe("DraftEditPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads draft data and pre-populates form", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockDraft,
    } as Response);

    render(<DraftEditPage params={Promise.resolve({ id: "draft-1" })} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Draft")).toBeInTheDocument();
    });
  });

  it("redirects to /ideas on 404", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);

    render(<DraftEditPage params={Promise.resolve({ id: "nonexistent" })} />);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/ideas");
    });
  });

  it("redirects submitted idea to detail view", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...mockDraft, status: "submitted" }),
    } as Response);

    render(<DraftEditPage params={Promise.resolve({ id: "draft-1" })} />);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/ideas/draft-1");
    });
  });

  it("redirects to login on 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    } as Response);

    render(<DraftEditPage params={Promise.resolve({ id: "draft-1" })} />);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/auth/login");
    });
  });

  it("shows loading state initially", () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as typeof global.fetch; // Never resolves

    render(<DraftEditPage params={Promise.resolve({ id: "draft-1" })} />);
    expect(screen.getByText("Loading draft...")).toBeInTheDocument();
  });

  it('shows "Delete Draft" button', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockDraft,
    } as Response);

    render(<DraftEditPage params={Promise.resolve({ id: "draft-1" })} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete Draft/i })).toBeInTheDocument();
    });
  });
});
