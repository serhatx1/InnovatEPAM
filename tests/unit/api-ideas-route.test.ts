import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockListIdeas = vi.fn();
const mockCreateIdea = vi.fn();
const mockUploadIdeaAttachment = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  listIdeas: (...args: unknown[]) => mockListIdeas(...args),
  createIdea: (...args: unknown[]) => mockCreateIdea(...args),
}));

vi.mock("@/lib/supabase/storage", () => ({
  uploadIdeaAttachment: (...args: unknown[]) => mockUploadIdeaAttachment(...args),
}));

// ── Helpers ─────────────────────────────────────────────

function authedUser(id = "user-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function makeFormData(fields: Record<string, string>, file?: File): Request {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  if (file) formData.set("file", file);
  return { formData: async () => formData } as any;
}

// ── Tests ───────────────────────────────────────────────

describe("GET /api/ideas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { GET } = await import("@/app/api/ideas/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns ideas list for authenticated user", async () => {
    authedUser();
    const ideas = [
      { id: "1", title: "Idea 1", status: "submitted" },
      { id: "2", title: "Idea 2", status: "accepted" },
    ];
    mockListIdeas.mockResolvedValue({ data: ideas, error: null });

    const { GET } = await import("@/app/api/ideas/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0].title).toBe("Idea 1");
  });

  it("returns 500 when database errors", async () => {
    authedUser();
    mockListIdeas.mockResolvedValue({ data: [], error: "DB connection failed" });

    const { GET } = await import("@/app/api/ideas/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("DB connection failed");
  });
});

describe("POST /api/ideas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { POST } = await import("@/app/api/ideas/route");

    const request = makeFormData({
      title: "Test Idea Title Here",
      description: "A valid description that is at least twenty characters long",
      category: "Process Improvement",
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid base fields (title too short)", async () => {
    authedUser();
    const { POST } = await import("@/app/api/ideas/route");

    const request = makeFormData({
      title: "Hi",
      description: "A valid description that is at least twenty characters long",
      category: "Process Improvement",
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 for invalid category", async () => {
    authedUser();
    const { POST } = await import("@/app/api/ideas/route");

    const request = makeFormData({
      title: "A Valid Title Here",
      description: "A valid description that is at least twenty characters long",
      category: "Nonexistent Category",
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 for malformed category_fields JSON", async () => {
    authedUser();
    const { POST } = await import("@/app/api/ideas/route");

    const request = makeFormData({
      title: "A Valid Title Here",
      description: "A valid description that is at least twenty characters long",
      category: "Cost Reduction",
      category_fields: "{invalid json",
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.details.category_fields).toBeTruthy();
  });

  it("returns 400 for invalid file type", async () => {
    authedUser();
    const { POST } = await import("@/app/api/ideas/route");

    const invalidFile = new File(["content"], "script.exe", { type: "application/x-msdownload" });

    const formData = new FormData();
    formData.set("title", "A Valid Title Here");
    formData.set("description", "A valid description that is at least twenty characters long");
    formData.set("category", "Process Improvement");
    formData.set("category_fields", JSON.stringify({ current_process: "Manual review", time_saved_hours: "10" }));
    formData.set("file", invalidFile);

    const request = { formData: async () => formData } as any;
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("returns 500 when file upload fails", async () => {
    authedUser();
    mockUploadIdeaAttachment.mockRejectedValue(new Error("Storage unavailable"));

    const { POST } = await import("@/app/api/ideas/route");

    const validFile = new File(["pdf content"], "doc.pdf", { type: "application/pdf" });

    const formData = new FormData();
    formData.set("title", "A Valid Title Here");
    formData.set("description", "A valid description that is at least twenty characters long");
    formData.set("category", "Process Improvement");
    formData.set("category_fields", JSON.stringify({ current_process: "Manual review", time_saved_hours: "10" }));
    formData.set("file", validFile);

    const request = { formData: async () => formData } as any;
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Storage unavailable");
  });

  it("returns 500 when createIdea returns database error", async () => {
    authedUser();
    mockCreateIdea.mockResolvedValue({ data: null, error: "Database write failed" });

    const { POST } = await import("@/app/api/ideas/route");

    const request = makeFormData({
      title: "A Valid Title Here",
      description: "A valid description that is at least twenty characters long",
      category: "Process Improvement",
      category_fields: JSON.stringify({ current_process: "Manual review", time_saved_hours: "10" }),
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Database write failed");
  });

  it("returns 201 with created idea on success (no file)", async () => {
    authedUser();
    const createdIdea = { id: "idea-new", title: "A Valid Title Here", status: "submitted" };
    mockCreateIdea.mockResolvedValue({ data: createdIdea, error: null });

    const { POST } = await import("@/app/api/ideas/route");

    const request = makeFormData({
      title: "A Valid Title Here",
      description: "A valid description that is at least twenty characters long",
      category: "Process Improvement",
      category_fields: JSON.stringify({ current_process: "Manual review", time_saved_hours: "10" }),
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe("idea-new");
    expect(mockCreateIdea).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user_id: "user-1",
        title: "A Valid Title Here",
        category: "Process Improvement",
        attachment_url: null,
      })
    );
  });

  it("returns 201 with attachment URL when file upload succeeds", async () => {
    authedUser();
    mockUploadIdeaAttachment.mockResolvedValue("user-1/123-doc.pdf");
    const createdIdea = { id: "idea-file", attachment_url: "user-1/123-doc.pdf" };
    mockCreateIdea.mockResolvedValue({ data: createdIdea, error: null });

    const { POST } = await import("@/app/api/ideas/route");

    const validFile = new File(["pdf content"], "doc.pdf", { type: "application/pdf" });

    const formData = new FormData();
    formData.set("title", "Idea With Attachment");
    formData.set("description", "A valid description that is at least twenty characters long");
    formData.set("category", "Process Improvement");
    formData.set("category_fields", JSON.stringify({ current_process: "Manual review", time_saved_hours: "10" }));
    formData.set("file", validFile);

    const request = { formData: async () => formData } as any;
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockUploadIdeaAttachment).toHaveBeenCalledWith(validFile, "user-1");
    expect(mockCreateIdea).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ attachment_url: "user-1/123-doc.pdf" })
    );
  });
});
