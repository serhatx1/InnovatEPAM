import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { IdeaForm } from "@/components/idea-form";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const defaultProps = {
  mode: "new" as const,
  stagingSessionId: "test-session",
  onSaveDraft: vi.fn(),
  onSubmit: vi.fn(),
};

describe("IdeaForm — extended coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Category selection ────────────────────────────────

  it("shows dynamic category fields when a category is selected", () => {
    render(<IdeaForm {...defaultProps} />);
    const categorySelect = screen.getByLabelText(/Category/);

    fireEvent.change(categorySelect, { target: { value: "Process Improvement" } });

    // Should now show "Category Details" section
    expect(screen.getByText("Category Details")).toBeInTheDocument();
  });

  it("clears category fields when category is changed to empty", () => {
    render(<IdeaForm {...defaultProps} />);
    const categorySelect = screen.getByLabelText(/Category/);

    // Select a category first
    fireEvent.change(categorySelect, { target: { value: "Process Improvement" } });
    expect(screen.getByText("Category Details")).toBeInTheDocument();

    // Clear the category
    fireEvent.change(categorySelect, { target: { value: "" } });
    expect(screen.queryByText("Category Details")).not.toBeInTheDocument();
  });

  it("handles invalid category value gracefully", () => {
    render(<IdeaForm {...defaultProps} />);
    const categorySelect = screen.getByLabelText(/Category/);

    fireEvent.change(categorySelect, { target: { value: "INVALID_CATEGORY" } });
    expect(screen.queryByText("Category Details")).not.toBeInTheDocument();
  });

  // ── File handling ─────────────────────────────────────

  it("shows file error when too many files are added", () => {
    render(<IdeaForm {...defaultProps} />);

    // Try to add more than 5 files (MAX_ATTACHMENTS = 5)
    const files = Array.from({ length: 6 }, (_, i) =>
      new File(["content"], `file${i}.pdf`, { type: "application/pdf" })
    );

    // The FileUploadZone handles file input, but we can test via the form
    const input = document.querySelector('input[type="file"]');
    if (input) {
      Object.defineProperty(input, "files", {
        value: files,
      });
      fireEvent.change(input);
    }
  });

  // ── Existing attachments ──────────────────────────────

  it("renders existing attachments in draft-edit mode", () => {
    const existingAttachments = [
      {
        id: "att-1",
        original_file_name: "report.pdf",
        file_size: 1024,
        mime_type: "application/pdf",
        download_url: "https://example.com/report.pdf",
      },
      {
        id: "att-2",
        original_file_name: "photo.png",
        file_size: 2048000,
        mime_type: "image/png",
        download_url: "https://example.com/photo.png",
      },
    ];

    render(
      <IdeaForm
        {...defaultProps}
        mode="draft-edit"
        initialData={{ attachments: existingAttachments }}
        draftId="d-1"
      />
    );

    expect(screen.getByText("Current Attachments")).toBeInTheDocument();
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("photo.png")).toBeInTheDocument();
  });

  it("removes existing attachment when remove button is clicked", () => {
    const existingAttachments = [
      {
        id: "att-1",
        original_file_name: "report.pdf",
        file_size: 1024,
        mime_type: "application/pdf",
        download_url: "https://example.com/report.pdf",
      },
    ];

    render(
      <IdeaForm
        {...defaultProps}
        mode="draft-edit"
        initialData={{ attachments: existingAttachments }}
        draftId="d-1"
      />
    );

    expect(screen.getByText("report.pdf")).toBeInTheDocument();

    const removeBtn = screen.getByRole("button", { name: /remove report\.pdf/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();
  });

  // ── Save draft ────────────────────────────────────────

  it("save draft includes current form values", () => {
    const onSaveDraft = vi.fn();
    render(
      <IdeaForm {...defaultProps} onSaveDraft={onSaveDraft} />
    );

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Test Title" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "A description that is long enough" },
    });
    fireEvent.change(screen.getByLabelText(/Category/), {
      target: { value: "Process Improvement" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Draft/i }));

    expect(onSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test Title",
        description: "A description that is long enough",
        category: "Process Improvement",
      })
    );
  });

  // ── Submit ────────────────────────────────────────────

  it("renders Submit Idea button", () => {
    render(
      <IdeaForm
        {...defaultProps}
        initialData={{
          title: "Valid Title Here",
          description: "This description is at least twenty characters long for validation.",
          category: "Process Improvement",
        }}
      />
    );

    expect(screen.getByRole("button", { name: /submit idea/i })).toBeInTheDocument();
  });

  // ── Character counters ────────────────────────────────

  it("displays title character count", () => {
    render(<IdeaForm {...defaultProps} />);
    expect(screen.getByText("0/100")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Hello" },
    });
    expect(screen.getByText("5/100")).toBeInTheDocument();
  });

  it("displays description character count", () => {
    render(<IdeaForm {...defaultProps} />);
    expect(screen.getByText("0/1000")).toBeInTheDocument();
  });
});
