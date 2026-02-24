import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listIdeas,
  getIdeaById,
  createIdea,
  updateIdeaStatus,
  ideaExists,
} from "@/lib/queries/ideas";
import type { Idea } from "@/types";

// ── Mock Supabase Client ──────────────────────────────

function createMockSupabase() {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockOrder = vi.fn();
  const mockSingle = vi.fn();

  // Chain builder pattern
  const chain: any = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
  };

  // Make all methods return chain for chaining
  mockSelect.mockReturnValue(chain);
  mockInsert.mockReturnValue(chain);
  mockUpdate.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockOrder.mockReturnValue(chain);

  const mockFrom = vi.fn().mockReturnValue(chain);

  return {
    from: mockFrom,
    _chain: chain,
    _mocks: { mockSelect, mockInsert, mockUpdate, mockEq, mockOrder, mockSingle, mockFrom },
  };
}

const sampleIdea: Idea = {
  id: "idea-1",
  user_id: "user-1",
  title: "Test Idea",
  description: "A test idea description that is long enough",
  category: "Technology Innovation",
  status: "submitted",
  attachment_url: null,
  evaluator_comment: null,
  created_at: "2026-02-24T10:00:00Z",
  updated_at: "2026-02-24T10:00:00Z",
};

// ── listIdeas ─────────────────────────────────────────

describe("listIdeas", () => {
  it("returns ideas ordered by newest first", async () => {
    const supabase = createMockSupabase();
    supabase._mocks.mockOrder.mockResolvedValue({
      data: [sampleIdea],
      error: null,
    });

    const { data, error } = await listIdeas(supabase as any);

    expect(supabase.from).toHaveBeenCalledWith("idea");
    expect(supabase._mocks.mockSelect).toHaveBeenCalledWith("*");
    expect(supabase._mocks.mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(data).toEqual([sampleIdea]);
    expect(error).toBeNull();
  });

  it("scopes to userId when provided", async () => {
    const supabase = createMockSupabase();
    supabase._mocks.mockEq.mockResolvedValue({
      data: [sampleIdea],
      error: null,
    });

    await listIdeas(supabase as any, { userId: "user-1" });

    expect(supabase._mocks.mockEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("returns empty array on error", async () => {
    const supabase = createMockSupabase();
    supabase._mocks.mockOrder.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const { data, error } = await listIdeas(supabase as any);

    expect(data).toEqual([]);
    expect(error).toBe("DB error");
  });
});

// ── getIdeaById ───────────────────────────────────────

describe("getIdeaById", () => {
  it("returns a single idea", async () => {
    const supabase = createMockSupabase();
    supabase._mocks.mockSingle.mockResolvedValue({
      data: sampleIdea,
      error: null,
    });

    const { data, error } = await getIdeaById(supabase as any, "idea-1");

    expect(supabase.from).toHaveBeenCalledWith("idea");
    expect(supabase._mocks.mockEq).toHaveBeenCalledWith("id", "idea-1");
    expect(data).toEqual(sampleIdea);
    expect(error).toBeNull();
  });

  it("returns null when idea not found", async () => {
    const supabase = createMockSupabase();
    supabase._mocks.mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const { data, error } = await getIdeaById(supabase as any, "nonexistent");

    expect(data).toBeNull();
    expect(error).toBe("Not found");
  });
});

// ── createIdea ────────────────────────────────────────

describe("createIdea", () => {
  it("inserts and returns the created idea", async () => {
    const supabase = createMockSupabase();
    supabase._mocks.mockSingle.mockResolvedValue({
      data: sampleIdea,
      error: null,
    });

    const input = {
      user_id: "user-1",
      title: "Test Idea",
      description: "A test idea description that is long enough",
      category: "Technology Innovation",
      attachment_url: null,
    };

    const { data, error } = await createIdea(supabase as any, input);

    expect(supabase.from).toHaveBeenCalledWith("idea");
    expect(supabase._mocks.mockInsert).toHaveBeenCalledWith(input);
    expect(data).toEqual(sampleIdea);
    expect(error).toBeNull();
  });
});

// ── updateIdeaStatus ──────────────────────────────────

describe("updateIdeaStatus", () => {
  it("updates status and evaluator_comment", async () => {
    const supabase = createMockSupabase();
    const updatedIdea = { ...sampleIdea, status: "accepted", evaluator_comment: "Great!" };
    supabase._mocks.mockSingle.mockResolvedValue({
      data: updatedIdea,
      error: null,
    });

    const { data, error } = await updateIdeaStatus(supabase as any, "idea-1", {
      status: "accepted",
      evaluator_comment: "Great!",
    });

    expect(supabase.from).toHaveBeenCalledWith("idea");
    expect(supabase._mocks.mockUpdate).toHaveBeenCalledWith({
      status: "accepted",
      evaluator_comment: "Great!",
    });
    expect(supabase._mocks.mockEq).toHaveBeenCalledWith("id", "idea-1");
    expect(data).toEqual(updatedIdea);
    expect(error).toBeNull();
  });
});

// ── ideaExists ────────────────────────────────────────

describe("ideaExists", () => {
  it("returns true when idea exists", async () => {
    const supabase = createMockSupabase();
    supabase._mocks.mockSingle.mockResolvedValue({
      data: { id: "idea-1" },
      error: null,
    });

    const exists = await ideaExists(supabase as any, "idea-1");
    expect(exists).toBe(true);
  });

  it("returns false when idea does not exist", async () => {
    const supabase = createMockSupabase();
    supabase._mocks.mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const exists = await ideaExists(supabase as any, "nonexistent");
    expect(exists).toBe(false);
  });
});
