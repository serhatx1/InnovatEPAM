import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetIdeaById = vi.fn();
const mockGetAttachmentUrl = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  getIdeaById: (...args: unknown[]) => mockGetIdeaById(...args),
}));

vi.mock("@/lib/supabase/storage", () => ({
  getAttachmentUrl: (...args: unknown[]) => mockGetAttachmentUrl(...args),
}));

// ── Helpers ─────────────────────────────────────────────

function authedUser(id = "user-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function makeRequest(id: string) {
  return [
    {} as any, // NextRequest (unused)
    { params: Promise.resolve({ id }) },
  ] as const;
}

// ── Tests ───────────────────────────────────────────────

describe("GET /api/ideas/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { GET } = await import("@/app/api/ideas/[id]/route");

    const response = await GET(...makeRequest("idea-1"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when idea does not exist", async () => {
    authedUser();
    mockGetIdeaById.mockResolvedValue({ data: null, error: "Not found" });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("nonexistent"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Idea not found");
  });

  it("returns 404 when getIdeaById returns error", async () => {
    authedUser();
    mockGetIdeaById.mockResolvedValue({ data: null, error: "DB error" });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-1"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Idea not found");
  });

  it("returns idea without signed URL when no attachment", async () => {
    authedUser();
    const idea = {
      id: "idea-1",
      title: "Test Idea",
      status: "submitted",
      attachment_url: null,
      category_fields: {},
    };
    mockGetIdeaById.mockResolvedValue({ data: idea, error: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("idea-1");
    expect(body.title).toBe("Test Idea");
    expect(body.signed_attachment_url).toBeNull();
    expect(mockGetAttachmentUrl).not.toHaveBeenCalled();
  });

  it("returns idea with signed attachment URL when attachment exists", async () => {
    authedUser();
    const idea = {
      id: "idea-2",
      title: "Idea With File",
      status: "submitted",
      attachment_url: "user-1/123-doc.pdf",
      category_fields: {},
    };
    mockGetIdeaById.mockResolvedValue({ data: idea, error: null });
    mockGetAttachmentUrl.mockResolvedValue("https://storage.example.com/signed-url");

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-2"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.signed_attachment_url).toBe("https://storage.example.com/signed-url");
    expect(mockGetAttachmentUrl).toHaveBeenCalledWith("user-1/123-doc.pdf");
  });

  it("returns idea with null signed URL when getAttachmentUrl fails", async () => {
    authedUser();
    const idea = {
      id: "idea-3",
      title: "Idea Broken Attachment",
      status: "submitted",
      attachment_url: "user-1/broken-path.pdf",
      category_fields: {},
    };
    mockGetIdeaById.mockResolvedValue({ data: idea, error: null });
    mockGetAttachmentUrl.mockResolvedValue(null);

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-3"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.signed_attachment_url).toBeNull();
  });
});
