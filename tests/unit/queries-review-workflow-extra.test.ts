import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Additional tests for review-workflow queries to cover
 * createAndActivateWorkflow and error paths.
 */

describe("review-workflow: createAndActivateWorkflow", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function buildMockSupabase(scenario: {
    versionData?: { data: any; error: any };
    deactivateResult?: { error: any };
    insertWorkflowResult?: { data: any; error: any };
    insertStagesResult?: { data: any; error: any };
  }) {
    const versionChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(
        scenario.versionData ?? { data: [], error: null }
      ),
    };

    const deactivateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue(
        scenario.deactivateResult ?? { error: null }
      ),
    };

    const insertWorkflowChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(
        scenario.insertWorkflowResult ?? {
          data: { id: "wf-new", version: 1, is_active: true, created_by: "admin-1" },
          error: null,
        }
      ),
    };

    const insertStagesChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue(
        scenario.insertStagesResult ?? {
          data: [
            { id: "s-1", workflow_id: "wf-new", name: "Stage 1", position: 1, is_enabled: true },
          ],
          error: null,
        }
      ),
    };

    let workflowCallCount = 0;

    const from = vi.fn((table: string) => {
      if (table === "review_workflow") {
        workflowCallCount++;
        // 1st call: getNextWorkflowVersion (select → order → limit)
        if (workflowCallCount === 1) return versionChain;
        // 2nd call: deactivate (update → eq)
        if (workflowCallCount === 2) return deactivateChain;
        // 3rd call: insert new workflow (insert → select → single)
        return insertWorkflowChain;
      }
      if (table === "review_stage") {
        return insertStagesChain;
      }
      return { select: vi.fn() };
    });

    return { from } as any;
  }

  it("creates and activates a new workflow with stages", async () => {
    const supabase = buildMockSupabase({});

    const { createAndActivateWorkflow } = await import(
      "@/lib/queries/review-workflow"
    );
    const result = await createAndActivateWorkflow(supabase, {
      stages: [{ name: "Stage 1" }],
      created_by: "admin-1",
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data?.id).toBe("wf-new");
    expect(result.data?.stages).toHaveLength(1);
  });

  it("returns error when version query fails", async () => {
    const supabase = buildMockSupabase({
      versionData: { data: [], error: { message: "version fail" } },
    });

    const { createAndActivateWorkflow } = await import(
      "@/lib/queries/review-workflow"
    );
    const result = await createAndActivateWorkflow(supabase, {
      stages: [{ name: "S1" }],
      created_by: "admin-1",
    });

    expect(result.error).toBe("version fail");
    expect(result.data).toBeNull();
  });

  it("returns error when deactivation fails", async () => {
    const supabase = buildMockSupabase({
      deactivateResult: { error: { message: "deactivate fail" } },
    });

    const { createAndActivateWorkflow } = await import(
      "@/lib/queries/review-workflow"
    );
    const result = await createAndActivateWorkflow(supabase, {
      stages: [{ name: "S1" }],
      created_by: "admin-1",
    });

    expect(result.error).toBe("deactivate fail");
  });

  it("returns error when workflow insert fails", async () => {
    const supabase = buildMockSupabase({
      insertWorkflowResult: { data: null, error: { message: "insert wf fail" } },
    });

    const { createAndActivateWorkflow } = await import(
      "@/lib/queries/review-workflow"
    );
    const result = await createAndActivateWorkflow(supabase, {
      stages: [{ name: "S1" }],
      created_by: "admin-1",
    });

    expect(result.error).toBe("insert wf fail");
  });

  it("returns error when stage insert fails", async () => {
    const supabase = buildMockSupabase({
      insertStagesResult: { data: null, error: { message: "insert stages fail" } },
    });

    const { createAndActivateWorkflow } = await import(
      "@/lib/queries/review-workflow"
    );
    const result = await createAndActivateWorkflow(supabase, {
      stages: [{ name: "S1" }],
      created_by: "admin-1",
    });

    expect(result.error).toBe("insert stages fail");
  });

  it("returns error for getNextWorkflowVersion db error", async () => {
    const supabase = buildMockSupabase({
      versionData: { data: null, error: { message: "db error" } },
    });

    const { getNextWorkflowVersion } = await import(
      "@/lib/queries/review-workflow"
    );
    const result = await getNextWorkflowVersion(supabase);

    expect(result.data).toBe(1);
    expect(result.error).toBe("db error");
  });

  it("getWorkflowById returns error for non-PGRST116 errors", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "unknown error" },
      }),
    };
    const supabase = { from: vi.fn(() => chain) } as any;

    const { getWorkflowById } = await import(
      "@/lib/queries/review-workflow"
    );
    const result = await getWorkflowById(supabase, "wf-bad");

    expect(result.error).toBe("unknown error");
    expect(result.data).toBeNull();
  });

  it("getWorkflowById returns error when stage fetch fails", async () => {
    const wfChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "wf-1", version: 1 },
        error: null,
      }),
    };
    const stageChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "stage fetch error" },
      }),
    };

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "review_workflow") return wfChain;
        return stageChain;
      }),
    } as any;

    const { getWorkflowById } = await import(
      "@/lib/queries/review-workflow"
    );
    const result = await getWorkflowById(supabase, "wf-1");

    expect(result.error).toBe("stage fetch error");
  });
});
