import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetUserRole = vi.fn();
const mockGetIdeaById = vi.fn();
const mockUpdateIdeaStatus = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
  getIdeaById: (...args: unknown[]) => mockGetIdeaById(...args),
  updateIdeaStatus: (...args: unknown[]) => mockUpdateIdeaStatus(...args),
}));

// ── Helpers ─────────────────────────────────────────────

function authedUser(id = "admin-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function adminRole() {
  mockGetUserRole.mockResolvedValue("admin");
}

function submitterRole() {
  mockGetUserRole.mockResolvedValue("submitter");
}

function makeRequest(id: string, body: Record<string, unknown>) {
  return [
    { json: async () => body } as any,
    { params: Promise.resolve({ id }) },
  ] as const;
}

// ── Tests ───────────────────────────────────────────────

describe("PATCH /api/admin/ideas/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", { status: "accepted" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  // ── Authorization ─────────────────────────────────

  it("returns 403 when user is not admin", async () => {
    authedUser("user-1");
    submitterRole();
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", { status: "accepted" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("admin");
  });

  it("returns 403 when role is null (no profile)", async () => {
    authedUser("user-1");
    mockGetUserRole.mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", { status: "accepted" }));
    const body = await response.json();

    expect(response.status).toBe(403);
  });

  // ── Validation ────────────────────────────────────

  it("returns 400 for invalid status value", async () => {
    authedUser();
    adminRole();
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", { status: "invalid_status" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("returns 400 for status=submitted (cannot transition to submitted)", async () => {
    authedUser();
    adminRole();
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", { status: "submitted" }));
    const body = await response.json();

    expect(response.status).toBe(400);
  });

  it("returns 400 when rejecting without evaluatorComment", async () => {
    authedUser();
    adminRole();
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", { status: "rejected" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when rejecting with evaluatorComment < 10 chars", async () => {
    authedUser();
    adminRole();
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", {
      status: "rejected",
      evaluatorComment: "Too short",
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
  });

  // ── Idea lookup ───────────────────────────────────

  it("returns 404 when idea does not exist", async () => {
    authedUser();
    adminRole();
    mockGetIdeaById.mockResolvedValue({ data: null, error: "Not found" });
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("nonexistent", { status: "accepted" }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Idea not found");
  });

  // ── Transition validation ─────────────────────────

  it("returns 400 for invalid status transition (accepted → under_review)", async () => {
    authedUser();
    adminRole();
    mockGetIdeaById.mockResolvedValue({
      data: { id: "idea-1", status: "accepted" },
      error: null,
    });
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", { status: "under_review" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Invalid transition");
    expect(body.error).toContain("accepted");
  });

  it("returns 400 for invalid transition (rejected → accepted)", async () => {
    authedUser();
    adminRole();
    mockGetIdeaById.mockResolvedValue({
      data: { id: "idea-1", status: "rejected" },
      error: null,
    });
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", { status: "accepted" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Invalid transition");
  });

  // ── Success cases ─────────────────────────────────

  it("accepts idea: submitted → accepted", async () => {
    authedUser();
    adminRole();
    mockGetIdeaById.mockResolvedValue({
      data: { id: "idea-1", status: "submitted" },
      error: null,
    });
    const updated = { id: "idea-1", status: "accepted", evaluator_comment: null };
    mockUpdateIdeaStatus.mockResolvedValue({ data: updated, error: null });
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", { status: "accepted" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("accepted");
    expect(mockUpdateIdeaStatus).toHaveBeenCalledWith(
      expect.anything(),
      "idea-1",
      expect.objectContaining({ status: "accepted" })
    );
  });

  it("moves to under_review: submitted → under_review", async () => {
    authedUser();
    adminRole();
    mockGetIdeaById.mockResolvedValue({
      data: { id: "idea-1", status: "submitted" },
      error: null,
    });
    const updated = { id: "idea-1", status: "under_review" };
    mockUpdateIdeaStatus.mockResolvedValue({ data: updated, error: null });
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", { status: "under_review" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("under_review");
  });

  it("rejects idea with valid comment: submitted → rejected", async () => {
    authedUser();
    adminRole();
    mockGetIdeaById.mockResolvedValue({
      data: { id: "idea-1", status: "submitted" },
      error: null,
    });
    const updated = {
      id: "idea-1",
      status: "rejected",
      evaluator_comment: "Does not meet quality standards for this cycle",
    };
    mockUpdateIdeaStatus.mockResolvedValue({ data: updated, error: null });
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", {
      status: "rejected",
      evaluatorComment: "Does not meet quality standards for this cycle",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("rejected");
    expect(body.evaluator_comment).toContain("quality standards");
  });

  it("accepts from under_review: under_review → accepted", async () => {
    authedUser();
    adminRole();
    mockGetIdeaById.mockResolvedValue({
      data: { id: "idea-2", status: "under_review" },
      error: null,
    });
    const updated = { id: "idea-2", status: "accepted" };
    mockUpdateIdeaStatus.mockResolvedValue({ data: updated, error: null });
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-2", { status: "accepted" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("accepted");
  });

  // ── Database error ────────────────────────────────

  it("returns 500 when updateIdeaStatus fails", async () => {
    authedUser();
    adminRole();
    mockGetIdeaById.mockResolvedValue({
      data: { id: "idea-1", status: "submitted" },
      error: null,
    });
    mockUpdateIdeaStatus.mockResolvedValue({ data: null, error: "DB write failed" });
    const { PATCH } = await import("@/app/api/admin/ideas/[id]/status/route");

    const response = await PATCH(...makeRequest("idea-1", { status: "accepted" }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("DB write failed");
  });
});
