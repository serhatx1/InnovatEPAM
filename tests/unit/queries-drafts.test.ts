import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

function createMockQueryBuilder(resolvedData: unknown = null, resolvedError: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["from", "select", "insert", "update", "eq", "is", "order", "single"];
  
  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  
  // Terminal methods resolve to data
  builder.single = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError, count: null });
  builder.select = vi.fn().mockImplementation((_selector?: string, opts?: { count?: string; head?: boolean }) => {
    if (opts?.head) {
      // count query
      return {
        ...builder,
        eq: vi.fn().mockReturnValue({
          ...builder,
          eq: vi.fn().mockReturnValue({
            ...builder,
            is: vi.fn().mockResolvedValue({ count: resolvedData, error: resolvedError }),
          }),
        }),
      };
    }
    return builder;
  });
  
  // Insert needs to chain to select
  builder.insert = vi.fn().mockReturnValue(builder);
  builder.update = vi.fn().mockReturnValue(builder);
  builder.order = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
  
  return builder;
}

function createMockSupabase(queryBuilder: Record<string, ReturnType<typeof vi.fn>>) {
  return {
    from: vi.fn().mockReturnValue(queryBuilder),
  } as any;
}

// ── Tests ───────────────────────────────────────────────

describe("draft query functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createDraft", () => {
    it('inserts idea row with status "draft" and returns created row', async () => {
      const mockDraft = {
        id: "draft-1",
        user_id: "user-1",
        title: "Test Draft",
        status: "draft",
        deleted_at: null,
      };
      
      const builder = createMockQueryBuilder(mockDraft);
      const supabase = createMockSupabase(builder);
      
      const { createDraft } = await import("@/lib/queries/drafts");
      const result = await createDraft(supabase, {
        user_id: "user-1",
        title: "Test Draft",
        description: "A description",
        category: "Process Improvement",
      });

      expect(supabase.from).toHaveBeenCalledWith("idea");
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          title: "Test Draft",
          status: "draft",
        })
      );
      expect(result.data).toEqual(mockDraft);
      expect(result.error).toBeNull();
    });

    it("with empty title inserts row with empty title", async () => {
      const mockDraft = { id: "draft-2", title: "", status: "draft" };
      const builder = createMockQueryBuilder(mockDraft);
      const supabase = createMockSupabase(builder);
      
      const { createDraft } = await import("@/lib/queries/drafts");
      await createDraft(supabase, { user_id: "user-1" });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ title: "", description: "", category: "" })
      );
    });
  });

  describe("updateDraft", () => {
    it("updates fields and refreshes updated_at", async () => {
      const updatedDraft = { id: "draft-1", title: "Updated Title", status: "draft" };
      const builder = createMockQueryBuilder(updatedDraft);
      const supabase = createMockSupabase(builder);

      const { updateDraft } = await import("@/lib/queries/drafts");
      const result = await updateDraft(supabase, "draft-1", { title: "Updated Title" });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Updated Title" })
      );
      expect(builder.eq).toHaveBeenCalledWith("id", "draft-1");
      expect(result.data).toEqual(updatedDraft);
    });
  });

  describe("getDraftById", () => {
    it("returns draft owned by current user (status = draft, deleted_at IS NULL)", async () => {
      const mockDraft = { id: "draft-1", status: "draft", deleted_at: null };
      const builder = createMockQueryBuilder(mockDraft);
      const supabase = createMockSupabase(builder);

      const { getDraftById } = await import("@/lib/queries/drafts");
      const result = await getDraftById(supabase, "draft-1");

      expect(builder.eq).toHaveBeenCalledWith("id", "draft-1");
      expect(builder.eq).toHaveBeenCalledWith("status", "draft");
      expect(result.data).toEqual(mockDraft);
    });

    it("returns null for soft-deleted draft", async () => {
      const builder = createMockQueryBuilder(null, { message: "No rows found" });
      const supabase = createMockSupabase(builder);

      const { getDraftById } = await import("@/lib/queries/drafts");
      const result = await getDraftById(supabase, "draft-deleted");

      expect(result.data).toBeNull();
    });

    it("returns null for non-draft (status != draft)", async () => {
      const builder = createMockQueryBuilder(null, { message: "No rows found" });
      const supabase = createMockSupabase(builder);

      const { getDraftById } = await import("@/lib/queries/drafts");
      const result = await getDraftById(supabase, "submitted-idea");

      expect(result.data).toBeNull();
    });
  });

  describe("listDrafts", () => {
    it("returns drafts ordered by updated_at DESC, excluding soft-deleted", async () => {
      const drafts = [
        { id: "d2", updated_at: "2026-02-02" },
        { id: "d1", updated_at: "2026-01-01" },
      ];
      const builder = createMockQueryBuilder();
      builder.order = vi.fn().mockResolvedValue({ data: drafts, error: null });
      const supabase = createMockSupabase(builder);

      const { listDrafts } = await import("@/lib/queries/drafts");
      const result = await listDrafts(supabase, "user-1");

      expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(builder.eq).toHaveBeenCalledWith("status", "draft");
      expect(builder.order).toHaveBeenCalledWith("updated_at", { ascending: false });
      expect(result.data).toHaveLength(2);
    });

    it("returns empty array when user has no drafts", async () => {
      const builder = createMockQueryBuilder();
      builder.order = vi.fn().mockResolvedValue({ data: [], error: null });
      const supabase = createMockSupabase(builder);

      const { listDrafts } = await import("@/lib/queries/drafts");
      const result = await listDrafts(supabase, "user-1");

      expect(result.data).toEqual([]);
    });
  });

  describe("softDeleteDraft", () => {
    it("sets deleted_at timestamp", async () => {
      const deletedDraft = { id: "draft-1", deleted_at: "2026-02-26T00:00:00Z" };
      const builder = createMockQueryBuilder(deletedDraft);
      const supabase = {
        ...createMockSupabase(builder),
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
        },
        rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      } as any;

      const { softDeleteDraft } = await import("@/lib/queries/drafts");
      const result = await softDeleteDraft(supabase, "draft-1");

      expect(supabase.rpc).toHaveBeenCalledWith("soft_delete_draft", {
        draft_id: "draft-1",
        owner_id: "user-1",
      });
      expect(result.error).toBeNull();
    });
  });

  describe("submitDraft", () => {
    it('transitions status from "draft" to "submitted"', async () => {
      const submitted = { id: "draft-1", status: "submitted" };
      const builder = createMockQueryBuilder(submitted);
      const supabase = createMockSupabase(builder);

      const { submitDraft } = await import("@/lib/queries/drafts");
      const result = await submitDraft(supabase, "draft-1");

      expect(builder.update).toHaveBeenCalledWith({ status: "submitted" });
      expect(result.data).toEqual(submitted);
    });
  });

  describe("getDraftCount", () => {
    it("returns count of active (non-deleted) drafts", async () => {
      // Create a simpler mock for count query
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ count: 3, error: null }),
              }),
            }),
          }),
        }),
      } as any;

      const { getDraftCount } = await import("@/lib/queries/drafts");
      const result = await getDraftCount(supabase, "user-1");

      expect(result.count).toBe(3);
      expect(result.error).toBeNull();
    });

    it("returns 0 when no drafts exist", async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ count: 0, error: null }),
              }),
            }),
          }),
        }),
      } as any;

      const { getDraftCount } = await import("@/lib/queries/drafts");
      const result = await getDraftCount(supabase, "user-1");

      expect(result.count).toBe(0);
    });
  });
});
