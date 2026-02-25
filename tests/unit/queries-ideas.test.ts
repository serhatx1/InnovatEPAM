import { describe, it, expect, vi, beforeEach } from "vitest";
import { listIdeas, getIdeaById, createIdea, updateIdeaStatus, ideaExists } from "@/lib/queries/ideas";

// Mock Supabase client
function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };

  return {
    from: vi.fn().mockReturnValue(chainable),
    _chainable: chainable,
  };
}

describe("listIdeas", () => {
  it("returns ordered results", async () => {
    const ideas = [
      { id: "1", title: "Newer", created_at: "2026-02-24" },
      { id: "2", title: "Older", created_at: "2026-02-23" },
    ];

    const chainable = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: ideas, error: null }),
      eq: vi.fn().mockReturnThis(),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await listIdeas(supabase);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data[0].title).toBe("Newer");
    expect(supabase.from).toHaveBeenCalledWith("idea");
    expect(chainable.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("scopes by userId when provided", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    await listIdeas(supabase, { userId: "user-123" });

    expect(chainable.eq).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("returns empty array on null data", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data } = await listIdeas(supabase);
    expect(data).toEqual([]);
  });

  it("returns error message on failure", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
      eq: vi.fn().mockReturnThis(),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { error } = await listIdeas(supabase);
    expect(error).toBe("DB error");
  });
});

describe("getIdeaById", () => {
  it("returns the idea when found", async () => {
    const idea = { id: "abc", title: "Test" };
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: idea, error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await getIdeaById(supabase, "abc");
    expect(error).toBeNull();
    expect(data).toEqual(idea);
  });

  it("returns null when not found", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await getIdeaById(supabase, "nonexistent");
    expect(data).toBeNull();
    expect(error).toBe("Not found");
  });
});

describe("createIdea", () => {
  it("returns the created idea", async () => {
    const newIdea = {
      id: "new-1",
      title: "New Idea",
      status: "submitted",
    };

    const chainable = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newIdea, error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await createIdea(supabase, {
      user_id: "user-1",
      title: "New Idea",
      description: "A great new idea for testing",
      category: "Process Improvement",
      attachment_url: null,
    });

    expect(error).toBeNull();
    expect(data).toEqual(newIdea);
    expect(chainable.insert).toHaveBeenCalled();
  });

  it("returns error message on database failure", async () => {
    const chainable = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Unique constraint violation" },
      }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await createIdea(supabase, {
      user_id: "user-1",
      title: "Duplicate Idea",
      description: "This should fail",
      category: "Process Improvement",
      attachment_url: null,
    });

    expect(data).toBeNull();
    expect(error).toBe("Unique constraint violation");
  });
});

describe("updateIdeaStatus", () => {
  it("updates status and evaluator_comment", async () => {
    const updated = {
      id: "idea-1",
      status: "accepted",
      evaluator_comment: "Looks good!",
    };

    const chainable = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await updateIdeaStatus(supabase, "idea-1", {
      status: "accepted",
      evaluator_comment: "Looks good!",
    });

    expect(error).toBeNull();
    expect(data!.status).toBe("accepted");
    expect(data!.evaluator_comment).toBe("Looks good!");
  });

  it("returns error message on database failure", async () => {
    const chainable = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Row not found" },
      }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await updateIdeaStatus(supabase, "nonexistent", {
      status: "accepted",
    });

    expect(data).toBeNull();
    expect(error).toBe("Row not found");
  });
});

describe("ideaExists", () => {
  it("returns true when idea exists", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "abc" }, error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const result = await ideaExists(supabase, "abc");
    expect(result).toBe(true);
  });

  it("returns false when idea does not exist", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const result = await ideaExists(supabase, "nonexistent");
    expect(result).toBe(false);
  });
});
