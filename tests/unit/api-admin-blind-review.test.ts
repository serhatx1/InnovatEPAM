import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetUserRole = vi.fn();
const mockGetBlindReviewEnabled = vi.fn();
const mockSetBlindReviewEnabled = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
}));

vi.mock("@/lib/queries/portal-settings", () => ({
  getBlindReviewEnabled: (...args: unknown[]) => mockGetBlindReviewEnabled(...args),
  setBlindReviewEnabled: (...args: unknown[]) => mockSetBlindReviewEnabled(...args),
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

// ── GET Tests ──────────────────────────────────────────

describe("GET /api/admin/settings/blind-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { GET } = await import("@/app/api/admin/settings/blind-review/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-admin user", async () => {
    authedUser("user-1");
    submitterRole();
    const { GET } = await import("@/app/api/admin/settings/blind-review/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns current setting for admin", async () => {
    authedUser();
    adminRole();
    mockGetBlindReviewEnabled.mockResolvedValue({
      enabled: true,
      updatedBy: "admin-1",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    const { GET } = await import("@/app/api/admin/settings/blind-review/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.enabled).toBe(true);
    expect(body.updatedBy).toBe("admin-1");
    expect(body.updatedAt).toBe("2026-01-01T00:00:00Z");
  });

  it("returns default (false) when no setting exists", async () => {
    authedUser();
    adminRole();
    mockGetBlindReviewEnabled.mockResolvedValue({
      enabled: false,
      updatedBy: null,
      updatedAt: null,
    });
    const { GET } = await import("@/app/api/admin/settings/blind-review/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.enabled).toBe(false);
    expect(body.updatedBy).toBeNull();
  });
});

// ── PUT Tests ──────────────────────────────────────────

describe("PUT /api/admin/settings/blind-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { PUT } = await import("@/app/api/admin/settings/blind-review/route");

    const response = await PUT(makePutRequest({ enabled: true }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-admin user", async () => {
    authedUser("user-1");
    submitterRole();
    const { PUT } = await import("@/app/api/admin/settings/blind-review/route");

    const response = await PUT(makePutRequest({ enabled: true }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 for invalid input (missing enabled)", async () => {
    authedUser();
    adminRole();
    const { PUT } = await import("@/app/api/admin/settings/blind-review/route");

    const response = await PUT(makePutRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 for invalid input (non-boolean)", async () => {
    authedUser();
    adminRole();
    const { PUT } = await import("@/app/api/admin/settings/blind-review/route");

    const response = await PUT(makePutRequest({ enabled: "yes" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
  });

  it("enables blind review and returns updated setting", async () => {
    authedUser();
    adminRole();
    mockSetBlindReviewEnabled.mockResolvedValue({
      data: { enabled: true, updatedBy: "admin-1", updatedAt: "2026-02-01T00:00:00Z" },
      error: null,
    });
    const { PUT } = await import("@/app/api/admin/settings/blind-review/route");

    const response = await PUT(makePutRequest({ enabled: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.enabled).toBe(true);
    expect(body.updatedBy).toBe("admin-1");
  });

  it("disables blind review and returns updated setting", async () => {
    authedUser();
    adminRole();
    mockSetBlindReviewEnabled.mockResolvedValue({
      data: { enabled: false, updatedBy: "admin-1", updatedAt: "2026-02-01T01:00:00Z" },
      error: null,
    });
    const { PUT } = await import("@/app/api/admin/settings/blind-review/route");

    const response = await PUT(makePutRequest({ enabled: false }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.enabled).toBe(false);
  });

  it("returns 500 on database error", async () => {
    authedUser();
    adminRole();
    mockSetBlindReviewEnabled.mockResolvedValue({
      data: null,
      error: "DB write failed",
    });
    const { PUT } = await import("@/app/api/admin/settings/blind-review/route");

    const response = await PUT(makePutRequest({ enabled: true }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("DB write failed");
  });
});
