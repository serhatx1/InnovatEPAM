import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server client module before importing storage functions
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { uploadIdeaAttachment, getAttachmentUrl } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/server";

const mockCreateClient = vi.mocked(createClient);

describe("uploadIdeaAttachment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructs correct storage path and returns it", async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ upload: mockUpload });

    mockCreateClient.mockResolvedValue({
      storage: { from: mockFrom },
    } as any);

    const file = new File(["content"], "test-doc.pdf", { type: "application/pdf" });
    const result = await uploadIdeaAttachment(file, "user-123");

    expect(mockFrom).toHaveBeenCalledWith("idea-attachments");
    expect(result).toMatch(/^user-123\/\d+-test-doc\.pdf$/);
  });

  it("throws on upload error", async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      error: { message: "Bucket not found" },
    });
    const mockFrom = vi.fn().mockReturnValue({ upload: mockUpload });

    mockCreateClient.mockResolvedValue({
      storage: { from: mockFrom },
    } as any);

    const file = new File(["content"], "test.pdf", { type: "application/pdf" });

    await expect(uploadIdeaAttachment(file, "user-1")).rejects.toThrow("File upload failed");
  });

  it("sanitizes filename with special characters", async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ upload: mockUpload });

    mockCreateClient.mockResolvedValue({
      storage: { from: mockFrom },
    } as any);

    const file = new File(["content"], "my file (1).pdf", { type: "application/pdf" });
    const result = await uploadIdeaAttachment(file, "user-1");

    // Spaces and parens should be replaced with underscores
    expect(result).toMatch(/my_file__1_\.pdf$/);
  });
});

describe("getAttachmentUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns signed URL for valid path", async () => {
    const mockCreateSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://example.com/signed-url" },
      error: null,
    });
    const mockFrom = vi.fn().mockReturnValue({ createSignedUrl: mockCreateSignedUrl });

    mockCreateClient.mockResolvedValue({
      storage: { from: mockFrom },
    } as any);

    const url = await getAttachmentUrl("user-1/123-doc.pdf");

    expect(mockFrom).toHaveBeenCalledWith("idea-attachments");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("user-1/123-doc.pdf", 3600);
    expect(url).toBe("https://example.com/signed-url");
  });

  it("returns null for empty path", async () => {
    const url = await getAttachmentUrl("");
    expect(url).toBeNull();
  });

  it("returns null on error", async () => {
    const mockCreateSignedUrl = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });
    const mockFrom = vi.fn().mockReturnValue({ createSignedUrl: mockCreateSignedUrl });

    mockCreateClient.mockResolvedValue({
      storage: { from: mockFrom },
    } as any);

    const url = await getAttachmentUrl("bad-path");
    expect(url).toBeNull();
  });
});
