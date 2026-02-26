import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaveStatusIndicator } from "@/components/ui/save-status-indicator";

describe("SaveStatusIndicator", () => {
  it('renders nothing when status is "idle"', () => {
    const { container } = render(<SaveStatusIndicator status="idle" />);
    expect(container.textContent).toBe("");
  });

  it('renders spinner + "Saving..." when status is "saving"', () => {
    render(<SaveStatusIndicator status="saving" />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it('renders checkmark + "Saved" when status is "saved"', () => {
    render(<SaveStatusIndicator status="saved" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it('renders warning + "Save failed" when status is "error"', () => {
    render(<SaveStatusIndicator status="error" />);
    expect(screen.getByText("Save failed")).toBeInTheDocument();
  });
});
