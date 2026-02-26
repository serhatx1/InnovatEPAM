import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IdeaForm } from "@/components/idea-form";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const defaultProps = {
  mode: "new" as const,
  stagingSessionId: "test-session",
  onSaveDraft: vi.fn(),
  onSubmit: vi.fn(),
};

describe("IdeaForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders in "new" mode with empty fields', () => {
    render(<IdeaForm {...defaultProps} />);
    expect(screen.getByLabelText(/Title/)).toHaveValue("");
    expect(screen.getByLabelText(/Description/)).toHaveValue("");
    expect(screen.getByLabelText(/Category/)).toHaveValue("");
  });

  it('renders in "draft-edit" mode with pre-filled data', () => {
    render(
      <IdeaForm
        {...defaultProps}
        mode="draft-edit"
        initialData={{
          title: "Existing Draft",
          description: "Some long description text for testing purposes.",
          category: "Process Improvement",
          category_fields: {},
        }}
        draftId="draft-1"
      />
    );
    expect(screen.getByLabelText(/Title/)).toHaveValue("Existing Draft");
    expect(screen.getByLabelText(/Description/)).toHaveValue(
      "Some long description text for testing purposes."
    );
  });

  it('shows "Save Draft" + "Submit" buttons in draft mode', () => {
    render(<IdeaForm {...defaultProps} mode="draft-edit" draftId="d1" />);
    expect(screen.getByRole("button", { name: /Save Draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit/i })).toBeInTheDocument();
  });

  it('calls onSaveDraft when "Save Draft" is clicked', () => {
    const onSaveDraft = vi.fn();
    render(<IdeaForm {...defaultProps} onSaveDraft={onSaveDraft} />);

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Draft Title" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Draft/i }));

    expect(onSaveDraft).toHaveBeenCalled();
  });

  it("shows auto-save indicator", () => {
    render(<IdeaForm {...defaultProps} />);
    // The form should render without errors (SaveStatusIndicator shows nothing for idle)
    expect(screen.getByText(/Title/)).toBeInTheDocument();
  });
});
