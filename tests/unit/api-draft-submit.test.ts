import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetDraftById = vi.fn();
const mockSubmitDraft = vi.fn();
const mockValidateCategoryFieldsForCategory = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  getDraftById: (...args: unknown[]) => mockGetDraftById(...args),
  submitDraft: (...args: unknown[]) => mockSubmitDraft(...args),
}));

vi.mock("@/lib/validation/category-fields", () => ({
  validateCategoryFieldsForCategory: (...args: unknown[]) =>
    mockValidateCategoryFieldsForCategory(...args),
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
  title: "Complete Draft",
  description: "Fully filled out draft",
  category: "Process Improvement",
  category_fields: {},
  status: "draft",
  attachment_url: null,
  evaluator_comment: null,
  deleted_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// ── POST /api/drafts/[id]/submit ───────────────────────

describe("POST /api/drafts/[id]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { POST } = await import("@/app/api/drafts/[id]/submit/route");
    const response = await POST(makeRequest(), makeParams("draft-1"));
    expect(response.status).toBe(401);
  });

  it("returns 404 for non-existent draft", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("@/app/api/drafts/[id]/submit/route");
    const response = await POST(makeRequest(), makeParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("returns 404 for other user's draft", async () => {
    authedUser("user-2");
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });

    const { POST } = await import("@/app/api/drafts/[id]/submit/route");
    const response = await POST(makeRequest(), makeParams("draft-1"));
    expect(response.status).toBe(404);
  });

  it("returns 400 for draft with missing required submit fields", async () => {
    authedUser();
    const incompleteDraft = { ...baseDraft, title: "", description: "", category: "" };
    mockGetDraftById.mockResolvedValue({ data: incompleteDraft, error: null });

    const { POST } = await import("@/app/api/drafts/[id]/submit/route");
    const response = await POST(makeRequest(), makeParams("draft-1"));
    expect(response.status).toBe(400);
  });

  it("submits draft with valid fields and returns 200", async () => {
    authedUser();
    mockGetDraftById.mockResolvedValue({ data: baseDraft, error: null });
    mockValidateCategoryFieldsForCategory.mockReturnValue({ success: true });
    const submitted = { ...baseDraft, status: "submitted" };
    mockSubmitDraft.mockResolvedValue({ data: submitted, error: null });

    const { POST } = await import("@/app/api/drafts/[id]/submit/route");
    const response = await POST(makeRequest(), makeParams("draft-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("submitted");
    expect(mockSubmitDraft).toHaveBeenCalledWith(expect.anything(), "draft-1");
  });

  it("rejects submission of already submitted idea", async () => {
    authedUser();
    // getDraftById filters by status=draft — submitted ideas return null
    mockGetDraftById.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("@/app/api/drafts/[id]/submit/route");
    const response = await POST(makeRequest(), makeParams("already-submitted"));
    expect(response.status).toBe(404);
  });
});
