import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockGetUserRole = vi.fn();
vi.mock("@/lib/queries", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
}));

const mockUpsertScore = vi.fn();
vi.mock("@/lib/queries/idea-scores", () => ({
  upsertScore: (...args: unknown[]) => mockUpsertScore(...args),
}));

const mockCheckScoringEligibility = vi.fn();
vi.mock("@/lib/review/scoring-eligibility", () => ({
  checkScoringEligibility: (...args: unknown[]) =>
    mockCheckScoringEligibility(...args),
}));

vi.mock("@/lib/validation/score", async () => {
  const actual = await vi.importActual("@/lib/validation/score");
  return actual;
});

// ── Helpers ─────────────────────────────────────────────

function authedAdmin(id = "admin-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
  mockGetUserRole.mockResolvedValue("admin");
}

function eligibleResult() {
  mockCheckScoringEligibility.mockResolvedValue({ eligible: true });
}

// ── Tests — branches not covered by api-idea-score.test.ts ──

describe("PUT /api/ideas/[id]/score — extra branches", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when request body is invalid JSON", async () => {
    authedAdmin();
    const { PUT } = await import("@/app/api/ideas/[id]/score/route");

    // Simulate a request whose .json() throws (invalid JSON)
    const badRequest = {
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    } as any;

    const res = await PUT(badRequest, {
      params: Promise.resolve({ id: "idea-1" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toContain("Invalid JSON");
  });

  it("returns 500 when upsertScore returns error string", async () => {
    authedAdmin();
    eligibleResult();
    mockUpsertScore.mockResolvedValue({
      data: null,
      error: "DB write failed",
    });

    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const res = await PUT(
      { json: async () => ({ score: 4, comment: "Good" }) } as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("DB write failed");
  });

  it("returns 500 when upsertScore returns null data with no error string", async () => {
    authedAdmin();
    eligibleResult();
    mockUpsertScore.mockResolvedValue({
      data: null,
      error: null,
    });

    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const res = await PUT(
      { json: async () => ({ score: 3 }) } as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to save score");
  });

  it("returns eligibility error with status when eligibility.status is defined", async () => {
    authedAdmin();
    mockCheckScoringEligibility.mockResolvedValue({
      eligible: false,
      reason: "Not eligible",
      status: 409,
    });

    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const res = await PUT(
      { json: async () => ({ score: 4 }) } as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Not eligible");
  });

  it("returns 403 fallback when eligibility.status is undefined", async () => {
    authedAdmin();
    mockCheckScoringEligibility.mockResolvedValue({
      eligible: false,
      reason: "Blocked",
    });

    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const res = await PUT(
      { json: async () => ({ score: 4 }) } as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    expect(res.status).toBe(403);
  });
});
