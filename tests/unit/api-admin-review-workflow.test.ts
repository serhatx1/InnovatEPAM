import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetUserRole = vi.fn();
const mockGetActiveWorkflow = vi.fn();
const mockCreateAndActivateWorkflow = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
}));

vi.mock("@/lib/queries/review-workflow", () => ({
  getActiveWorkflow: (...args: unknown[]) => mockGetActiveWorkflow(...args),
  createAndActivateWorkflow: (...args: unknown[]) =>
    mockCreateAndActivateWorkflow(...args),
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

function makePutRequest(body: Record<string, unknown>) {
  return { json: async () => body } as any;
}

const sampleWorkflow = {
  id: "wf-1",
  version: 1,
  is_active: true,
  created_by: "admin-1",
  created_at: "2026-01-01T00:00:00Z",
  activated_at: "2026-01-01T00:00:00Z",
  stages: [
    { id: "s-1", workflow_id: "wf-1", name: "Screening", position: 1, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
    { id: "s-2", workflow_id: "wf-1", name: "Technical", position: 2, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
    { id: "s-3", workflow_id: "wf-1", name: "Final", position: 3, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
  ],
};

// ── Tests ───────────────────────────────────────────────

describe("GET /api/admin/review/workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { GET } = await import("@/app/api/admin/review/workflow/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-admin user", async () => {
    authedUser("user-1");
    submitterRole();
    const { GET } = await import("@/app/api/admin/review/workflow/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 404 when no active workflow exists", async () => {
    authedUser();
    adminRole();
    mockGetActiveWorkflow.mockResolvedValue({ data: null, error: null });
    const { GET } = await import("@/app/api/admin/review/workflow/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("No active workflow");
  });

  it("returns 200 with active workflow", async () => {
    authedUser();
    adminRole();
    mockGetActiveWorkflow.mockResolvedValue({ data: sampleWorkflow, error: null });
    const { GET } = await import("@/app/api/admin/review/workflow/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("wf-1");
    expect(body.stages).toHaveLength(3);
  });

  it("returns 500 on query error", async () => {
    authedUser();
    adminRole();
    mockGetActiveWorkflow.mockResolvedValue({ data: null, error: "DB error" });
    const { GET } = await import("@/app/api/admin/review/workflow/route");

    const response = await GET();
    expect(response.status).toBe(500);
  });
});

describe("PUT /api/admin/review/workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { PUT } = await import("@/app/api/admin/review/workflow/route");

    const response = await PUT(
      makePutRequest({ stages: [{ name: "A" }, { name: "B" }, { name: "C" }] })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-admin user", async () => {
    authedUser("user-1");
    submitterRole();
    const { PUT } = await import("@/app/api/admin/review/workflow/route");

    const response = await PUT(
      makePutRequest({ stages: [{ name: "A" }, { name: "B" }, { name: "C" }] })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 for invalid payload (too few stages)", async () => {
    authedUser();
    adminRole();
    const { PUT } = await import("@/app/api/admin/review/workflow/route");

    const response = await PUT(
      makePutRequest({ stages: [{ name: "Only One" }] })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("returns 400 for duplicate stage names", async () => {
    authedUser();
    adminRole();
    const { PUT } = await import("@/app/api/admin/review/workflow/route");

    const response = await PUT(
      makePutRequest({
        stages: [{ name: "Review" }, { name: "review" }, { name: "Final" }],
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
  });

  it("returns 200 with created workflow on success", async () => {
    authedUser();
    adminRole();
    mockCreateAndActivateWorkflow.mockResolvedValue({
      data: sampleWorkflow,
      error: null,
    });
    const { PUT } = await import("@/app/api/admin/review/workflow/route");

    const response = await PUT(
      makePutRequest({
        stages: [{ name: "Screening" }, { name: "Technical" }, { name: "Final" }],
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("wf-1");
    expect(body.stages).toHaveLength(3);
  });

  it("passes created_by as user id to createAndActivateWorkflow", async () => {
    authedUser("admin-42");
    adminRole();
    mockCreateAndActivateWorkflow.mockResolvedValue({
      data: sampleWorkflow,
      error: null,
    });
    const { PUT } = await import("@/app/api/admin/review/workflow/route");

    await PUT(
      makePutRequest({
        stages: [{ name: "A" }, { name: "B" }, { name: "C" }],
      })
    );

    expect(mockCreateAndActivateWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ created_by: "admin-42" })
    );
  });

  it("returns 500 on creation error", async () => {
    authedUser();
    adminRole();
    mockCreateAndActivateWorkflow.mockResolvedValue({
      data: null,
      error: "Creation failed",
    });
    const { PUT } = await import("@/app/api/admin/review/workflow/route");

    const response = await PUT(
      makePutRequest({
        stages: [{ name: "A" }, { name: "B" }, { name: "C" }],
      })
    );

    expect(response.status).toBe(500);
  });
});
