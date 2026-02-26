import { describe, it, expect, vi, beforeEach } from "vitest";
import { upsertScore, getScoresForIdea, getScoreAggregateForIdea, getScoreAggregatesForIdeas } from "@/lib/queries/idea-scores";

// ── Mock Supabase ───────────────────────────────────────

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    ...overrides,
  };
  // Make all chain methods return the chain itself (fluent API)
  for (const key of Object.keys(chain)) {
    if (typeof chain[key] === "function" && !overrides[key]) {
      (chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    }
  }
  return chain as unknown as ReturnType<typeof vi.fn> & Record<string, ReturnType<typeof vi.fn>>;
}

// ── upsertScore ─────────────────────────────────────────

describe("upsertScore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts a new score and returns it", async () => {
    const scoreRow = {
      id: "score-1",
      idea_id: "idea-1",
      evaluator_id: "eval-1",
      score: 4,
      comment: "Good idea",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const supabase = createMockSupabase({
      single: vi.fn().mockResolvedValue({ data: scoreRow, error: null }),
    });

    const result = await upsertScore(supabase as any, {
      idea_id: "idea-1",
      evaluator_id: "eval-1",
      score: 4,
      comment: "Good idea",
    });

    expect(result.data).toEqual(scoreRow);
    expect(result.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith("idea_score");
    expect(supabase.upsert).toHaveBeenCalled();
  });

  it("upserts (update) an existing score", async () => {
    const updatedRow = {
      id: "score-1",
      idea_id: "idea-1",
      evaluator_id: "eval-1",
      score: 3,
      comment: "Revised",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    };

    const supabase = createMockSupabase({
      single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
    });

    const result = await upsertScore(supabase as any, {
      idea_id: "idea-1",
      evaluator_id: "eval-1",
      score: 3,
      comment: "Revised",
    });

    expect(result.data?.score).toBe(3);
    expect(result.error).toBeNull();
  });

  it("returns error on Supabase failure", async () => {
    const supabase = createMockSupabase({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
    });

    const result = await upsertScore(supabase as any, {
      idea_id: "idea-1",
      evaluator_id: "eval-1",
      score: 4,
      comment: null,
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe("DB error");
  });
});

// ── getScoresForIdea ────────────────────────────────────

describe("getScoresForIdea", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns scores for an idea", async () => {
    const scores = [
      { id: "s1", idea_id: "idea-1", evaluator_id: "e1", score: 4, comment: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      { id: "s2", idea_id: "idea-1", evaluator_id: "e2", score: 5, comment: "Great", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
    ];

    const supabase = createMockSupabase({
      order: vi.fn().mockResolvedValue({ data: scores, error: null }),
    });

    const result = await getScoresForIdea(supabase as any, "idea-1");
    expect(result.data).toHaveLength(2);
    expect(result.error).toBeNull();
  });

  it("returns empty array when no scores exist", async () => {
    const supabase = createMockSupabase({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const result = await getScoresForIdea(supabase as any, "idea-1");
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});

// ── getScoreAggregateForIdea ────────────────────────────

describe("getScoreAggregateForIdea", () => {
  beforeEach(() => vi.clearAllMocks());

  it("computes average and count for an idea", async () => {
    const scores = [{ score: 3 }, { score: 4 }, { score: 5 }];

    const supabase = createMockSupabase({
      eq: vi.fn().mockResolvedValue({ data: scores, error: null }),
    });

    const result = await getScoreAggregateForIdea(supabase as any, "idea-1");
    expect(result.data.avgScore).toBe(4);
    expect(result.data.scoreCount).toBe(3);
    expect(result.error).toBeNull();
  });

  it("returns null avgScore and 0 count when no scores", async () => {
    const supabase = createMockSupabase({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const result = await getScoreAggregateForIdea(supabase as any, "idea-1");
    expect(result.data.avgScore).toBeNull();
    expect(result.data.scoreCount).toBe(0);
  });

  it("rounds to one decimal", async () => {
    const scores = [{ score: 3 }, { score: 4 }]; // avg = 3.5

    const supabase = createMockSupabase({
      eq: vi.fn().mockResolvedValue({ data: scores, error: null }),
    });

    const result = await getScoreAggregateForIdea(supabase as any, "idea-1");
    expect(result.data.avgScore).toBe(3.5);
  });
});

// ── getScoreAggregatesForIdeas ──────────────────────────

describe("getScoreAggregatesForIdeas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns aggregates for multiple ideas", async () => {
    const rows = [
      { idea_id: "idea-1", score: 3 },
      { idea_id: "idea-1", score: 5 },
      { idea_id: "idea-2", score: 4 },
    ];

    const supabase = createMockSupabase({
      in: vi.fn().mockResolvedValue({ data: rows, error: null }),
    });

    const result = await getScoreAggregatesForIdeas(supabase as any, ["idea-1", "idea-2", "idea-3"]);
    expect(result.data.get("idea-1")).toEqual({ avgScore: 4, scoreCount: 2 });
    expect(result.data.get("idea-2")).toEqual({ avgScore: 4, scoreCount: 1 });
    expect(result.data.get("idea-3")).toEqual({ avgScore: null, scoreCount: 0 });
  });

  it("returns empty map for empty ID list", async () => {
    const supabase = createMockSupabase();
    const result = await getScoreAggregatesForIdeas(supabase as any, []);
    expect(result.data.size).toBe(0);
  });
});
