import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetUserRole = vi.fn();
const mockGetIdeaById = vi.fn();
const mockGetIdeaStageStateWithEvents = vi.fn();
const mockGetWorkflowById = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({ auth: { getUser: () => mockGetUser() } }),
}));

vi.mock("@/lib/queries", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
  getIdeaById: (...args: unknown[]) => mockGetIdeaById(...args),
}));

vi.mock("@/lib/queries/review-state", () => ({
  getIdeaStageStateWithEvents: (...args: unknown[]) =>
    mockGetIdeaStageStateWithEvents(...args),
}));

vi.mock("@/lib/queries/review-workflow", () => ({
  getWorkflowById: (...args: unknown[]) => mockGetWorkflowById(...args),
}));

// ── Fixtures ────────────────────────────────────────────

const oldWorkflowStages = [
  { id: "s-old-1", name: "Initial Screen", position: 1, is_enabled: true, workflow_id: "wf-old", created_at: "2026-01-01T00:00:00Z" },
  { id: "s-old-2", name: "Deep Review", position: 2, is_enabled: true, workflow_id: "wf-old", created_at: "2026-01-01T00:00:00Z" },
  { id: "s-old-3", name: "Approval", position: 3, is_enabled: true, workflow_id: "wf-old", created_at: "2026-01-01T00:00:00Z" },
];

const newWorkflowStages = [
  { id: "s-new-1", name: "Triage", position: 1, is_enabled: true, workflow_id: "wf-new", created_at: "2026-02-01T00:00:00Z" },
  { id: "s-new-2", name: "Assessment", position: 2, is_enabled: true, workflow_id: "wf-new", created_at: "2026-02-01T00:00:00Z" },
  { id: "s-new-3", name: "Board Approval", position: 3, is_enabled: true, workflow_id: "wf-new", created_at: "2026-02-01T00:00:00Z" },
  { id: "s-new-4", name: "Final Sign-Off", position: 4, is_enabled: true, workflow_id: "wf-new", created_at: "2026-02-01T00:00:00Z" },
];

const sampleIdea = {
  id: "idea-1",
  user_id: "sub-1",
  title: "Test Idea",
  status: "under_review",
};

// ── Tests ───────────────────────────────────────────────

describe("Integration: Version-Binding Continuity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("idea bound to old workflow v1 continues to resolve stages from v1 even after v2 is activated", async () => {
    // Scenario: Idea was bound to wf-old. Admin later activates wf-new.
    // The progress endpoint should resolve stage names from the original wf-old.

    mockGetUser.mockResolvedValue({ data: { user: { id: "sub-1" } } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });

    // Stage state references wf-old
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: {
        idea_id: "idea-1",
        workflow_id: "wf-old",
        current_stage_id: "s-old-2",
        state_version: 2,
        terminal_outcome: null,
        updated_by: "admin-1",
        updated_at: "2026-01-15T10:00:00Z",
        events: [
          {
            id: "ev-1",
            idea_id: "idea-1",
            workflow_id: "wf-old",
            from_stage_id: null,
            to_stage_id: "s-old-1",
            action: "advance",
            evaluator_comment: null,
            actor_id: "admin-1",
            occurred_at: "2026-01-10T10:00:00Z",
          },
          {
            id: "ev-2",
            idea_id: "idea-1",
            workflow_id: "wf-old",
            from_stage_id: "s-old-1",
            to_stage_id: "s-old-2",
            action: "advance",
            evaluator_comment: null,
            actor_id: "admin-1",
            occurred_at: "2026-01-15T10:00:00Z",
          },
        ],
      },
      error: null,
    });

    // The endpoint should look up the ORIGINAL workflow (wf-old), not the new active one
    mockGetWorkflowById.mockResolvedValue({
      data: { id: "wf-old", version: 1, is_active: false, stages: oldWorkflowStages },
      error: null,
    });

    const { GET } = await import(
      "@/app/api/ideas/[id]/review-progress/route"
    );

    const res = await GET(
      new Request("http://localhost/api/ideas/idea-1/review-progress"),
      { params: Promise.resolve({ id: "idea-1" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    // Should resolve stage names from the OLD workflow
    expect(body.currentStage).toBe("Deep Review");
    expect(body.events[0].toStage).toBe("Initial Screen");
    expect(body.events[1].toStage).toBe("Deep Review");

    // Verify getWorkflowById was called with old workflow id NOT new one
    expect(mockGetWorkflowById).toHaveBeenCalledWith(
      expect.anything(),
      "wf-old"
    );
  });

  it("two ideas bound to different workflow versions show correct stage names", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockGetUserRole.mockResolvedValue("admin");

    // Idea A bound to wf-old
    mockGetIdeaById.mockResolvedValue({
      data: { ...sampleIdea, id: "idea-a" },
      error: null,
    });
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: {
        idea_id: "idea-a",
        workflow_id: "wf-old",
        current_stage_id: "s-old-1",
        state_version: 1,
        terminal_outcome: null,
        updated_by: "admin-1",
        updated_at: "2026-01-10T10:00:00Z",
        events: [
          {
            id: "ev-a1",
            idea_id: "idea-a",
            workflow_id: "wf-old",
            from_stage_id: null,
            to_stage_id: "s-old-1",
            action: "advance",
            evaluator_comment: null,
            actor_id: "admin-1",
            occurred_at: "2026-01-10T10:00:00Z",
          },
        ],
      },
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({
      data: { id: "wf-old", version: 1, is_active: false, stages: oldWorkflowStages },
      error: null,
    });

    const { GET } = await import("@/app/api/ideas/[id]/review-progress/route");

    const resA = await GET(
      new Request("http://localhost/api/ideas/idea-a/review-progress"),
      { params: Promise.resolve({ id: "idea-a" }) }
    );
    expect(resA.status).toBe(200);
    const bodyA = await resA.json();
    expect(bodyA.currentStage).toBe("Initial Screen");

    // Now Idea B bound to wf-new
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockGetUserRole.mockResolvedValue("admin");
    mockGetIdeaById.mockResolvedValue({
      data: { ...sampleIdea, id: "idea-b" },
      error: null,
    });
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: {
        idea_id: "idea-b",
        workflow_id: "wf-new",
        current_stage_id: "s-new-3",
        state_version: 3,
        terminal_outcome: null,
        updated_by: "admin-1",
        updated_at: "2026-02-15T10:00:00Z",
        events: [],
      },
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({
      data: { id: "wf-new", version: 2, is_active: true, stages: newWorkflowStages },
      error: null,
    });

    const resB = await GET(
      new Request("http://localhost/api/ideas/idea-b/review-progress"),
      { params: Promise.resolve({ id: "idea-b" }) }
    );
    expect(resB.status).toBe(200);
    const bodyB = await resB.json();
    expect(bodyB.currentStage).toBe("Board Approval");

    // Different stage names from different workflow versions
    expect(bodyA.currentStage).not.toBe(bodyB.currentStage);
  });
});
