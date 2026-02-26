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
  checkScoringEligibility: (...args: unknown[]) => mockCheckScoringEligibility(...args),
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

function authedSubmitter(id = "user-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
  mockGetUserRole.mockResolvedValue("submitter");
}

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function makeRequest(id: string, body: unknown) {
  return [
    { json: async () => body } as any,
    { params: Promise.resolve({ id }) },
  ] as const;
}

function eligibleResult() {
  mockCheckScoringEligibility.mockResolvedValue({ eligible: true });
}

// ── Tests ───────────────────────────────────────────────

describe("PUT /api/ideas/[id]/score", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const response = await PUT(...makeRequest("idea-1", { score: 4 }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for non-admin (submitter) role", async () => {
    authedSubmitter();
    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const response = await PUT(...makeRequest("idea-1", { score: 4 }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 when score validation fails (out of range)", async () => {
    authedAdmin();
    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const response = await PUT(...makeRequest("idea-1", { score: 10 }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("returns 400 when score is missing", async () => {
    authedAdmin();
    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const response = await PUT(...makeRequest("idea-1", {}));
    expect(response.status).toBe(400);
  });

  it("returns 403 when scoring own idea (self-score blocked)", async () => {
    authedAdmin();
    mockCheckScoringEligibility.mockResolvedValue({
      eligible: false,
      reason: "Cannot score own idea",
      status: 403,
    });
    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const response = await PUT(...makeRequest("idea-1", { score: 4 }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Cannot score own idea");
  });

  it("returns 403 when idea has terminal outcome", async () => {
    authedAdmin();
    mockCheckScoringEligibility.mockResolvedValue({
      eligible: false,
      reason: "Idea has reached a terminal outcome",
      status: 403,
    });
    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const response = await PUT(...makeRequest("idea-1", { score: 4 }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Idea has reached a terminal outcome");
  });

  it("returns 404 when idea does not exist", async () => {
    authedAdmin();
    mockCheckScoringEligibility.mockResolvedValue({
      eligible: false,
      reason: "Idea not found",
      status: 404,
    });
    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const response = await PUT(...makeRequest("missing", { score: 4 }));
    expect(response.status).toBe(404);
  });

  it("returns 200 with score on successful submission", async () => {
    authedAdmin();
    eligibleResult();
    mockUpsertScore.mockResolvedValue({
      data: {
        id: "score-1",
        idea_id: "idea-1",
        evaluator_id: "admin-1",
        score: 4,
        comment: "Nice",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });

    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const response = await PUT(...makeRequest("idea-1", { score: 4, comment: "Nice" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.score).toBe(4);
    expect(body.ideaId).toBe("idea-1");
    expect(body.evaluatorId).toBe("admin-1");
  });

  it("returns 200 with updated score on upsert", async () => {
    authedAdmin();
    eligibleResult();
    mockUpsertScore.mockResolvedValue({
      data: {
        id: "score-1",
        idea_id: "idea-1",
        evaluator_id: "admin-1",
        score: 3,
        comment: "Revised",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
      error: null,
    });

    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const response = await PUT(...makeRequest("idea-1", { score: 3, comment: "Revised" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.score).toBe(3);
  });
});
