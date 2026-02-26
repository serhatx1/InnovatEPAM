import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockListIdeas = vi.fn();
const mockCreateIdea = vi.fn();
const mockCreateAttachments = vi.fn();
const mockUploadMultipleAttachments = vi.fn();
const mockDeleteAttachments = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({ select: vi.fn(() => ({ in: vi.fn(async () => ({ data: [], error: null })) })) })),
  })),
}));

vi.mock("@/lib/queries", () => ({
  listIdeas: (...args: unknown[]) => mockListIdeas(...args),
  createIdea: (...args: unknown[]) => mockCreateIdea(...args),
  createAttachments: (...args: unknown[]) => mockCreateAttachments(...args),
  bindSubmittedIdeaToWorkflow: vi.fn(async () => ({ data: null, error: null })),
  getUserRole: vi.fn(async () => "submitter"),
}));

vi.mock("@/lib/queries/portal-settings", () => ({
  getBlindReviewEnabled: vi.fn(async () => ({ enabled: false, updatedBy: null, updatedAt: null })),
}));

vi.mock("@/lib/review/blind-review", () => ({
  anonymizeIdeaList: vi.fn((ideas: unknown[]) => ideas),
}));

vi.mock("@/lib/supabase/storage", () => ({
  uploadIdeaAttachment: vi.fn(),
  uploadMultipleAttachments: (...args: unknown[]) => mockUploadMultipleAttachments(...args),
  deleteAttachments: (...args: unknown[]) => mockDeleteAttachments(...args),
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

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function makeMultiFileFormData(
  fields: Record<string, string>,
  files?: File[]
): Request {
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

const validFields = {
  title: "Multi-File Test Idea",
  description: "A valid description that is at least twenty characters long for testing",
  category: "Process Improvement",
};

// ── Tests ───────────────────────────────────────────────

describe("POST /api/ideas (multi-file)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("POST with 0 files → 201 (attachments optional)", async () => {
    authedUser();
    const idea = { id: "idea-1", ...validFields, status: "submitted", attachment_url: null };
    mockCreateIdea.mockResolvedValue({ data: idea, error: null });

    const { POST } = await import("@/app/api/ideas/route");
    const request = makeMultiFileFormData(validFields);
    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe("idea-1");
    expect(mockUploadMultipleAttachments).not.toHaveBeenCalled();
    expect(mockCreateAttachments).not.toHaveBeenCalled();
  });

  it("POST with 1 valid file → 201 with attachment record", async () => {
    authedUser();
    const idea = { id: "idea-1", ...validFields, status: "submitted", attachment_url: null };
    mockCreateIdea.mockResolvedValue({ data: idea, error: null });
    mockUploadMultipleAttachments.mockResolvedValue(["user-1/123-doc.pdf"]);
    const attachments = [
      { id: "att-1", idea_id: "idea-1", original_file_name: "doc.pdf", upload_order: 1 },
    ];
    mockCreateAttachments.mockResolvedValue({ data: attachments, error: null });

    const file = new File(["content"], "doc.pdf", { type: "application/pdf" });
    const { POST } = await import("@/app/api/ideas/route");
    const request = makeMultiFileFormData(validFields, [file]);
    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.attachments).toHaveLength(1);
    expect(mockUploadMultipleAttachments).toHaveBeenCalledTimes(1);
    expect(mockCreateAttachments).toHaveBeenCalledTimes(1);
  });

  it("POST with 5 valid files → 201 with 5 attachment records", async () => {
    authedUser();
    const idea = { id: "idea-1", ...validFields, status: "submitted", attachment_url: null };
    mockCreateIdea.mockResolvedValue({ data: idea, error: null });

    const paths = Array.from({ length: 5 }, (_, i) => `user-1/${i}-file${i}.pdf`);
    mockUploadMultipleAttachments.mockResolvedValue(paths);

    const attachmentRecords = paths.map((p, i) => ({
      id: `att-${i}`, idea_id: "idea-1", storage_path: p, upload_order: i + 1,
      original_file_name: `file${i}.pdf`,
    }));
    mockCreateAttachments.mockResolvedValue({ data: attachmentRecords, error: null });

    const files = Array.from({ length: 5 }, (_, i) =>
      new File(["data"], `file${i}.pdf`, { type: "application/pdf" })
    );
    const { POST } = await import("@/app/api/ideas/route");
    const request = makeMultiFileFormData(validFields, files);
    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.attachments).toHaveLength(5);
  });

  it("POST with 6 files → 400 'Maximum 5 files allowed'", async () => {
    authedUser();
    const files = Array.from({ length: 6 }, (_, i) =>
      new File(["data"], `file${i}.pdf`, { type: "application/pdf" })
    );
    const { POST } = await import("@/app/api/ideas/route");
    const request = makeMultiFileFormData(validFields, files);
    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Maximum 5 files allowed");
  });

  it("POST with oversized file → 400 with specific error", async () => {
    authedUser();
    const bigFile = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "huge.pdf", {
      type: "application/pdf",
    });
    const { POST } = await import("@/app/api/ideas/route");
    const request = makeMultiFileFormData(validFields, [bigFile]);
    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("File must not exceed 10 MB");
  });

  it("POST with invalid MIME type → 400 with specific error", async () => {
    authedUser();
    const badFile = new File(["data"], "script.js", { type: "application/javascript" });
    const { POST } = await import("@/app/api/ideas/route");
    const request = makeMultiFileFormData(validFields, [badFile]);
    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Accepted formats:");
  });

  it("POST with 0-byte file → 400 with specific error", async () => {
    authedUser();
    const emptyFile = new File([], "empty.pdf", { type: "application/pdf" });
    const { POST } = await import("@/app/api/ideas/route");
    const request = makeMultiFileFormData(validFields, [emptyFile]);
    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("File is empty");
  });

  it("POST with combined size > 25 MB → 400 with total size error", async () => {
    authedUser();
    // 3 files of 9MB each = 27MB > 25MB
    const files = Array.from({ length: 3 }, (_, i) =>
      new File([new Uint8Array(9 * 1024 * 1024)], `big${i}.pdf`, { type: "application/pdf" })
    );
    const { POST } = await import("@/app/api/ideas/route");
    const request = makeMultiFileFormData(validFields, files);
    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Total attachment size must not exceed 25 MB");
  });

  it("POST with upload failure mid-batch → 500 + cleanup", async () => {
    authedUser();
    const idea = { id: "idea-1", ...validFields, status: "submitted" };
    mockCreateIdea.mockResolvedValue({ data: idea, error: null });
    mockUploadMultipleAttachments.mockRejectedValue(new Error("File upload failed: Quota exceeded"));

    const files = [
      new File(["a"], "doc1.pdf", { type: "application/pdf" }),
      new File(["b"], "doc2.pdf", { type: "application/pdf" }),
    ];
    const { POST } = await import("@/app/api/ideas/route");
    const request = makeMultiFileFormData(validFields, files);
    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain("upload failed");
  });

  it("POST without auth → 401", async () => {
    unauthenticated();
    const { POST } = await import("@/app/api/ideas/route");
    const request = makeMultiFileFormData(validFields);
    const response = await POST(request as any);

    expect(response.status).toBe(401);
  });

  it("POST with DB failure after upload → 500 + cleanup storage", async () => {
    authedUser();
    const storagePaths = ["user-1/1-doc.pdf"];
    mockUploadMultipleAttachments.mockResolvedValue(storagePaths);
    mockCreateIdea.mockResolvedValue({ data: null, error: "DB insert failed" });
    mockDeleteAttachments.mockResolvedValue(undefined);

    const files = [new File(["a"], "doc.pdf", { type: "application/pdf" })];
    const { POST } = await import("@/app/api/ideas/route");
    const request = makeMultiFileFormData(validFields, files);
    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(mockDeleteAttachments).toHaveBeenCalledWith(storagePaths);
  });
});
