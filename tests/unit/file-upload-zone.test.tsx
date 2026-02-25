import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { FileUploadZone } from "@/components/ui/file-upload-zone";

describe("FileUploadZone", () => {
  const defaultProps = {
    files: [] as File[],
    onFilesAdded: vi.fn(),
    onFileRemoved: vi.fn(),
    maxFiles: 5,
    maxTotalSize: 25 * 1024 * 1024,
    acceptedTypes: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/csv",
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders drag-and-drop area with file picker button", () => {
    render(<FileUploadZone {...defaultProps} />);

    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose files/i })).toBeInTheDocument();
  });

  it("selecting files calls onFilesAdded", () => {
    render(<FileUploadZone {...defaultProps} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["content"], "doc.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(defaultProps.onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it("displays attached files in a list", () => {
    const files = [
      new File(["a"], "doc.pdf", { type: "application/pdf" }),
      new File(["bb"], "image.png", { type: "image/png" }),
    ];

    render(<FileUploadZone {...defaultProps} files={files} />);

    expect(screen.getByText("doc.pdf")).toBeInTheDocument();
    expect(screen.getByText("image.png")).toBeInTheDocument();
  });

  it("displays error when adding a 6th file (max count)", () => {
    const files = Array.from({ length: 5 }, (_, i) =>
      new File(["d"], `file${i}.pdf`, { type: "application/pdf" })
    );

    render(<FileUploadZone {...defaultProps} files={files} error="Maximum 5 files allowed" />);

    expect(screen.getByText("Maximum 5 files allowed")).toBeInTheDocument();
  });

  it("displays inline error for invalid files", () => {
    render(
      <FileUploadZone {...defaultProps} error="File must not exceed 10 MB" />
    );

    expect(screen.getByText("File must not exceed 10 MB")).toBeInTheDocument();
  });

  it("remove button calls onFileRemoved with index", () => {
    const files = [
      new File(["a"], "doc.pdf", { type: "application/pdf" }),
      new File(["b"], "image.png", { type: "image/png" }),
    ];

    render(<FileUploadZone {...defaultProps} files={files} />);

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[1]);

    expect(defaultProps.onFileRemoved).toHaveBeenCalledWith(1);
  });

  it("displays running total of file sizes", () => {
    const files = [
      new File([new Uint8Array(1024 * 1024)], "1mb.pdf", { type: "application/pdf" }),
      new File([new Uint8Array(2 * 1024 * 1024)], "2mb.png", { type: "image/png" }),
    ];

    render(<FileUploadZone {...defaultProps} files={files} />);

    // Should show current total / max (e.g., "3 MB / 25 MB")
    expect(screen.getByText(/3.*MB/i)).toBeInTheDocument();
  });

  it("handles drag-and-drop events to add files", () => {
    render(<FileUploadZone {...defaultProps} />);

    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(["content"], "dropped.pdf", { type: "application/pdf" });

    fireEvent.dragOver(dropZone, { dataTransfer: { files: [file] } });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(defaultProps.onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it("shows file type label for each file", () => {
    const files = [
      new File(["a"], "doc.pdf", { type: "application/pdf" }),
    ];

    render(<FileUploadZone {...defaultProps} files={files} />);

    expect(screen.getByText("PDF")).toBeInTheDocument();
  });
});
