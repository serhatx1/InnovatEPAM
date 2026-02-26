import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetDraftCount = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  getDraftCount: (...args: unknown[]) => mockGetDraftCount(...args),
}));

// ── Helpers ─────────────────────────────────────────────

function authedUser(id = "user-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function makeRequest(): any {
  return {};
}

// ── GET /api/drafts/count ──────────────────────────────

describe("GET /api/drafts/count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { GET } = await import("@/app/api/drafts/count/route");
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns count 0 when user has no drafts", async () => {
    authedUser();
    mockGetDraftCount.mockResolvedValue({ count: 0, error: null });

    const { GET } = await import("@/app/api/drafts/count/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(0);
  });

  it("returns correct count for user with drafts", async () => {
    authedUser();
    mockGetDraftCount.mockResolvedValue({ count: 3, error: null });

    const { GET } = await import("@/app/api/drafts/count/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(3);
  });

  it("returns 500 on database error", async () => {
    authedUser();
    mockGetDraftCount.mockResolvedValue({ count: null, error: { message: "DB error" } });

    const { GET } = await import("@/app/api/drafts/count/route");
    const response = await GET();
    expect(response.status).toBe(500);
  });
});
