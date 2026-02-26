import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetIdeaById = vi.fn();
const mockGetAttachmentUrl = vi.fn();
const mockGetAttachmentsByIdeaId = vi.fn();
const mockGetAttachmentDownloadUrl = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  getIdeaById: (...args: unknown[]) => mockGetIdeaById(...args),
  getAttachmentsByIdeaId: (...args: unknown[]) => mockGetAttachmentsByIdeaId(...args),
  getUserRole: vi.fn(async () => "submitter"),
}));

vi.mock("@/lib/queries/portal-settings", () => ({
  getBlindReviewEnabled: vi.fn(async () => ({ enabled: false, updatedBy: null, updatedAt: null })),
}));

vi.mock("@/lib/queries/review-state", () => ({
  getIdeaStageState: vi.fn(async () => ({ data: null, error: null })),
}));

vi.mock("@/lib/review/blind-review", () => ({
  shouldAnonymize: vi.fn(() => false),
  anonymizeIdeaResponse: vi.fn((idea: unknown) => idea),
}));

vi.mock("@/lib/supabase/storage", () => ({
  getAttachmentUrl: (...args: unknown[]) => mockGetAttachmentUrl(...args),
  getAttachmentDownloadUrl: (...args: unknown[]) => mockGetAttachmentDownloadUrl(...args),
}));

vi.mock("@/lib/queries/idea-scores", () => ({
  getScoreAggregateForIdea: vi.fn(async () => ({ data: { avgScore: null, scoreCount: 0 }, error: null })),
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
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });

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
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
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
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-3"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.signed_attachment_url).toBeNull();
  });

  // ── T8: Multi-attachment response tests ──────────────

  it("returns idea with attachments[] array for new model", async () => {
    authedUser();
    const idea = {
      id: "idea-new",
      title: "New Model Idea",
      status: "submitted",
      attachment_url: null,
      category_fields: {},
    };
    mockGetIdeaById.mockResolvedValue({ data: idea, error: null });

    const attachments = [
      { id: "att-1", idea_id: "idea-new", original_file_name: "doc.pdf", storage_path: "user-1/1-doc.pdf", upload_order: 1, file_size: 1024, mime_type: "application/pdf" },
      { id: "att-2", idea_id: "idea-new", original_file_name: "image.png", storage_path: "user-1/2-image.png", upload_order: 2, file_size: 2048, mime_type: "image/png" },
    ];
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: attachments, error: null });
    mockGetAttachmentDownloadUrl.mockImplementation(async (path: string, name: string) =>
      `https://storage.example.com/signed/${name}`
    );

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-new"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.attachments).toHaveLength(2);
    expect(body.attachments[0].original_file_name).toBe("doc.pdf");
    expect(body.attachments[1].original_file_name).toBe("image.png");
  });

  it("each attachment has download_url and original_file_name", async () => {
    authedUser();
    const idea = {
      id: "idea-urls",
      title: "URL Test",
      status: "submitted",
      attachment_url: null,
      category_fields: {},
    };
    mockGetIdeaById.mockResolvedValue({ data: idea, error: null });

    const attachments = [
      { id: "att-1", idea_id: "idea-urls", original_file_name: "report.pdf", storage_path: "user-1/1-report.pdf", upload_order: 1, file_size: 5000, mime_type: "application/pdf" },
    ];
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: attachments, error: null });
    mockGetAttachmentDownloadUrl.mockResolvedValue("https://storage.example.com/signed/report.pdf");

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-urls"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.attachments[0]).toMatchObject({
      original_file_name: "report.pdf",
      download_url: "https://storage.example.com/signed/report.pdf",
    });
  });

  it("attachments are ordered by upload_order", async () => {
    authedUser();
    const idea = {
      id: "idea-order",
      title: "Order Test",
      status: "submitted",
      attachment_url: null,
      category_fields: {},
    };
    mockGetIdeaById.mockResolvedValue({ data: idea, error: null });

    // DB returns them in order (getAttachmentsByIdeaId sorts by upload_order)
    const attachments = [
      { id: "att-1", idea_id: "idea-order", original_file_name: "first.pdf", storage_path: "u/1-first.pdf", upload_order: 1, file_size: 100, mime_type: "application/pdf" },
      { id: "att-2", idea_id: "idea-order", original_file_name: "second.png", storage_path: "u/2-second.png", upload_order: 2, file_size: 200, mime_type: "image/png" },
      { id: "att-3", idea_id: "idea-order", original_file_name: "third.csv", storage_path: "u/3-third.csv", upload_order: 3, file_size: 300, mime_type: "text/csv" },
    ];
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: attachments, error: null });
    mockGetAttachmentDownloadUrl.mockImplementation(async (_path: string, name: string) =>
      `https://cdn/${name}`
    );

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-order"));
    const body = await response.json();

    expect(body.attachments[0].original_file_name).toBe("first.pdf");
    expect(body.attachments[1].original_file_name).toBe("second.png");
    expect(body.attachments[2].original_file_name).toBe("third.csv");
    expect(body.attachments[0].upload_order).toBe(1);
    expect(body.attachments[2].upload_order).toBe(3);
  });

  it("legacy idea with attachment_url but no records renders as single attachment", async () => {
    authedUser();
    const idea = {
      id: "idea-legacy",
      title: "Legacy Idea",
      status: "submitted",
      attachment_url: "user-1/old-doc.pdf",
      category_fields: {},
    };
    mockGetIdeaById.mockResolvedValue({ data: idea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockGetAttachmentUrl.mockResolvedValue("https://storage.example.com/legacy-signed");

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-legacy"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.signed_attachment_url).toBe("https://storage.example.com/legacy-signed");
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0]).toMatchObject({
      original_file_name: "old-doc.pdf",
      download_url: "https://storage.example.com/legacy-signed",
    });
  });

  it("returns empty attachments[] for idea with neither attachment_url nor records", async () => {
    authedUser();
    const idea = {
      id: "idea-none",
      title: "No Attachments",
      status: "submitted",
      attachment_url: null,
      category_fields: {},
    };
    mockGetIdeaById.mockResolvedValue({ data: idea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-none"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.attachments).toEqual([]);
    expect(body.signed_attachment_url).toBeNull();
  });

  // ── Draft visibility tests ──────────────────────────────
  it("returns draft to its owner", async () => {
    authedUser("user-owner");
    const idea = {
      id: "draft-1",
      title: "My Draft",
      status: "draft",
      user_id: "user-owner",
      attachment_url: null,
      category_fields: {},
    };
    mockGetIdeaById.mockResolvedValue({ data: idea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("draft-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("draft-1");
    expect(body.status).toBe("draft");
  });

  it("returns 404 for non-owner accessing a draft", async () => {
    authedUser("user-other");
    const idea = {
      id: "draft-1",
      title: "Someone's Draft",
      status: "draft",
      user_id: "user-owner",
      attachment_url: null,
      category_fields: {},
    };
    mockGetIdeaById.mockResolvedValue({ data: idea, error: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("draft-1"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Idea not found");
  });
});
