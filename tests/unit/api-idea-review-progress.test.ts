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

// ── Test Fixtures ───────────────────────────────────────

const sampleIdea = {
  id: "idea-1",
  user_id: "submitter-1",
  title: "Test Idea",
  status: "under_review",
};

const sampleStages = [
  { id: "s-1", workflow_id: "wf-1", name: "Screening", position: 1, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "s-2", workflow_id: "wf-1", name: "Technical", position: 2, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "s-3", workflow_id: "wf-1", name: "Final", position: 3, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
];

const sampleStateWithEvents = {
  idea_id: "idea-1",
  workflow_id: "wf-1",
  current_stage_id: "s-2",
  state_version: 3,
  terminal_outcome: null,
  updated_by: "admin-1",
  updated_at: "2026-01-02T10:00:00Z",
  events: [
    {
      id: "ev-1",
      idea_id: "idea-1",
      workflow_id: "wf-1",
      from_stage_id: null,
      to_stage_id: "s-1",
      action: "advance",
      evaluator_comment: null,
      actor_id: "admin-1",
      occurred_at: "2026-01-01T10:00:00Z",
    },
    {
      id: "ev-2",
      idea_id: "idea-1",
      workflow_id: "wf-1",
      from_stage_id: "s-1",
      to_stage_id: "s-2",
      action: "advance",
      evaluator_comment: "Good progress",
      actor_id: "admin-1",
      occurred_at: "2026-01-02T10:00:00Z",
    },
  ],
};

const sampleWorkflow = {
  id: "wf-1",
  version: 1,
  is_active: true,
  stages: sampleStages,
};

function makeRequest() {
  return new Request("http://localhost/api/ideas/idea-1/review-progress");
}

function makeParams() {
  return { params: Promise.resolve({ id: "idea-1" }) };
}

// ── Helper: load handler ────────────────────────────────

async function getHandler() {
  const mod = await import("@/app/api/ideas/[id]/review-progress/route");
  return mod.GET;
}

// ── Tests ───────────────────────────────────────────────

describe("GET /api/ideas/[id]/review-progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const GET = await getHandler();
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when idea does not exist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaById.mockResolvedValue({ data: null, error: "Not found" });

    const GET = await getHandler();
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not owner and not admin/evaluator", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "other-user" } } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });

    const GET = await getHandler();
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 404 when no stage state exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "submitter-1" } } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: null,
      error: null,
    });

    const GET = await getHandler();
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
  });

  it("returns submitter-shaped progress for idea owner during non-terminal", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "submitter-1" } } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: sampleStateWithEvents,
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({
      data: sampleWorkflow,
      error: null,
    });

    const GET = await getHandler();
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ideaId).toBe("idea-1");
    expect(body.currentStage).toBe("Technical");
    // Submitter non-terminal: no actorId, no evaluatorComment
    expect(body).not.toHaveProperty("stateVersion");
    expect(body).not.toHaveProperty("terminalOutcome");
    expect(body.events[0]).not.toHaveProperty("actorId");
    expect(body.events[0]).not.toHaveProperty("evaluatorComment");
    expect(body.events[0]).toHaveProperty("toStage");
    expect(body.events[0]).toHaveProperty("occurredAt");
  });

  it("returns full progress for admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockGetUserRole.mockResolvedValue("admin");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: sampleStateWithEvents,
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({
      data: sampleWorkflow,
      error: null,
    });

    const GET = await getHandler();
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.stateVersion).toBe(3);
    expect(body.terminalOutcome).toBeNull();
    expect(body.events[1]).toHaveProperty("actorId");
    expect(body.events[1]).toHaveProperty("evaluatorComment");
    expect(body.events[1].evaluatorComment).toBe("Good progress");
  });

  it("returns full progress for evaluator", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "eval-1" } } });
    mockGetUserRole.mockResolvedValue("evaluator");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: sampleStateWithEvents,
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({
      data: sampleWorkflow,
      error: null,
    });

    const GET = await getHandler();
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("stateVersion");
    expect(body.events[1]).toHaveProperty("actorId");
  });

  it("returns full progress for submitter after terminal acceptance", async () => {
    const terminalState = {
      ...sampleStateWithEvents,
      terminal_outcome: "accepted",
    };

    mockGetUser.mockResolvedValue({ data: { user: { id: "submitter-1" } } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: terminalState,
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({
      data: sampleWorkflow,
      error: null,
    });

    const GET = await getHandler();
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.terminalOutcome).toBe("accepted");
    expect(body).toHaveProperty("stateVersion");
    expect(body.events[1]).toHaveProperty("actorId");
  });

  it("returns 500 when workflow is not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockGetUserRole.mockResolvedValue("admin");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetIdeaStageStateWithEvents.mockResolvedValue({
      data: sampleStateWithEvents,
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({ data: null, error: "Not found" });

    const GET = await getHandler();
    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(500);
  });
});
