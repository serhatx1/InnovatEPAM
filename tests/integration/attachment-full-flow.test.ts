import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mock state ───────────────────────────────────

const mockGetUser = vi.fn();
const mockCreateIdea = vi.fn();
const mockListIdeas = vi.fn();
const mockCreateAttachments = vi.fn();
const mockGetIdeaById = vi.fn();
const mockGetAttachmentsByIdeaId = vi.fn();
const mockUploadMultipleAttachments = vi.fn();
const mockDeleteAttachments = vi.fn();
const mockGetAttachmentUrl = vi.fn();
const mockGetAttachmentDownloadUrl = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  listIdeas: (...args: unknown[]) => mockListIdeas(...args),
  createIdea: (...args: unknown[]) => mockCreateIdea(...args),
  createAttachments: (...args: unknown[]) => mockCreateAttachments(...args),
  getIdeaById: (...args: unknown[]) => mockGetIdeaById(...args),
  getAttachmentsByIdeaId: (...args: unknown[]) => mockGetAttachmentsByIdeaId(...args),
}));

vi.mock("@/lib/supabase/storage", () => ({
  uploadMultipleAttachments: (...args: unknown[]) => mockUploadMultipleAttachments(...args),
  deleteAttachments: (...args: unknown[]) => mockDeleteAttachments(...args),
  getAttachmentUrl: (...args: unknown[]) => mockGetAttachmentUrl(...args),
  getAttachmentDownloadUrl: (...args: unknown[]) => mockGetAttachmentDownloadUrl(...args),
}));

vi.mock("@/lib/validation/category-fields", () => ({
  validateCategoryFieldsForCategory: vi.fn().mockReturnValue({
    success: true,
    data: {},
    errors: {},
  }),
}));

// ── Helpers ─────────────────────────────────────────────

function authedUser(id = "user-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function makeFormData(fields: Record<string, string>, files?: File[]): Request {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  if (files) {
    for (const file of files) {
      formData.append("files", file);
    }
  }
  return { formData: async () => formData } as any;
}

function makeGetRequest(id: string) {
  return [{} as any, { params: Promise.resolve({ id }) }] as const;
}

const validFields = {
  title: "Full Flow Idea",
  description: "A valid description that is at least twenty characters long for testing.",
  category: "Process Improvement",
};

// ── Tests ───────────────────────────────────────────────

describe("Attachment Full Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("upload 5 files → create records → fetch detail → verify all attachments with download URLs", async () => {
    authedUser();

    // 1. POST: create idea + 5 files
    const idea = {
      id: "idea-flow",
      ...validFields,
      status: "submitted",
      attachment_url: null,
      category_fields: {},
    };
    mockCreateIdea.mockResolvedValue({ data: idea, error: null });

    const storagePaths = Array.from({ length: 5 }, (_, i) => `user-1/${i}-file${i}.pdf`);
    mockUploadMultipleAttachments.mockResolvedValue(storagePaths);

    const attachmentRecords = storagePaths.map((path, i) => ({
      id: `att-${i}`,
      idea_id: "idea-flow",
      original_file_name: `file${i}.pdf`,
      storage_path: path,
      upload_order: i + 1,
      file_size: 1024 * (i + 1),
      mime_type: "application/pdf",
      created_at: new Date().toISOString(),
    }));
    mockCreateAttachments.mockResolvedValue({ data: attachmentRecords, error: null });

    const files = Array.from({ length: 5 }, (_, i) =>
      new File(["content"], `file${i}.pdf`, { type: "application/pdf" })
    );

    const { POST } = await import("@/app/api/ideas/route");
    const postResponse = await POST(makeFormData(validFields, files) as any);
    const postBody = await postResponse.json();

    expect(postResponse.status).toBe(201);
    expect(postBody.attachments).toHaveLength(5);

    // Verify createAttachments was called with correct data for all 5 files
    expect(mockCreateAttachments).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({ idea_id: "idea-flow", upload_order: 1 }),
        expect.objectContaining({ idea_id: "idea-flow", upload_order: 5 }),
      ])
    );

    // 2. GET: fetch detail and verify signed download URLs for each
    mockGetIdeaById.mockResolvedValue({ data: idea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: attachmentRecords, error: null });
    mockGetAttachmentDownloadUrl.mockImplementation(
      async (_path: string, name: string) => `https://cdn.example.com/${name}`
    );

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const getResponse = await GET(...makeGetRequest("idea-flow"));
    const getBody = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getBody.attachments).toHaveLength(5);

    // Verify each attachment has correct download_url
    for (let i = 0; i < 5; i++) {
      expect(getBody.attachments[i]).toMatchObject({
        original_file_name: `file${i}.pdf`,
        download_url: `https://cdn.example.com/file${i}.pdf`,
        upload_order: i + 1,
      });
    }

    // Verify getAttachmentDownloadUrl was called 5 times
    expect(mockGetAttachmentDownloadUrl).toHaveBeenCalledTimes(5);
  });

  it("atomic failure: record insert fails → cleanup deletes uploaded files, no records persisted", async () => {
    authedUser();

    const idea = {
      id: "idea-atomic",
      ...validFields,
      status: "submitted",
      attachment_url: null,
    };
    mockCreateIdea.mockResolvedValue({ data: idea, error: null });

    const storagePaths = ["user-1/0-a.pdf", "user-1/1-b.pdf", "user-1/2-c.pdf"];
    mockUploadMultipleAttachments.mockResolvedValue(storagePaths);
    // DB insert of attachment records fails
    mockCreateAttachments.mockResolvedValue({ data: null, error: "FK constraint" });
    mockDeleteAttachments.mockResolvedValue(undefined);

    const files = [
      new File(["a"], "a.pdf", { type: "application/pdf" }),
      new File(["b"], "b.pdf", { type: "application/pdf" }),
      new File(["c"], "c.pdf", { type: "application/pdf" }),
    ];

    const { POST } = await import("@/app/api/ideas/route");
    const response = await POST(makeFormData(validFields, files) as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("FK constraint");

    // Verify cleanup: uploaded files are deleted
    expect(mockDeleteAttachments).toHaveBeenCalledWith(storagePaths);
  });

  it("backward compatibility: legacy idea (attachment_url, no records) renders single attachment in GET response", async () => {
    authedUser();

    const legacyIdea = {
      id: "idea-legacy",
      title: "Legacy Idea",
      description: "Created before multi-attachment support.",
      category: "Process Improvement",
      status: "submitted",
      attachment_url: "user-1/old-report.pdf",
      category_fields: {},
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    mockGetIdeaById.mockResolvedValue({ data: legacyIdea, error: null });
    // No attachment records in new table
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    // Legacy signed URL
    mockGetAttachmentUrl.mockResolvedValue("https://storage.example.com/legacy-signed");

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeGetRequest("idea-legacy"));
    const body = await response.json();

    expect(response.status).toBe(200);
    // Legacy field preserved
    expect(body.signed_attachment_url).toBe("https://storage.example.com/legacy-signed");
    // Rendered as single attachment in array
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0]).toMatchObject({
      original_file_name: "old-report.pdf",
      download_url: "https://storage.example.com/legacy-signed",
    });
    expect(body.attachments[0].id).toBeNull(); // Legacy: no id
  });
});
