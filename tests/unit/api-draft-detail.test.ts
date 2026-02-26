import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetDraftById = vi.fn();
const mockUpdateDraft = vi.fn();
const mockSoftDeleteDraft = vi.fn();
const mockGetAttachmentsByIdeaId = vi.fn();
const mockGetAttachmentDownloadUrl = vi.fn();

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
}));

vi.mock("@/lib/supabase/storage", () => ({
  getAttachmentDownloadUrl: (...args: unknown[]) => mockGetAttachmentDownloadUrl(...args),
}));

// ── Helpers ─────────────────────────────────────────────

function authedUser(id = "user-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function makeRequest(body?: Record<string, unknown>): any {
  return {
    json: async () => body ?? {},
  };
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

// ── GET /api/drafts/[id] ───────────────────────────────

describe("GET /api/drafts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { GET } = await import("@/app/api/drafts/[id]/route");
    const response = await GET(makeRequest(), makeParams("draft-1"));
    expect(response.status).toBe(401);
  });

  it("returns 404 for non-existent draft", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: null, error: null });

    const { GET } = await import("@/app/api/drafts/[id]/route");
    const response = await GET(makeRequest(), makeParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("returns 404 for other user's draft", async () => {
    authedUser("user-2"); // Different user
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });

    const { GET } = await import("@/app/api/drafts/[id]/route");
    const response = await GET(makeRequest(), makeParams("draft-1"));
    expect(response.status).toBe(404);
  });

  it("returns 404 for soft-deleted draft (query layer filters)", async () => {
    authedUser();
    // getDraftById already filters deleted_at IS NULL — returns null for deleted
    mockGetDraftById.mockResolvedValue({ data: null, error: null });

    const { GET } = await import("@/app/api/drafts/[id]/route");
    const response = await GET(makeRequest(), makeParams("deleted-draft"));
    expect(response.status).toBe(404);
  });

  it("returns 404 for submitted idea (not a draft)", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: null, error: null });

    const { GET } = await import("@/app/api/drafts/[id]/route");
    const response = await GET(makeRequest(), makeParams("submitted-idea"));
    expect(response.status).toBe(404);
  });

  it("returns draft with attachments (signed URLs)", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({
      data: [
        {
          id: "att-1",
          original_file_name: "doc.pdf",
          file_size: 1000,
          mime_type: "application/pdf",
          storage_path: "user-1/doc.pdf",
          upload_order: 1,
        },
      ],
      error: null,
    });
    mockGetAttachmentDownloadUrl.mockResolvedValue("https://signed-url.com/doc.pdf");

    const { GET } = await import("@/app/api/drafts/[id]/route");
    const response = await GET(makeRequest(), makeParams("draft-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("draft-1");
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].download_url).toBe("https://signed-url.com/doc.pdf");
  });
});

// ── PATCH /api/drafts/[id] ─────────────────────────────

describe("PATCH /api/drafts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const response = await PATCH(makeRequest(), makeParams("draft-1"));
    expect(response.status).toBe(401);
  });

  it("returns 404 for other user's draft", async () => {
    authedUser("user-2");
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });

    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const response = await PATCH(
      makeRequest({ title: "Updated" }),
      makeParams("draft-1")
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 for non-existent draft", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: null, error: null });

    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const response = await PATCH(
      makeRequest({ title: "Updated" }),
      makeParams("nonexistent")
    );
    expect(response.status).toBe(404);
  });

  it("returns 200 with updated draft for partial fields", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    const updated = { ...baseDraft, title: "Updated Title", updated_at: "2026-02-01T00:00:00Z" };
    mockUpdateDraft.mockResolvedValue({ data: updated, error: null });

    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const response = await PATCH(
      makeRequest({ title: "Updated Title" }),
      makeParams("draft-1")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.title).toBe("Updated Title");
  });

  it("updates updated_at timestamp", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    const updated = { ...baseDraft, updated_at: "2026-02-26T12:00:00Z" };
    mockUpdateDraft.mockResolvedValue({ data: updated, error: null });

    const { PATCH } = await import("@/app/api/drafts/[id]/route");
    const response = await PATCH(
      makeRequest({ title: "New Title" }),
      makeParams("draft-1")
    );
    const body = await response.json();

    expect(body.updated_at).toBe("2026-02-26T12:00:00Z");
  });
});

// ── DELETE /api/drafts/[id] ────────────────────────────

describe("DELETE /api/drafts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { DELETE } = await import("@/app/api/drafts/[id]/route");
    const response = await DELETE(makeRequest(), makeParams("draft-1"));
    expect(response.status).toBe(401);
  });

  it("returns 404 for other user's draft", async () => {
    authedUser("user-2");
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });

    const { DELETE } = await import("@/app/api/drafts/[id]/route");
    const response = await DELETE(makeRequest(), makeParams("draft-1"));
    expect(response.status).toBe(404);
  });

  it("returns 404 for non-existent draft", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: null, error: null });

    const { DELETE } = await import("@/app/api/drafts/[id]/route");
    const response = await DELETE(makeRequest(), makeParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("soft-deletes draft and returns 200", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    mockSoftDeleteDraft.mockResolvedValue({
      data: { ...baseDraft, deleted_at: "2026-02-26T00:00:00Z" },
      error: null,
    });

    const { DELETE } = await import("@/app/api/drafts/[id]/route");
    const response = await DELETE(makeRequest(), makeParams("draft-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Draft deleted");
    expect(mockSoftDeleteDraft).toHaveBeenCalledWith(expect.anything(), "draft-1");
  });

  it("soft-deletes draft with attachments — attachments remain in storage", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    mockSoftDeleteDraft.mockResolvedValue({
      data: { ...baseDraft, deleted_at: "2026-02-26T00:00:00Z" },
      error: null,
    });

    const { DELETE } = await import("@/app/api/drafts/[id]/route");
    const response = await DELETE(makeRequest(), makeParams("draft-1"));

    expect(response.status).toBe(200);
    // Attachments are NOT deleted — only the draft is soft-deleted
    expect(mockSoftDeleteDraft).toHaveBeenCalledTimes(1);
  });
});
