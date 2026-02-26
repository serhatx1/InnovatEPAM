import { describe, it, expect, vi, beforeEach } from "vitest";
import { bindIdeaToActiveWorkflow } from "@/lib/review/workflow-binding";

// ── Helpers ─────────────────────────────────────────────

const mockGetActiveWorkflow = vi.fn();
const mockCreateIdeaStageState = vi.fn();
const mockRecordStageEvent = vi.fn();

vi.mock("@/lib/queries/review-workflow", () => ({
  getActiveWorkflow: (...args: unknown[]) => mockGetActiveWorkflow(...args),
}));

vi.mock("@/lib/queries/review-state", () => ({
  createIdeaStageState: (...args: unknown[]) => mockCreateIdeaStageState(...args),
  recordStageEvent: (...args: unknown[]) => mockRecordStageEvent(...args),
}));

const supabase = {} as any;

describe("bindIdeaToActiveWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("binds idea to first stage of active workflow", async () => {
    const workflow = {
      id: "wf-1",
      stages: [{ id: "s-1", position: 1, name: "Screening" }],
    };
    const state = { idea_id: "i-1", workflow_id: "wf-1", current_stage_id: "s-1" };
    const event = { id: "e-1", action: "advance" };

    mockGetActiveWorkflow.mockResolvedValue({ data: workflow, error: null });
    mockCreateIdeaStageState.mockResolvedValue({ data: state, error: null });
    mockRecordStageEvent.mockResolvedValue({ data: event, error: null });

    const result = await bindIdeaToActiveWorkflow(supabase, "i-1", "user-1");

    expect(result.error).toBeNull();
    expect(result.data?.state).toEqual(state);
    expect(result.data?.event).toEqual(event);
  });

  it("returns error when getActiveWorkflow fails", async () => {
    mockGetActiveWorkflow.mockResolvedValue({ data: null, error: "wf error" });

    const result = await bindIdeaToActiveWorkflow(supabase, "i-1", "user-1");
    expect(result.error).toBe("wf error");
    expect(result.data).toBeNull();
  });

  it("returns error when no active workflow exists", async () => {
    mockGetActiveWorkflow.mockResolvedValue({ data: null, error: null });

    const result = await bindIdeaToActiveWorkflow(supabase, "i-1", "user-1");
    expect(result.error).toContain("No active review workflow");
    expect(result.data).toBeNull();
  });

  it("returns error when active workflow has no stages", async () => {
    mockGetActiveWorkflow.mockResolvedValue({
      data: { id: "wf-1", stages: [] },
      error: null,
    });

    const result = await bindIdeaToActiveWorkflow(supabase, "i-1", "user-1");
    expect(result.error).toContain("no stages");
    expect(result.data).toBeNull();
  });

  it("returns error when createIdeaStageState fails", async () => {
    const workflow = {
      id: "wf-1",
      stages: [{ id: "s-1", position: 1, name: "Screening" }],
    };
    mockGetActiveWorkflow.mockResolvedValue({ data: workflow, error: null });
    mockCreateIdeaStageState.mockResolvedValue({ data: null, error: "state error" });

    const result = await bindIdeaToActiveWorkflow(supabase, "i-1", "user-1");
    expect(result.error).toBe("state error");
    expect(result.data).toBeNull();
  });

  it("returns error when createIdeaStageState returns null data", async () => {
    const workflow = {
      id: "wf-1",
      stages: [{ id: "s-1", position: 1, name: "Screening" }],
    };
    mockGetActiveWorkflow.mockResolvedValue({ data: workflow, error: null });
    mockCreateIdeaStageState.mockResolvedValue({ data: null, error: null });

    const result = await bindIdeaToActiveWorkflow(supabase, "i-1", "user-1");
    expect(result.error).toContain("Failed to create stage state");
  });

  it("returns error when recordStageEvent fails", async () => {
    const workflow = {
      id: "wf-1",
      stages: [{ id: "s-1", position: 1, name: "Screening" }],
    };
    const state = { idea_id: "i-1", workflow_id: "wf-1", current_stage_id: "s-1" };
    mockGetActiveWorkflow.mockResolvedValue({ data: workflow, error: null });
    mockCreateIdeaStageState.mockResolvedValue({ data: state, error: null });
    mockRecordStageEvent.mockResolvedValue({ data: null, error: "event error" });

    const result = await bindIdeaToActiveWorkflow(supabase, "i-1", "user-1");
    expect(result.error).toBe("event error");
  });

  it("returns error when recordStageEvent returns null data", async () => {
    const workflow = {
      id: "wf-1",
      stages: [{ id: "s-1", position: 1, name: "Screening" }],
    };
    const state = { idea_id: "i-1", workflow_id: "wf-1", current_stage_id: "s-1" };
    mockGetActiveWorkflow.mockResolvedValue({ data: workflow, error: null });
    mockCreateIdeaStageState.mockResolvedValue({ data: state, error: null });
    mockRecordStageEvent.mockResolvedValue({ data: null, error: null });

    const result = await bindIdeaToActiveWorkflow(supabase, "i-1", "user-1");
    expect(result.error).toContain("Failed to record entry event");
  });
});
