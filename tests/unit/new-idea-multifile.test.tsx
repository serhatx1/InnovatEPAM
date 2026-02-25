import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NewIdeaPage from "@/app/ideas/new/page";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

vi.mock("@/lib/validation/category-fields", () => ({
  validateCategoryFieldsForCategory: vi.fn().mockReturnValue({
    success: true,
    data: {},
    errors: {},
  }),
}));

describe("NewIdeaPage — multi-file upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders FileUploadZone component", () => {
    render(<NewIdeaPage />);

    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose files/i })).toBeInTheDocument();
  });

  it("submitting with multiple files sends all files in FormData", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "idea-1", title: "Test" }),
    });

    render(<NewIdeaPage />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Multi-File Test Idea" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "A valid description that is at least twenty characters long for testing" },
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "Cost Reduction" },
    });

    // Add files via the hidden input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(["a"], "doc1.pdf", { type: "application/pdf" });
    const file2 = new File(["b"], "doc2.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /submit idea/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentFormData = call[1].body as FormData;
    const files = sentFormData.getAll("files");
    expect(files.length).toBe(2);
  });

  it("submitting without files succeeds (optional)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "idea-1" }),
    });

    render(<NewIdeaPage />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "No-File Test Idea" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "A valid description that is at least twenty characters long for testing" },
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "Cost Reduction" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit idea/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentFormData = call[1].body as FormData;
    const files = sentFormData.getAll("files");
    expect(files).toHaveLength(0);
  });

  it("validation errors display for invalid files", async () => {
    render(<NewIdeaPage />);

    // Add an invalid file (oversized — 11MB)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], "huge.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    // Error should be displayed inline
    await waitFor(() => {
      expect(screen.getByText(/file must not exceed 10 mb/i)).toBeInTheDocument();
    });
  });

  it("successful submission redirects to ideas list", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "idea-1" }),
    });

    render(<NewIdeaPage />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Redirect Test Idea" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "A valid description that is at least twenty characters long for testing" },
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "Cost Reduction" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit idea/i }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/ideas");
    });
  });

  it("removes a file from the list", () => {
    render(<NewIdeaPage />);

    // Add files
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(["a"], "doc1.pdf", { type: "application/pdf" });
    const file2 = new File(["b"], "doc2.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    // Both should be listed
    expect(screen.getByText("doc1.pdf")).toBeInTheDocument();
    expect(screen.getByText("doc2.png")).toBeInTheDocument();

    // Remove first file
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    expect(screen.queryByText("doc1.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("doc2.png")).toBeInTheDocument();
  });
});
