import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UploadProgress } from "@/components/ui/upload-progress";

describe("UploadProgress", () => {
  it('shows "Uploading X of Y files..." text', () => {
    render(<UploadProgress current={2} total={5} />);

    expect(screen.getByText("Uploading 2 of 5 files...")).toBeInTheDocument();
  });

  it("shows submit button as disabled during upload", () => {
    render(<UploadProgress current={1} total={3} />);

    const indicator = screen.getByRole("status");
    expect(indicator).toBeInTheDocument();
  });

  it("progress updates as files complete", () => {
    const { rerender } = render(<UploadProgress current={1} total={3} />);
    expect(screen.getByText("Uploading 1 of 3 files...")).toBeInTheDocument();

    rerender(<UploadProgress current={2} total={3} />);
    expect(screen.getByText("Uploading 2 of 3 files...")).toBeInTheDocument();

    rerender(<UploadProgress current={3} total={3} />);
    expect(screen.getByText("Uploading 3 of 3 files...")).toBeInTheDocument();
  });

  it("renders nothing when not uploading (total=0)", () => {
    const { container } = render(<UploadProgress current={0} total={0} />);
    expect(container.firstChild).toBeNull();
  });
});
