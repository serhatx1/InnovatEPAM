import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkScoringEligibility } from "@/lib/review/scoring-eligibility";

// ── Mock Supabase ───────────────────────────────────────

function createMockSupabase() {
  const mockChain: Record<string, ReturnType<typeof vi.fn>> = {};

  // We need separate chains for "idea" and "idea_stage_state" tables
  const ideaChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };

  const stageChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };

  const from = vi.fn((table: string) => {
    if (table === "idea") return ideaChain;
    if (table === "idea_stage_state") return stageChain;
    return ideaChain;
  });

  return { from, _ideaChain: ideaChain, _stageChain: stageChain };
}

// ── Tests ───────────────────────────────────────────────

describe("checkScoringEligibility", () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it("returns eligible when all conditions met", async () => {
    supabase._ideaChain.maybeSingle.mockResolvedValue({
      data: { id: "idea-1", user_id: "submitter-1", deleted_at: null },
      error: null,
    });
    supabase._stageChain.maybeSingle.mockResolvedValue({
      data: { terminal_outcome: null },
      error: null,
    });

    const result = await checkScoringEligibility(supabase as any, "idea-1", "eval-1");
    expect(result.eligible).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns not eligible when idea not found", async () => {
    supabase._ideaChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await checkScoringEligibility(supabase as any, "missing", "eval-1");
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("Idea not found");
    expect(result.status).toBe(404);
  });

  it("returns not eligible when idea is soft-deleted", async () => {
    supabase._ideaChain.maybeSingle.mockResolvedValue({
      data: { id: "idea-1", user_id: "submitter-1", deleted_at: "2026-01-01" },
      error: null,
    });

    const result = await checkScoringEligibility(supabase as any, "idea-1", "eval-1");
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("Idea not found");
    expect(result.status).toBe(404);
  });

  it("allows self-scoring (evaluator is submitter)", async () => {
    supabase._ideaChain.maybeSingle.mockResolvedValue({
      data: { id: "idea-1", user_id: "eval-1", deleted_at: null },
      error: null,
    });
    supabase._stageChain.maybeSingle.mockResolvedValue({
      data: { terminal_outcome: null },
      error: null,
    });

    const result = await checkScoringEligibility(supabase as any, "idea-1", "eval-1");
    expect(result.eligible).toBe(true);
  });

  it("blocks scoring when idea has terminal outcome", async () => {
    supabase._ideaChain.maybeSingle.mockResolvedValue({
      data: { id: "idea-1", user_id: "submitter-1", deleted_at: null },
      error: null,
    });
    supabase._stageChain.maybeSingle.mockResolvedValue({
      data: { terminal_outcome: "accepted" },
      error: null,
    });

    const result = await checkScoringEligibility(supabase as any, "idea-1", "eval-1");
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("Idea has reached a terminal outcome");
    expect(result.status).toBe(403);
  });

  it("blocks scoring when idea has no stage state (not under review)", async () => {
    supabase._ideaChain.maybeSingle.mockResolvedValue({
      data: { id: "idea-1", user_id: "submitter-1", deleted_at: null },
      error: null,
    });
    supabase._stageChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await checkScoringEligibility(supabase as any, "idea-1", "eval-1");
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("Idea is not under review");
    expect(result.status).toBe(400);
  });

  it("blocks scoring when idea query errors", async () => {
    supabase._ideaChain.maybeSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });

    const result = await checkScoringEligibility(supabase as any, "idea-1", "eval-1");
    expect(result.eligible).toBe(false);
    expect(result.status).toBe(404);
  });
});
