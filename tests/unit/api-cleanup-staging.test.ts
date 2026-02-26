import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const mockCleanupOrphanedStagedFiles = vi.fn();
vi.mock("@/lib/supabase/storage", () => ({
  cleanupOrphanedStagedFiles: (...args: unknown[]) =>
    mockCleanupOrphanedStagedFiles(...args),
}));

// ── Helpers ─────────────────────────────────────────────

function authedAdmin(id = "admin-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
      }),
    }),
  });
}

function authedSubmitter(id = "user-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { role: "submitter" }, error: null }),
      }),
    }),
  });
}

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

// ── Tests ───────────────────────────────────────────────

describe("POST /api/admin/cleanup-staging", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for unauthenticated user", async () => {
    unauthenticated();
    const { POST } = await import("@/app/api/admin/cleanup-staging/route");
    const res = await POST();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-admin user", async () => {
    authedSubmitter();
    const { POST } = await import("@/app/api/admin/cleanup-staging/route");
    const res = await POST();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 when profile is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    const { POST } = await import("@/app/api/admin/cleanup-staging/route");
    const res = await POST();
    expect(res.status).toBe(403);
  });

  it("returns 200 with cleanup result on success", async () => {
    authedAdmin();
    mockCleanupOrphanedStagedFiles.mockResolvedValue({
      deleted: 5,
      errors: [],
    });
    const { POST } = await import("@/app/api/admin/cleanup-staging/route");
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Staging cleanup complete");
    expect(body.deleted).toBe(5);
  });

  it("returns 500 when cleanup throws an Error", async () => {
    authedAdmin();
    mockCleanupOrphanedStagedFiles.mockRejectedValue(
      new Error("Storage unavailable")
    );
    const { POST } = await import("@/app/api/admin/cleanup-staging/route");
    const res = await POST();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Storage unavailable");
  });

  it("returns 500 with generic message when cleanup throws non-Error", async () => {
    authedAdmin();
    mockCleanupOrphanedStagedFiles.mockRejectedValue("string-error");
    const { POST } = await import("@/app/api/admin/cleanup-staging/route");
    const res = await POST();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Cleanup failed");
  });
});
