import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Helpers ─────────────────────────────────────────────

function createMockSupabase(config: {
  workflowResult?: { data: any; error: any };
  stagesResult?: { data: any; error: any };
  versionResult?: { data: any; error: any };
}) {
  const fromFn = vi.fn();

  // review_workflow table (for getActive / getById): from → select → eq → single
  const wfSingle = vi.fn().mockResolvedValue(
    config.workflowResult ?? { data: null, error: { code: "PGRST116", message: "No rows" } }
  );
  const wfEq = vi.fn().mockReturnValue({ single: wfSingle });
  const wfSelect = vi.fn().mockReturnValue({ eq: wfEq });

  // review_stage table: from → select → eq → order
  const stOrder = vi.fn().mockResolvedValue(
    config.stagesResult ?? { data: [], error: null }
  );
  const stEq = vi.fn().mockReturnValue({ order: stOrder });
  const stSelect = vi.fn().mockReturnValue({ eq: stEq });

  // version query: from → select → order → limit
  const vLimit = vi.fn().mockResolvedValue(
    config.versionResult ?? { data: [], error: null }
  );
  const vOrder = vi.fn().mockReturnValue({ limit: vLimit });
  const vSelect = vi.fn().mockReturnValue({ order: vOrder });

  fromFn.mockImplementation((table: string) => {
    if (table === "review_workflow") {
      // If versionResult specified, use version chain; otherwise use workflow chain
      return { select: config.versionResult !== undefined ? vSelect : wfSelect };
    }
    if (table === "review_stage") {
      return { select: stSelect };
    }
    return { select: vi.fn() };
  });

  return { from: fromFn } as any;
}

// ── Tests ───────────────────────────────────────────────

describe("review-workflow queries", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("getActiveWorkflow", () => {
    it("returns null when no active workflow exists", async () => {
      const supabase = createMockSupabase({
        workflowResult: {
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        },
      });

      const { getActiveWorkflow } = await import("@/lib/queries/review-workflow");
      const result = await getActiveWorkflow(supabase);

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it("returns workflow with stages when active workflow exists", async () => {
      const mockWorkflow = {
        id: "wf-1",
        version: 1,
        is_active: true,
        created_by: "admin-1",
        created_at: "2026-01-01T00:00:00Z",
        activated_at: "2026-01-01T00:00:00Z",
      };
      const mockStages = [
        { id: "s-1", workflow_id: "wf-1", name: "Stage 1", position: 1, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
        { id: "s-2", workflow_id: "wf-1", name: "Stage 2", position: 2, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
        { id: "s-3", workflow_id: "wf-1", name: "Stage 3", position: 3, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
      ];

      const supabase = createMockSupabase({
        workflowResult: { data: mockWorkflow, error: null },
        stagesResult: { data: mockStages, error: null },
      });

      const { getActiveWorkflow } = await import("@/lib/queries/review-workflow");
      const result = await getActiveWorkflow(supabase);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.id).toBe("wf-1");
      expect(result.data?.stages).toHaveLength(3);
      expect(result.data?.stages[0].name).toBe("Stage 1");
    });

    it("returns error when workflow fetch fails with unknown error", async () => {
      const supabase = createMockSupabase({
        workflowResult: {
          data: null,
          error: { code: "UNKNOWN", message: "Database error" },
        },
      });

      const { getActiveWorkflow } = await import("@/lib/queries/review-workflow");
      const result = await getActiveWorkflow(supabase);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Database error");
    });

    it("returns error when stage fetch fails", async () => {
      const mockWorkflow = {
        id: "wf-1",
        version: 1,
        is_active: true,
        created_by: "admin-1",
        created_at: "2026-01-01T00:00:00Z",
        activated_at: "2026-01-01T00:00:00Z",
      };

      const supabase = createMockSupabase({
        workflowResult: { data: mockWorkflow, error: null },
        stagesResult: { data: null, error: { message: "Stage fetch error" } },
      });

      const { getActiveWorkflow } = await import("@/lib/queries/review-workflow");
      const result = await getActiveWorkflow(supabase);

      expect(result.data).toBeNull();
      expect(result.error).toBe("Stage fetch error");
    });
  });

  describe("getNextWorkflowVersion", () => {
    it("returns 1 when no workflows exist", async () => {
      const supabase = createMockSupabase({
        versionResult: { data: [], error: null },
      });

      const { getNextWorkflowVersion } = await import("@/lib/queries/review-workflow");
      const result = await getNextWorkflowVersion(supabase);

      expect(result.data).toBe(1);
      expect(result.error).toBeNull();
    });

    it("returns max version + 1 when workflows exist", async () => {
      const supabase = createMockSupabase({
        versionResult: { data: [{ version: 5 }], error: null },
      });

      const { getNextWorkflowVersion } = await import("@/lib/queries/review-workflow");
      const result = await getNextWorkflowVersion(supabase);

      expect(result.data).toBe(6);
      expect(result.error).toBeNull();
    });
  });

  describe("getWorkflowById", () => {
    it("returns null when workflow not found", async () => {
      const supabase = createMockSupabase({
        workflowResult: {
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        },
      });

      const { getWorkflowById } = await import("@/lib/queries/review-workflow");
      const result = await getWorkflowById(supabase, "nonexistent");

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it("returns workflow with stages when found", async () => {
      const mockWorkflow = {
        id: "wf-2",
        version: 2,
        is_active: false,
        created_by: "admin-1",
        created_at: "2026-01-01T00:00:00Z",
        activated_at: null,
      };
      const mockStages = [
        { id: "s-10", workflow_id: "wf-2", name: "Review", position: 1, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
      ];

      const supabase = createMockSupabase({
        workflowResult: { data: mockWorkflow, error: null },
        stagesResult: { data: mockStages, error: null },
      });

      const { getWorkflowById } = await import("@/lib/queries/review-workflow");
      const result = await getWorkflowById(supabase, "wf-2");

      expect(result.error).toBeNull();
      expect(result.data?.id).toBe("wf-2");
      expect(result.data?.stages).toHaveLength(1);
    });
  });
});
