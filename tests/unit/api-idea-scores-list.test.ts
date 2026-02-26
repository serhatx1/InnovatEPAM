import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSelectIn = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: mockSelectIn,
    })),
  })),
}));

const mockGetUserRole = vi.fn();
const mockGetIdeaById = vi.fn();
vi.mock("@/lib/queries", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
  getIdeaById: (...args: unknown[]) => mockGetIdeaById(...args),
}));

const mockGetScoresForIdea = vi.fn();
const mockGetScoreAggregateForIdea = vi.fn();
vi.mock("@/lib/queries/idea-scores", () => ({
  getScoresForIdea: (...args: unknown[]) => mockGetScoresForIdea(...args),
  getScoreAggregateForIdea: (...args: unknown[]) => mockGetScoreAggregateForIdea(...args),
}));

vi.mock("@/lib/queries/portal-settings", () => ({
  getBlindReviewEnabled: vi.fn(async () => ({ enabled: false, updatedBy: null, updatedAt: null })),
}));

const mockGetIdeaStageState = vi.fn();
vi.mock("@/lib/queries/review-state", () => ({
  getIdeaStageState: (...args: unknown[]) => mockGetIdeaStageState(...args),
}));

vi.mock("@/lib/review/score-anonymize", async () => {
  const actual = await vi.importActual("@/lib/review/score-anonymize");
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

function makeRequest(id: string) {
  return [
    {} as any,
    { params: Promise.resolve({ id }) },
  ] as const;
}

function setupIdea(id = "idea-1", userId = "user-1") {
  mockGetIdeaById.mockResolvedValue({
    data: { id, user_id: userId, deleted_at: null },
    error: null,
  });
}

function setupScores(scores = [], aggregate = { avgScore: null, scoreCount: 0 }) {
  mockGetScoresForIdea.mockResolvedValue({ data: scores, error: null });
  mockGetScoreAggregateForIdea.mockResolvedValue({ data: aggregate, error: null });
}

function setupStageState(terminalOutcome: string | null = null) {
  mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: terminalOutcome }, error: null });
}

// ── Tests ───────────────────────────────────────────────

describe("GET /api/ideas/[id]/scores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectIn.mockResolvedValue({ data: [], error: null });
    setupStageState(null);
  });

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { GET } = await import("@/app/api/ideas/[id]/scores/route");
    const response = await GET(...makeRequest("idea-1"));
    expect(response.status).toBe(401);
  });

  it("returns 404 when idea not found", async () => {
    authedAdmin();
    mockGetIdeaById.mockResolvedValue({ data: null, error: "Not found" });
    const { GET } = await import("@/app/api/ideas/[id]/scores/route");
    const response = await GET(...makeRequest("missing"));
    expect(response.status).toBe(404);
  });

  it("returns 403 when submitter views other user's idea", async () => {
    authedSubmitter("user-2");
    setupIdea("idea-1", "user-1"); // Different owner
    const { GET } = await import("@/app/api/ideas/[id]/scores/route");
    const response = await GET(...makeRequest("idea-1"));
    expect(response.status).toBe(403);
  });

  it("returns scores and aggregate for admin", async () => {
    authedAdmin();
    setupIdea("idea-1", "user-1");
    setupScores(
      [
        { id: "s1", idea_id: "idea-1", evaluator_id: "admin-1", score: 4, comment: "Nice", created_at: "2026-01-01", updated_at: "2026-01-01" },
      ],
      { avgScore: 4, scoreCount: 1 }
    );

    const { GET } = await import("@/app/api/ideas/[id]/scores/route");
    const response = await GET(...makeRequest("idea-1"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.aggregate.avgScore).toBe(4);
    expect(body.aggregate.scoreCount).toBe(1);
    expect(body.scores).toHaveLength(1);
    expect(body.myScore).toBeDefined();
    expect(body.myScore.score).toBe(4);
  });

  it("returns empty state when no scores exist", async () => {
    authedAdmin();
    setupIdea("idea-1", "user-1");
    setupScores([], { avgScore: null, scoreCount: 0 });

    const { GET } = await import("@/app/api/ideas/[id]/scores/route");
    const response = await GET(...makeRequest("idea-1"));
    const body = await response.json();

    expect(body.aggregate.avgScore).toBeNull();
    expect(body.aggregate.scoreCount).toBe(0);
    expect(body.scores).toHaveLength(0);
    expect(body.myScore).toBeNull();
  });

  it("allows submitter to view scores on their own idea", async () => {
    authedSubmitter("user-1");
    setupIdea("idea-1", "user-1"); // Same owner
    setupScores([], { avgScore: null, scoreCount: 0 });

    const { GET } = await import("@/app/api/ideas/[id]/scores/route");
    const response = await GET(...makeRequest("idea-1"));
    expect(response.status).toBe(200);
  });
});
