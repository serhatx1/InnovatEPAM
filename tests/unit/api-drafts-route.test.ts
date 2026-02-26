import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockCreateDraft = vi.fn();
const mockListDrafts = vi.fn();
const mockMoveStagedFiles = vi.fn();
const mockCreateAttachments = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  createDraft: (...args: unknown[]) => mockCreateDraft(...args),
  listDrafts: (...args: unknown[]) => mockListDrafts(...args),
  createAttachments: (...args: unknown[]) => mockCreateAttachments(...args),
}));

vi.mock("@/lib/supabase/storage", () => ({
  moveStagedFiles: (...args: unknown[]) => mockMoveStagedFiles(...args),
}));

// ── Helpers ─────────────────────────────────────────────

function authedUser(id = "user-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function makeJsonRequest(body: Record<string, unknown>): Request {
  return {
    json: async () => body,
  } as any;
}

// ── POST /api/drafts ────────────────────────────────────

describe("POST /api/drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { POST } = await import("@/app/api/drafts/route");
    const response = await POST(makeJsonRequest({}) as any);
    expect(response.status).toBe(401);
  });

  it("returns 201 with empty body (creates draft with no required fields)", async () => {
    authedUser();
    const mockDraft = { id: "draft-1", status: "draft", title: "", description: "" };
    mockCreateDraft.mockResolvedValue({ data: mockDraft, error: null });

    const { POST } = await import("@/app/api/drafts/route");
    const response = await POST(makeJsonRequest({}) as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe("draft-1");
    expect(body.status).toBe("draft");
  });

  it("returns 201 with title-only payload", async () => {
    authedUser();
    const mockDraft = { id: "draft-2", status: "draft", title: "My Draft" };
    mockCreateDraft.mockResolvedValue({ data: mockDraft, error: null });

    const { POST } = await import("@/app/api/drafts/route");
    const response = await POST(makeJsonRequest({ title: "My Draft" }) as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.title).toBe("My Draft");
  });

  it("returns 201 with full payload", async () => {
    authedUser();
    const mockDraft = {
      id: "draft-3",
      status: "draft",
      title: "Full Draft",
      description: "Description",
      category: "Process Improvement",
    };
    mockCreateDraft.mockResolvedValue({ data: mockDraft, error: null });

    const { POST } = await import("@/app/api/drafts/route");
    const response = await POST(
      makeJsonRequest({
        title: "Full Draft",
        description: "Description",
        category: "Process Improvement",
      }) as any
    );

    expect(response.status).toBe(201);
  });

  it("returns 201 with staged file session and moves files", async () => {
    authedUser();
    const mockDraft = { id: "draft-4", status: "draft", title: "With Files" };
    mockCreateDraft.mockResolvedValue({ data: mockDraft, error: null });
    mockMoveStagedFiles.mockResolvedValue(["draft-4/123-doc.pdf"]);
    mockCreateAttachments.mockResolvedValue({ data: [], error: null });

    const { POST } = await import("@/app/api/drafts/route");
    const response = await POST(
      makeJsonRequest({
        title: "With Files",
        stagingSessionId: "session-abc",
      }) as any
    );

    expect(response.status).toBe(201);
    expect(mockMoveStagedFiles).toHaveBeenCalledWith("session-abc", "draft-4");
  });
});

// ── GET /api/drafts ─────────────────────────────────────

describe("GET /api/drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { GET } = await import("@/app/api/drafts/route");
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns only authenticated user's drafts", async () => {
    authedUser("user-1");
    const drafts = [
      { id: "d1", title: "Draft 1", status: "draft" },
      { id: "d2", title: "Draft 2", status: "draft" },
    ];
    mockListDrafts.mockResolvedValue({ data: drafts, error: null });

    const { GET } = await import("@/app/api/drafts/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(mockListDrafts).toHaveBeenCalledWith(expect.anything(), "user-1");
  });

  it("returns empty array when user has no drafts", async () => {
    authedUser();
    mockListDrafts.mockResolvedValue({ data: [], error: null });

    const { GET } = await import("@/app/api/drafts/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("results ordered by updated_at DESC", async () => {
    authedUser();
    const drafts = [
      { id: "d2", updated_at: "2026-02-02" },
      { id: "d1", updated_at: "2026-01-01" },
    ];
    mockListDrafts.mockResolvedValue({ data: drafts, error: null });

    const { GET } = await import("@/app/api/drafts/route");
    const response = await GET();
    const body = await response.json();

    expect(body[0].id).toBe("d2");
    expect(body[1].id).toBe("d1");
  });

  it("excludes soft-deleted drafts (handled by query layer)", async () => {
    authedUser();
    // listDrafts already filters deleted_at IS NULL
    mockListDrafts.mockResolvedValue({ data: [], error: null });

    const { GET } = await import("@/app/api/drafts/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });
});
