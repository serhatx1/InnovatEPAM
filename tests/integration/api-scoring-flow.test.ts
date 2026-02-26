import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetUserRole = vi.fn();
const mockGetIdeaById = vi.fn();
const mockGetAttachmentsByIdeaId = vi.fn();
const mockUpsertScore = vi.fn();
const mockGetScoresForIdea = vi.fn();
const mockGetScoreAggregateForIdea = vi.fn();
const mockGetBlindReviewEnabled = vi.fn();
const mockGetIdeaStageState = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: null, error: null })),
        })),
        in: vi.fn(async () => ({ data: [], error: null })),
      })),
    })),
  })),
}));

vi.mock("@/lib/queries", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
  getIdeaById: (...args: unknown[]) => mockGetIdeaById(...args),
  getAttachmentsByIdeaId: (...args: unknown[]) => mockGetAttachmentsByIdeaId(...args),
}));

vi.mock("@/lib/queries/idea-scores", () => ({
  upsertScore: (...args: unknown[]) => mockUpsertScore(...args),
  getScoresForIdea: (...args: unknown[]) => mockGetScoresForIdea(...args),
  getScoreAggregateForIdea: (...args: unknown[]) => mockGetScoreAggregateForIdea(...args),
  getScoreAggregatesForIdeas: vi.fn(async () => ({ data: new Map(), error: null })),
}));

vi.mock("@/lib/queries/portal-settings", () => ({
  getBlindReviewEnabled: (...args: unknown[]) => mockGetBlindReviewEnabled(...args),
}));

vi.mock("@/lib/queries/review-state", () => ({
  getIdeaStageState: (...args: unknown[]) => mockGetIdeaStageState(...args),
}));

vi.mock("@/lib/review/scoring-eligibility", () => ({
  checkScoringEligibility: vi.fn(async () => ({ eligible: true })),
}));

vi.mock("@/lib/supabase/storage", () => ({
  getAttachmentUrl: vi.fn().mockResolvedValue(null),
  getAttachmentDownloadUrl: vi.fn().mockResolvedValue(null),
}));

// ── Helpers ─────────────────────────────────────────────

const adminUser = { id: "admin-1" };
const evaluator2 = { id: "evaluator-2" };
const submitterUser = { id: "submitter-1" };

const sampleIdea = {
  id: "idea-1",
  user_id: "submitter-1",
  title: "Great Idea",
  description: "A test idea",
  category: "technology",
  category_fields: {},
  status: "under_review",
  attachment_url: null,
  evaluator_comment: null,
  deleted_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function makeScoreRow(evaluatorId: string, score: number, comment: string | null = null) {
  return {
    id: `score-${evaluatorId}`,
    idea_id: "idea-1",
    evaluator_id: evaluatorId,
    score,
    comment,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

// ── T031: Full scoring flow ─────────────────────────────

describe("Integration: Full Scoring Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("submit score → view aggregate → update score → verify updated aggregate", async () => {
    // Step 1: Admin submits score 4 with comment
    mockGetUser.mockResolvedValue({ data: { user: adminUser } });
    mockGetUserRole.mockResolvedValue("admin");

    const scoreRowV1 = makeScoreRow("admin-1", 4, "Good idea");
    mockUpsertScore.mockResolvedValue({ data: scoreRowV1, error: null });

    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const putRes = await PUT(
      { json: async () => ({ score: 4, comment: "Good idea" }) } as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const putBody = await putRes.json();
    expect(putRes.status).toBe(200);
    expect(putBody.score).toBe(4);
    expect(putBody.comment).toBe("Good idea");

    // Step 2: View aggregate via GET /api/ideas/[id]/scores
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: adminUser } });
    mockGetUserRole.mockResolvedValue("admin");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetScoresForIdea.mockResolvedValue({
      data: [scoreRowV1],
      error: null,
    });
    mockGetScoreAggregateForIdea.mockResolvedValue({
      data: { avgScore: 4, scoreCount: 1 },
      error: null,
    });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: false });
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: null }, error: null });

    const { GET: getScores } = await import("@/app/api/ideas/[id]/scores/route");
    const scoresRes = await getScores(
      new Request("http://localhost/api/ideas/idea-1/scores") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const scoresBody = await scoresRes.json();
    expect(scoresRes.status).toBe(200);
    expect(scoresBody.aggregate.avgScore).toBe(4);
    expect(scoresBody.aggregate.scoreCount).toBe(1);
    expect(scoresBody.scores).toHaveLength(1);

    // Step 3: Admin updates score to 5
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: adminUser } });
    mockGetUserRole.mockResolvedValue("admin");
    const scoreRowV2 = makeScoreRow("admin-1", 5, "Actually excellent");
    mockUpsertScore.mockResolvedValue({ data: scoreRowV2, error: null });

    const { PUT: PUT2 } = await import("@/app/api/ideas/[id]/score/route");
    const updateRes = await PUT2(
      { json: async () => ({ score: 5, comment: "Actually excellent" }) } as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const updateBody = await updateRes.json();
    expect(updateRes.status).toBe(200);
    expect(updateBody.score).toBe(5);

    // Step 4: View updated aggregate
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: adminUser } });
    mockGetUserRole.mockResolvedValue("admin");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetScoresForIdea.mockResolvedValue({
      data: [scoreRowV2],
      error: null,
    });
    mockGetScoreAggregateForIdea.mockResolvedValue({
      data: { avgScore: 5, scoreCount: 1 },
      error: null,
    });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: false });
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: null }, error: null });

    const { GET: getScores2 } = await import("@/app/api/ideas/[id]/scores/route");
    const updatedRes = await getScores2(
      new Request("http://localhost/api/ideas/idea-1/scores") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const updatedBody = await updatedRes.json();
    expect(updatedRes.status).toBe(200);
    expect(updatedBody.aggregate.avgScore).toBe(5);
  });
});

