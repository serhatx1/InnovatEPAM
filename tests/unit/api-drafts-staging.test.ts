import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockUploadToStaging = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/storage", () => ({
  uploadToStaging: (...args: unknown[]) => mockUploadToStaging(...args),
}));

vi.mock("@/lib/validation/idea", () => ({
  validateFile: vi.fn(() => null),
}));

// ── Helpers ─────────────────────────────────────────────

function authedUser(id = "user-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function makeFormData(
  file?: { name: string; type: string; size: number; content?: string },
  sessionId?: string
) {
  const formData = new Map<string, unknown>();
  if (file) {
    formData.set(
      "file",
      new File([file.content ?? "test content"], file.name, { type: file.type })
    );
  }
  if (sessionId) {
    formData.set("sessionId", sessionId);
  }
  return {
    formData: async () => ({
      get: (key: string) => formData.get(key) ?? null,
    }),
  } as any;
}

// ── POST /api/drafts/staging/upload ────────────────────

describe("POST /api/drafts/staging/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { POST } = await import("@/app/api/drafts/staging/upload/route");
    const response = await POST(
      makeFormData({ name: "test.pdf", type: "application/pdf", size: 1024 }, "session-1")
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    authedUser();
    const { POST } = await import("@/app/api/drafts/staging/upload/route");
    const response = await POST(makeFormData(undefined, "session-1"));
    expect(response.status).toBe(400);
  });

  it("returns 400 when no sessionId is provided", async () => {
    authedUser();
    const { POST } = await import("@/app/api/drafts/staging/upload/route");
    const response = await POST(
      makeFormData({ name: "test.pdf", type: "application/pdf", size: 1024 })
    );
    expect(response.status).toBe(400);
  });

  it("uploads file to staging and returns 201 with path", async () => {
    authedUser();
    mockUploadToStaging.mockResolvedValue("staging/session-1/test.pdf");

    const { POST } = await import("@/app/api/drafts/staging/upload/route");
    const response = await POST(
      makeFormData(
        { name: "test.pdf", type: "application/pdf", size: 1024 },
        "session-1"
      )
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.storagePath).toContain("staging/");
  });

  it("returns 500 on storage error", async () => {
    authedUser();
    mockUploadToStaging.mockRejectedValue(new Error("Storage error"));

    const { POST } = await import("@/app/api/drafts/staging/upload/route");
    const response = await POST(
      makeFormData(
        { name: "test.pdf", type: "application/pdf", size: 1024 },
        "session-1"
      )
    );
    expect(response.status).toBe(500);
  });
});
