import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Additional tests for /api/drafts/[id] route to cover
 * PATCH 403/400/500, DELETE 403/500, and staging file handling.
 */

const mockGetUser = vi.fn();
const mockGetDraftById = vi.fn();
const mockUpdateDraft = vi.fn();
const mockSoftDeleteDraft = vi.fn();
const mockGetAttachmentsByIdeaId = vi.fn();
const mockGetAttachmentDownloadUrl = vi.fn();
const mockMoveStagedFiles = vi.fn();
const mockCreateAttachments = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  getDraftById: (...args: unknown[]) => mockGetDraftById(...args),
  updateDraft: (...args: unknown[]) => mockUpdateDraft(...args),
  softDeleteDraft: (...args: unknown[]) => mockSoftDeleteDraft(...args),
  getAttachmentsByIdeaId: (...args: unknown[]) => mockGetAttachmentsByIdeaId(...args),
  createAttachments: (...args: unknown[]) => mockCreateAttachments(...args),
}));

vi.mock("@/lib/supabase/storage", () => ({
  getAttachmentDownloadUrl: (...args: unknown[]) => mockGetAttachmentDownloadUrl(...args),
  moveStagedFiles: (...args: unknown[]) => mockMoveStagedFiles(...args),
}));

function authedUser(id = "user-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function makeRequest(body?: Record<string, unknown>): any {
  if (body === undefined) {
    return { json: async () => { throw new Error("no body"); } };
  }
  return { json: async () => body };
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const baseDraft = {
  id: "draft-1",
  user_id: "user-1",
  title: "Test Draft",
  description: "Draft description",
  category: "Process Improvement",
  category_fields: {},
  status: "draft",
  attachment_url: null,
  evaluator_comment: null,
  deleted_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("PATCH /api/drafts/[id] — extra coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when idea is not a draft (submitted status)", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({
      data: { ...baseDraft, status: "submitted" },
      error: null,
    });

    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const response = await PATCH(makeRequest({ title: "New" }), makeParams("draft-1"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("Only drafts");
  });

  it("returns 500 when updateDraft fails", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    mockUpdateDraft.mockResolvedValue({ data: null, error: "DB failure" });

    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const response = await PATCH(makeRequest({ title: "New" }), makeParams("draft-1"));

    expect(response.status).toBe(500);
  });

  it("handles empty body gracefully", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    mockUpdateDraft.mockResolvedValue({ data: baseDraft, error: null });

    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const response = await PATCH(makeRequest(), makeParams("draft-1"));

    expect(response.status).toBe(200);
  });

  it("handles staging files during update", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    mockUpdateDraft.mockResolvedValue({ data: baseDraft, error: null });
    mockMoveStagedFiles.mockResolvedValue(["user-1/draft-1/report.pdf"]);
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockCreateAttachments.mockResolvedValue({ data: [{}], error: null });

    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const response = await PATCH(
      makeRequest({
        title: "Updated",
        stagingSessionId: "session-1",
        stagingFiles: [
          {
            storagePath: "staging/session-1/report.pdf",
            originalFileName: "report.pdf",
            fileSize: 5000,
            mimeType: "application/pdf",
          },
        ],
      }),
      makeParams("draft-1")
    );

    expect(response.status).toBe(200);
    expect(mockMoveStagedFiles).toHaveBeenCalledWith("session-1", "draft-1");
    expect(mockCreateAttachments).toHaveBeenCalled();
  });

  it("handles staging file move failure gracefully", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    mockUpdateDraft.mockResolvedValue({ data: baseDraft, error: null });
    mockMoveStagedFiles.mockRejectedValue(new Error("storage error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const response = await PATCH(
      makeRequest({
        title: "Updated",
        stagingSessionId: "session-1",
        stagingFiles: [
          {
            storagePath: "staging/session-1/file.pdf",
            originalFileName: "file.pdf",
            fileSize: 1000,
            mimeType: "application/pdf",
          },
        ],
      }),
      makeParams("draft-1")
    );

    expect(response.status).toBe(200); // Still succeeds despite staging failure
    consoleSpy.mockRestore();
  });
});

describe("DELETE /api/drafts/[id] — extra coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when idea is not a draft (submitted status)", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({
      data: { ...baseDraft, status: "submitted" },
      error: null,
    });

    const { DELETE } = await import("@/app/api/drafts/[id]/route");
    const response = await DELETE(makeRequest({}), makeParams("draft-1"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("Only drafts");
  });

  it("returns 500 when softDeleteDraft fails", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    mockSoftDeleteDraft.mockResolvedValue({ error: "Delete failed" });

    const { DELETE } = await import("@/app/api/drafts/[id]/route");
    const response = await DELETE(makeRequest({}), makeParams("draft-1"));

    expect(response.status).toBe(500);
  });
});

describe("GET /api/drafts/[id] — extra coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when getDraftById returns error", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: null, error: "Not found" });

    const { GET } = await import("@/app/api/drafts/[id]/route");
    const response = await GET(makeRequest({}), makeParams("bad"));

    expect(response.status).toBe(404);
  });

  it("returns draft with empty attachments when none exist", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });

    const { GET } = await import("@/app/api/drafts/[id]/route");
    const response = await GET(makeRequest({}), makeParams("draft-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.attachments).toEqual([]);
  });
});
