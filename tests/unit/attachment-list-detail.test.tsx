import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttachmentListDetail } from "@/components/ui/attachment-list-detail";

const imageAttachment = {
  id: "att-1",
  idea_id: "idea-1",
  original_file_name: "photo.png",
  file_size: 204800,
  mime_type: "image/png",
  storage_path: "user-1/1-photo.png",
  upload_order: 1,
  download_url: "https://storage.example.com/signed/photo.png",
};

const pdfAttachment = {
  id: "att-2",
  idea_id: "idea-1",
  original_file_name: "report.pdf",
  file_size: 1048576,
  mime_type: "application/pdf",
  storage_path: "user-1/2-report.pdf",
  upload_order: 2,
  download_url: "https://storage.example.com/signed/report.pdf",
};

const legacyAttachment = {
  id: null,
  idea_id: "idea-1",
  original_file_name: "old-doc.pdf",
  file_size: null,
  mime_type: null,
  storage_path: "user-1/old-doc.pdf",
  upload_order: 1,
  download_url: "https://storage.example.com/signed/old-doc.pdf",
};

describe("AttachmentListDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders list with name, type badge, size, and download link", () => {
    render(<AttachmentListDetail attachments={[pdfAttachment]} />);

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText(/1.*MB/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download/i })).toHaveAttribute(
      "href",
      pdfAttachment.download_url
    );
  });

  it("image attachments show thumbnail preview", () => {
    render(<AttachmentListDetail attachments={[imageAttachment]} />);

    const thumb = screen.getByRole("img", { name: /photo\.png/i });
    expect(thumb).toBeInTheDocument();
    expect(thumb).toHaveAttribute("src", imageAttachment.download_url);
    expect(thumb).toHaveStyle({ maxWidth: "120px" });
  });

  it("clicking image thumbnail opens lightbox", () => {
    render(<AttachmentListDetail attachments={[imageAttachment]} />);

    const thumb = screen.getByRole("img", { name: /photo\.png/i });
    fireEvent.click(thumb);

    // Lightbox dialog should appear
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // The lightbox contains an img (could be same or different element)
    const dialogEl = screen.getByRole("dialog");
    const lightboxImg = dialogEl.querySelector("img");
    expect(lightboxImg).toBeTruthy();
    expect(lightboxImg!.getAttribute("src")).toBe(imageAttachment.download_url);
  });

  it("non-image attachments show file type badge (no thumbnail)", () => {
    render(<AttachmentListDetail attachments={[pdfAttachment]} />);

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("download link opens in new tab with original name", () => {
    render(<AttachmentListDetail attachments={[pdfAttachment]} />);

    const link = screen.getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute("href", pdfAttachment.download_url);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("legacy single attachment renders in same list format", () => {
    render(<AttachmentListDetail attachments={[legacyAttachment]} />);

    expect(screen.getByText("old-doc.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download/i })).toHaveAttribute(
      "href",
      legacyAttachment.download_url
    );
  });

  it("attachments ordered by upload sequence", () => {
    const attachments = [
      { ...pdfAttachment, upload_order: 2 },
      { ...imageAttachment, upload_order: 1 },
    ];

    render(<AttachmentListDetail attachments={attachments} />);

    const names = screen.getAllByTestId("attachment-name");
    expect(names[0]).toHaveTextContent("photo.png"); // order 1
    expect(names[1]).toHaveTextContent("report.pdf"); // order 2
  });

  it("renders empty state when no attachments", () => {
    render(<AttachmentListDetail attachments={[]} />);

    expect(screen.getByText(/no attachments/i)).toBeInTheDocument();
  });
});
