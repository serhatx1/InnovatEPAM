import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockUpload = vi.fn();
const mockCopy = vi.fn();
const mockRemove = vi.fn();
const mockList = vi.fn();
const mockDownload = vi.fn();

const mockStorage = {
  from: vi.fn().mockReturnValue({
    upload: mockUpload,
    copy: mockCopy,
    remove: mockRemove,
    list: mockList,
    download: mockDownload,
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    storage: mockStorage,
  })),
}));

// ── Tests ───────────────────────────────────────────────

describe("staging file operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadToStaging", () => {
    it("uploads file to staging/{sessionId}/{filename} path", async () => {
      mockUpload.mockResolvedValue({ error: null });
      
      const { uploadToStaging } = await import("@/lib/supabase/storage");
      const file = new File(["test content"], "doc.pdf", { type: "application/pdf" });
      
      const result = await uploadToStaging(file, "session-123");
      
      expect(mockStorage.from).toHaveBeenCalledWith("idea-attachments");
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining("staging/session-123/"),
        file,
        expect.objectContaining({ cacheControl: "3600", upsert: false })
      );
      expect(result).toMatch(/^staging\/session-123\//);
    });
  });

  describe("moveStagedFiles", () => {
    it("moves files from staging path to permanent ideas/{ideaId}/ path", async () => {
      mockList.mockResolvedValue({
        data: [
          { name: "123-doc.pdf" },
          { name: "456-photo.png" },
        ],
        error: null,
      });
      mockCopy.mockResolvedValue({ error: null });
      mockRemove.mockResolvedValue({ error: null });

      const { moveStagedFiles } = await import("@/lib/supabase/storage");
      const result = await moveStagedFiles("session-123", "idea-456");

      expect(mockList).toHaveBeenCalledWith("staging/session-123");
      expect(mockCopy).toHaveBeenCalledTimes(2);
      expect(mockRemove).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("returns updated storage paths after move", async () => {
      mockList.mockResolvedValue({
        data: [{ name: "123-doc.pdf" }],
        error: null,
      });
      mockCopy.mockResolvedValue({ error: null });
      mockRemove.mockResolvedValue({ error: null });

      const { moveStagedFiles } = await import("@/lib/supabase/storage");
      const result = await moveStagedFiles("session-123", "idea-456");

      expect(result[0]).toMatch(/^idea-456\//);
    });
  });

  describe("cleanupStagedFiles", () => {
    it("removes all files in staging prefix for session", async () => {
      mockList.mockResolvedValue({
        data: [{ name: "123-doc.pdf" }, { name: "456-photo.png" }],
        error: null,
      });
      mockRemove.mockResolvedValue({ error: null });

      const { cleanupStagedFiles } = await import("@/lib/supabase/storage");
      await cleanupStagedFiles("session-123");

      expect(mockList).toHaveBeenCalledWith("staging/session-123");
      expect(mockRemove).toHaveBeenCalledWith([
        "staging/session-123/123-doc.pdf",
        "staging/session-123/456-photo.png",
      ]);
    });
  });

  describe("listStagedFiles", () => {
    it("lists files in staging area", async () => {
      mockList.mockResolvedValue({
        data: [
          { name: "123-doc.pdf" },
          { name: "456-photo.png" },
        ],
        error: null,
      });

      const { listStagedFiles } = await import("@/lib/supabase/storage");
      const result = await listStagedFiles("session-123");

      expect(mockList).toHaveBeenCalledWith("staging/session-123");
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ name: "123-doc.pdf" }));
    });
  });

  describe("cleanupOrphanedStagedFiles", () => {
    it("removes session folders with files older than maxAgeMs", async () => {
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48h ago
      const recentDate = new Date().toISOString();

      // First list call returns staging session folders
      mockList.mockResolvedValueOnce({
        data: [
          { name: "old-session", created_at: oldDate },
          { name: "new-session", created_at: recentDate },
        ],
        error: null,
      });
      // Second call fetches files in old session
      mockList.mockResolvedValueOnce({
        data: [{ name: "doc.pdf" }],
        error: null,
      });
      mockRemove.mockResolvedValue({ error: null });

      const { cleanupOrphanedStagedFiles } = await import("@/lib/supabase/storage");
      const result = await cleanupOrphanedStagedFiles(24 * 60 * 60 * 1000);

      expect(mockList).toHaveBeenCalledWith("staging");
      expect(mockRemove).toHaveBeenCalledWith(["staging/old-session/doc.pdf"]);
      expect(result).toEqual({ removed: 1, sessions: 1 });
    });

    it("does nothing when no staging folders exist", async () => {
      mockList.mockResolvedValue({ data: [], error: null });

      const { cleanupOrphanedStagedFiles } = await import("@/lib/supabase/storage");
      const result = await cleanupOrphanedStagedFiles();

      expect(result).toEqual({ removed: 0, sessions: 0 });
      expect(mockRemove).not.toHaveBeenCalled();
    });
  });
});
