import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockGetUserRole = vi.fn();
const mockIdeaExists = vi.fn();
vi.mock("@/lib/queries", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
  ideaExists: (...args: unknown[]) => mockIdeaExists(...args),
}));

const mockGetIdeaStageStateWithEvents = vi.fn();
vi.mock("@/lib/queries/review-state", () => ({
  getIdeaStageStateWithEvents: (...args: unknown[]) =>
    mockGetIdeaStageStateWithEvents(...args),
}));

const mockGetWorkflowById = vi.fn();
vi.mock("@/lib/queries/review-workflow", () => ({
  getWorkflowById: (...args: unknown[]) => mockGetWorkflowById(...args),
}));

// ── Helpers ─────────────────────────────────────────────

function authedAdmin(id = "admin-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
  mockGetUserRole.mockResolvedValue("admin");
}

function authedEvaluator(id = "eval-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
  mockGetUserRole.mockResolvedValue("evaluator");
}

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function makeParams(id: string) {
  return [
    new Request("http://localhost/api/admin/review/ideas/" + id + "/stage"),
    { params: Promise.resolve({ id }) },
  ] as const;
}

// ── Tests ───────────────────────────────────────────────

describe("GET /api/admin/review/ideas/[id]/stage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for unauthenticated user", async () => {
    unauthenticated();
    const { GET } = await import(
      "@/app/api/admin/review/ideas/[id]/stage/route"
    );
    const res = await GET(...makeParams("idea-1"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for submitter role", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } } });
    mockGetUserRole.mockResolvedValue("submitter");
    const { GET } = await import(
      "@/app/api/admin/review/ideas/[id]/stage/route"
    );
    const res = await GET(...makeParams("idea-1"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 404 when idea does not exist", async () => {
    authedAdmin();
    mockIdeaExists.mockResolvedValue(false);
    const { GET } = await import(
      "@/app/api/admin/review/ideas/[id]/stage/route"
    );
    const res = await GET(...makeParams("missing"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Idea not found");
  });

  it("returns 500 when getIdeaStageStateWithEvents returns error", async () => {
    authedAdmin();
    mockIdeaExists.mockResolvedValue(true);
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: null,
      error: "DB failure",
    });
    const { GET } = await import(
      "@/app/api/admin/review/ideas/[id]/stage/route"
    );
    const res = await GET(...makeParams("idea-1"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("DB failure");
  });

  it("returns 404 when stateWithEvents is null (no error)", async () => {
    authedAdmin();
    mockIdeaExists.mockResolvedValue(true);
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: null,
      error: null,
    });
    const { GET } = await import(
      "@/app/api/admin/review/ideas/[id]/stage/route"
    );
    const res = await GET(...makeParams("idea-1"));
    expect(res.status).toBe(404);
  });

  it("returns 200 with full stage state and event history", async () => {
    authedAdmin();
    mockIdeaExists.mockResolvedValue(true);
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: {
        workflow_id: "wf-1",
        current_stage_id: "stage-2",
        state_version: 3,
        terminal_outcome: null,
        updated_at: "2026-06-01T00:00:00Z",
        events: [
          {
            id: "evt-1",
            from_stage_id: "stage-1",
            to_stage_id: "stage-2",
            action: "advance",
            evaluator_comment: "Looks good",
            actor_id: "admin-1",
            occurred_at: "2026-05-31T00:00:00Z",
          },
          {
            id: "evt-2",
            from_stage_id: null,
            to_stage_id: "stage-1",
            action: "assign",
            evaluator_comment: null,
            actor_id: "admin-1",
            occurred_at: "2026-05-30T00:00:00Z",
          },
        ],
      },
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({
      data: {
        stages: [
          { id: "stage-1", name: "Initial" },
          { id: "stage-2", name: "Final" },
        ],
      },
    });

    const { GET } = await import(
      "@/app/api/admin/review/ideas/[id]/stage/route"
    );
    const res = await GET(...makeParams("idea-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ideaId).toBe("idea-1");
    expect(body.workflowId).toBe("wf-1");
    expect(body.currentStageName).toBe("Final");
    expect(body.events).toHaveLength(2);
    expect(body.events[0].fromStage).toBe("Initial");
    expect(body.events[0].toStage).toBe("Final");
    expect(body.events[1].fromStage).toBeNull();
  });

  it("returns 'Unknown' for stage names not in workflow", async () => {
    authedAdmin();
    mockIdeaExists.mockResolvedValue(true);
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: {
        workflow_id: "wf-1",
        current_stage_id: "deleted-stage",
        state_version: 1,
        terminal_outcome: "accepted",
        updated_at: "2026-06-01T00:00:00Z",
        events: [
          {
            id: "evt-1",
            from_stage_id: "deleted-from",
            to_stage_id: "deleted-to",
            action: "advance",
            evaluator_comment: null,
            actor_id: "admin-1",
            occurred_at: "2026-05-31T00:00:00Z",
          },
        ],
      },
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({ data: { stages: [] } });

    const { GET } = await import(
      "@/app/api/admin/review/ideas/[id]/stage/route"
    );
    const res = await GET(...makeParams("idea-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentStageName).toBe("Unknown");
    expect(body.events[0].fromStage).toBe("Unknown");
    expect(body.events[0].toStage).toBe("Unknown");
  });

  it("allows evaluator role", async () => {
    authedEvaluator();
    mockIdeaExists.mockResolvedValue(true);
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: {
        workflow_id: "wf-1",
        current_stage_id: "s-1",
        state_version: 1,
        terminal_outcome: null,
        updated_at: "2026-06-01T00:00:00Z",
        events: [],
      },
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({
      data: { stages: [{ id: "s-1", name: "Review" }] },
    });

    const { GET } = await import(
      "@/app/api/admin/review/ideas/[id]/stage/route"
    );
    const res = await GET(...makeParams("idea-1"));
    expect(res.status).toBe(200);
  });

  it("handles null workflow gracefully", async () => {
    authedAdmin();
    mockIdeaExists.mockResolvedValue(true);
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: {
        workflow_id: "wf-1",
        current_stage_id: "s-1",
        state_version: 1,
        terminal_outcome: null,
        updated_at: "2026-06-01T00:00:00Z",
        events: [],
      },
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({ data: null });

    const { GET } = await import(
      "@/app/api/admin/review/ideas/[id]/stage/route"
    );
    const res = await GET(...makeParams("idea-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentStageName).toBe("Unknown");
  });
});