// ── T032: Scoring + Blind Review ────────────────────────

describe("Integration: Scoring with Blind Review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("blind review masks evaluator identity, toggling OFF reveals it", async () => {
    const score1 = makeScoreRow("admin-1", 4, "Nice");
    const score2 = makeScoreRow("evaluator-2", 3, null);

    // Step 1: Submitter views scores with blind review ON → evaluator names masked
    mockGetUser.mockResolvedValue({ data: { user: submitterUser } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetScoresForIdea.mockResolvedValue({
      data: [score1, score2],
      error: null,
    });
    mockGetScoreAggregateForIdea.mockResolvedValue({
      data: { avgScore: 3.5, scoreCount: 2 },
      error: null,
    });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true });
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: null }, error: null });

    const { GET } = await import("@/app/api/ideas/[id]/scores/route");
    const res1 = await GET(
      new Request("http://localhost/api/ideas/idea-1/scores") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const body1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(body1.aggregate.avgScore).toBe(3.5);
    // Evaluator identities should be masked
    for (const score of body1.scores) {
      expect(score.evaluatorId).toBe("anonymous");
      expect(score.evaluatorDisplayName).toBe("Anonymous Evaluator");
    }

    // Step 2: Toggle blind review OFF → evaluator names revealed
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: submitterUser } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetScoresForIdea.mockResolvedValue({
      data: [score1, score2],
      error: null,
    });
    mockGetScoreAggregateForIdea.mockResolvedValue({
      data: { avgScore: 3.5, scoreCount: 2 },
      error: null,
    });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: false });
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: null }, error: null });

    const { GET: GET2 } = await import("@/app/api/ideas/[id]/scores/route");
    const res2 = await GET2(
      new Request("http://localhost/api/ideas/idea-1/scores") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const body2 = await res2.json();
    expect(res2.status).toBe(200);
    // Evaluator IDs should be revealed
    const evalIds = body2.scores.map((s: { evaluatorId: string }) => s.evaluatorId);
    expect(evalIds).toContain("admin-1");
    expect(evalIds).toContain("evaluator-2");
  });
});

// ── T033: Terminal & Self-Score Prevention ───────────────

describe("Integration: Terminal Idea Block and Self-Score Prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("blocks scoring on terminal idea", async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } });
    mockGetUserRole.mockResolvedValue("admin");

    // Override eligibility check to return terminal blocked
    vi.doMock("@/lib/review/scoring-eligibility", () => ({
      checkScoringEligibility: vi.fn(async () => ({
        eligible: false,
        reason: "Scoring is closed — idea has reached a terminal outcome.",
        status: 403,
      })),
    }));

    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const res = await PUT(
      { json: async () => ({ score: 4 }) } as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toContain("terminal");
  });

  it("blocks self-scoring", async () => {
    // Submitter tries to score own idea
    mockGetUser.mockResolvedValue({ data: { user: submitterUser } });
    mockGetUserRole.mockResolvedValue("admin"); // even if admin role

    vi.doMock("@/lib/review/scoring-eligibility", () => ({
      checkScoringEligibility: vi.fn(async () => ({
        eligible: false,
        reason: "You cannot score your own idea.",
        status: 403,
      })),
    }));

    const { PUT } = await import("@/app/api/ideas/[id]/score/route");
    const res = await PUT(
      { json: async () => ({ score: 3 }) } as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toContain("cannot score");
  });
});
