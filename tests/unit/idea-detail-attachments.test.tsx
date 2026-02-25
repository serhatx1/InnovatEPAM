import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// We test the AttachmentListDetail component integration since the detail page
// is a server component that's hard to unit test directly.
// These tests verify the component renders correctly with various attachment data.

import { AttachmentListDetail } from "@/components/ui/attachment-list-detail";

describe("Idea detail — attachment display", () => {
  it("renders AttachmentListDetail with all attachments", () => {
    const attachments = [
      {
        id: "att-1",
        idea_id: "idea-1",
        original_file_name: "report.pdf",
        file_size: 1048576,
        mime_type: "application/pdf",
        storage_path: "user-1/1-report.pdf",
        upload_order: 1,
        download_url: "https://storage.example.com/signed/report.pdf",
      },
      {
        id: "att-2",
        idea_id: "idea-1",
        original_file_name: "photo.png",
        file_size: 204800,
        mime_type: "image/png",
        storage_path: "user-1/2-photo.png",
        upload_order: 2,
        download_url: "https://storage.example.com/signed/photo.png",
      },
    ];

    render(<AttachmentListDetail attachments={attachments} />);

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /download/i })).toHaveLength(2);
  });

  it("legacy idea with single attachment_url shows attachment in list format", () => {
    const attachments = [
      {
        id: null,
        idea_id: "idea-1",
        original_file_name: "old-doc.pdf",
        file_size: null,
        mime_type: null,
        storage_path: "user-1/old-doc.pdf",
        upload_order: 1,
        download_url: "https://storage.example.com/signed/old-doc.pdf",
      },
    ];

    render(<AttachmentListDetail attachments={attachments} />);

    expect(screen.getByText("old-doc.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download/i })).toBeInTheDocument();
  });

  it("new idea with multiple attachments shows all with thumbnails/icons", () => {
    const attachments = [
      {
        id: "att-1",
        idea_id: "idea-1",
        original_file_name: "diagram.png",
        file_size: 51200,
        mime_type: "image/png",
        storage_path: "user-1/1-diagram.png",
        upload_order: 1,
        download_url: "https://storage.example.com/signed/diagram.png",
      },
      {
        id: "att-2",
        idea_id: "idea-1",
        original_file_name: "spec.pdf",
        file_size: 2097152,
        mime_type: "application/pdf",
        storage_path: "user-1/2-spec.pdf",
        upload_order: 2,
        download_url: "https://storage.example.com/signed/spec.pdf",
      },
    ];

    render(<AttachmentListDetail attachments={attachments} />);

    // Image should have thumbnail
    const thumb = screen.getByRole("img", { name: /diagram\.png/i });
    expect(thumb).toBeInTheDocument();

    // PDF should have badge, no image
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("image thumbnails are clickable (lightbox opens)", () => {
    const attachments = [
      {
        id: "att-1",
        idea_id: "idea-1",
        original_file_name: "photo.jpg",
        file_size: 102400,
        mime_type: "image/jpeg",
        storage_path: "user-1/1-photo.jpg",
        upload_order: 1,
        download_url: "https://storage.example.com/signed/photo.jpg",
      },
    ];

    render(<AttachmentListDetail attachments={attachments} />);

    // The thumbnail is inside a button — click the button wrapper
    const thumb = screen.getByRole("img", { name: /photo\.jpg/i });
    const thumbButton = thumb.closest("button")!;
    fireEvent.click(thumbButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("download links point to correct URLs for each attachment", () => {
    const attachments = [
      {
        id: "att-1",
        idea_id: "idea-1",
        original_file_name: "doc1.pdf",
        file_size: 1024,
        mime_type: "application/pdf",
        storage_path: "user-1/1-doc1.pdf",
        upload_order: 1,
        download_url: "https://storage.example.com/signed/doc1.pdf",
      },
      {
        id: "att-2",
        idea_id: "idea-1",
        original_file_name: "doc2.csv",
        file_size: 512,
        mime_type: "text/csv",
        storage_path: "user-1/2-doc2.csv",
        upload_order: 2,
        download_url: "https://storage.example.com/signed/doc2.csv",
      },
    ];

    render(<AttachmentListDetail attachments={attachments} />);

    const links = screen.getAllByRole("link", { name: /download/i });
    expect(links[0]).toHaveAttribute("href", "https://storage.example.com/signed/doc1.pdf");
    expect(links[1]).toHaveAttribute("href", "https://storage.example.com/signed/doc2.csv");
  });
});
