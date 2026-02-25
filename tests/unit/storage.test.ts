import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock functions so vi.mock factory can reference them
const mockUpload = vi.hoisted(() => vi.fn());
const mockCreateSignedUrl = vi.hoisted(() => vi.fn());
const mockRemove = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove,
      }),
    },
  }),
}));

import {
  uploadIdeaAttachment,
  getAttachmentUrl,
  uploadMultipleAttachments,
  deleteAttachments,
  getAttachmentDownloadUrl,
} from "@/lib/supabase/storage";

describe("uploadIdeaAttachment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructs the correct storage path", async () => {
    mockUpload.mockResolvedValue({ error: null });

    const file = new File(["test content"], "report.pdf", { type: "application/pdf" });
    const userId = "user-abc";

    const result = await uploadIdeaAttachment(file, userId);

    // Path format: userId/timestamp-safeName
    expect(result).toMatch(/^user-abc\/\d+-report\.pdf$/);
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it("sanitizes special characters in filename", async () => {
    mockUpload.mockResolvedValue({ error: null });

    const file = new File(["data"], "my file (1).pdf", { type: "application/pdf" });

    const result = await uploadIdeaAttachment(file, "user-123");

    // Spaces and parens should be replaced with _
    expect(result).toContain("my_file__1_.pdf");
  });

  it("throws on upload failure", async () => {
    mockUpload.mockResolvedValue({ error: { message: "Bucket full" } });

    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });

    await expect(uploadIdeaAttachment(file, "user-123")).rejects.toThrow(
      "File upload failed: Bucket full"
    );
  });
});

describe("getAttachmentUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a signed URL for a valid path", async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed-url" },
      error: null,
    });

    const url = await getAttachmentUrl("user-123/file.pdf");

    expect(url).toBe("https://storage.example.com/signed-url");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("user-123/file.pdf", 3600);
  });

  it("returns null for empty file path", async () => {
    const url = await getAttachmentUrl("");
    expect(url).toBeNull();
  });

  it("returns null on signed URL error", async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const url = await getAttachmentUrl("user-123/missing.pdf");

    expect(url).toBeNull();
    consoleSpy.mockRestore();
  });

  it("accepts custom expiry", async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.com/url" },
      error: null,
    });

    await getAttachmentUrl("path/file.pdf", 600);

    expect(mockCreateSignedUrl).toHaveBeenCalledWith("path/file.pdf", 600);
  });
});

describe("uploadMultipleAttachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads N files and returns N storage paths", async () => {
    mockUpload.mockResolvedValue({ error: null });

    const files = [
      new File(["a"], "doc1.pdf", { type: "application/pdf" }),
      new File(["b"], "doc2.png", { type: "image/png" }),
      new File(["c"], "doc3.csv", { type: "text/csv" }),
    ];

    const result = await uploadMultipleAttachments(files, "user-abc");
    expect(result).toHaveLength(3);
    expect(result[0]).toMatch(/^user-abc\/\d+-doc1\.pdf$/);
    expect(result[1]).toMatch(/^user-abc\/\d+-doc2\.png$/);
    expect(result[2]).toMatch(/^user-abc\/\d+-doc3\.csv$/);
    expect(mockUpload).toHaveBeenCalledTimes(3);
  });

  it("rolls back all uploaded files if any upload fails", async () => {
    // First 2 uploads succeed, 3rd fails
    mockUpload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "Quota exceeded" } });
    mockRemove.mockResolvedValue({ error: null });

    const files = [
      new File(["a"], "doc1.pdf", { type: "application/pdf" }),
      new File(["b"], "doc2.png", { type: "image/png" }),
      new File(["c"], "doc3.csv", { type: "text/csv" }),
    ];

    await expect(uploadMultipleAttachments(files, "user-abc")).rejects.toThrow(
      "File upload failed: Quota exceeded"
    );

    // Should have attempted to clean up the 2 successful uploads
    expect(mockRemove).toHaveBeenCalledTimes(1);
    const removedPaths = mockRemove.mock.calls[0][0];
    expect(removedPaths).toHaveLength(2);
  });

  it("returns empty array for empty file list", async () => {
    const result = await uploadMultipleAttachments([], "user-abc");
    expect(result).toEqual([]);
    expect(mockUpload).not.toHaveBeenCalled();
  });
});

describe("deleteAttachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes files by storage paths", async () => {
    mockRemove.mockResolvedValue({ error: null });

    const paths = ["user-abc/1-doc.pdf", "user-abc/2-img.png"];
    await deleteAttachments(paths);

    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledWith(paths);
  });

  it("does nothing for empty paths array", async () => {
    await deleteAttachments([]);
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("throws on delete error", async () => {
    mockRemove.mockResolvedValue({ error: { message: "Permission denied" } });

    await expect(
      deleteAttachments(["user-abc/file.pdf"])
    ).rejects.toThrow("Failed to delete attachments: Permission denied");
  });
});

describe("getAttachmentDownloadUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates signed URL with original file name", async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed" },
      error: null,
    });

    const url = await getAttachmentDownloadUrl(
      "user-abc/1234-sanitized_name.pdf",
      "My Report (Final).pdf"
    );

    expect(url).toBe("https://storage.example.com/signed");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      "user-abc/1234-sanitized_name.pdf",
      3600,
      { download: "My Report (Final).pdf" }
    );
  });

  it("returns null on error", async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const url = await getAttachmentDownloadUrl("path/file.pdf", "file.pdf");
    expect(url).toBeNull();
    consoleSpy.mockRestore();
  });
});
