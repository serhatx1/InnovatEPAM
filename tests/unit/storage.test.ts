import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock functions so vi.mock factory can reference them
const mockUpload = vi.hoisted(() => vi.fn());
const mockCreateSignedUrl = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  }),
}));

import { uploadIdeaAttachment, getAttachmentUrl } from "@/lib/supabase/storage";

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
