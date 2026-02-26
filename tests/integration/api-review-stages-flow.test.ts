import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetUserRole = vi.fn();
const mockGetActiveWorkflow = vi.fn();
const mockCreateAndActivateWorkflow = vi.fn();
const mockGetIdeaById = vi.fn();
const mockIdeaExists = vi.fn();
const mockGetIdeaStageState = vi.fn();
const mockGetIdeaStageStateWithEvents = vi.fn();
const mockUpdateIdeaStageState = vi.fn();
const mockRecordStageEvent = vi.fn();
const mockGetWorkflowById = vi.fn();

const mockFrom = vi.fn(() => ({
  update: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: () => mockGetUser() },
      from: mockFrom,
    }),
}));

vi.mock("@/lib/queries", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
  getIdeaById: (...args: unknown[]) => mockGetIdeaById(...args),
  ideaExists: (...args: unknown[]) => mockIdeaExists(...args),
}));

vi.mock("@/lib/queries/review-workflow", () => ({
  getActiveWorkflow: (...args: unknown[]) => mockGetActiveWorkflow(...args),
  createAndActivateWorkflow: (...args: unknown[]) =>
    mockCreateAndActivateWorkflow(...args),
  getWorkflowById: (...args: unknown[]) => mockGetWorkflowById(...args),
}));

vi.mock("@/lib/queries/review-state", () => ({
  getIdeaStageState: (...args: unknown[]) => mockGetIdeaStageState(...args),
  getIdeaStageStateWithEvents: (...args: unknown[]) =>
    mockGetIdeaStageStateWithEvents(...args),
  updateIdeaStageState: (...args: unknown[]) =>
    mockUpdateIdeaStageState(...args),
  recordStageEvent: (...args: unknown[]) => mockRecordStageEvent(...args),
}));

vi.mock("@/lib/review/concurrency", () => ({
  CONCURRENCY_CONFLICT: "CONFLICT",
  checkConcurrencyVersion: (state: { state_version: number }, expected: number) =>
    state.state_version === expected ? null : "CONFLICT",
  conflictResponse: () => ({
    error: "Conflict",
    message: "State changed, refresh and retry",
  }),
}));

// ── Fixture data ────────────────────────────────────────

const adminUser = { id: "admin-1" };
const workflowStages = [
  { id: "s-1", name: "Screening", position: 1, is_enabled: true },
  { id: "s-2", name: "Technical", position: 2, is_enabled: true },
  { id: "s-3", name: "Final", position: 3, is_enabled: true },
];
const workflow = {
  id: "wf-1",
  version: 1,
  is_active: true,
  stages: workflowStages,
};

// ── Helpers ─────────────────────────────────────────────

function setupAdminAuth() {
  mockGetUser.mockResolvedValue({ data: { user: adminUser } });
  mockGetUserRole.mockResolvedValue("admin");
}

// ── Tests ───────────────────────────────────────────────

describe("Integration: Workflow Config → Transition Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("admin configures workflow, then transitions an idea through 3 stages to acceptance", async () => {
    setupAdminAuth();

    // Step 1: Configure workflow via PUT /api/admin/review/workflow
    mockCreateAndActivateWorkflow.mockResolvedValue({
      data: workflow,
      error: null,
    });

    const { PUT } = await import(
      "@/app/api/admin/review/workflow/route"
    );

    const putRes = await PUT(
      new Request("http://localhost/api/admin/review/workflow", {
        method: "PUT",
        body: JSON.stringify({
          stages: [
            { name: "Screening", position: 1 },
            { name: "Technical", position: 2 },
            { name: "Final", position: 3 },
          ],
        }),
      })
    );

    expect(putRes.status).toBe(200);
    const wfBody = await putRes.json();
    expect(wfBody.id).toBe("wf-1");

    // Step 2: Verify workflow is active via GET
    mockGetActiveWorkflow.mockResolvedValue({ data: workflow, error: null });

    const getMod = await import("@/app/api/admin/review/workflow/route");
    // Need to re-mock for GET call since module was already imported
    const getRes = await getMod.GET();
    expect(getRes.status).toBe(200);

    // Step 3: Advance idea from stage 1 → 2 via POST transition
    vi.resetModules();
    setupAdminAuth();

    mockIdeaExists.mockResolvedValue({ exists: true, error: null });
    mockGetIdeaStageState.mockResolvedValue({
      data: {
        idea_id: "idea-1",
        workflow_id: "wf-1",
        current_stage_id: "s-1",
        state_version: 1,
        terminal_outcome: null,
        updated_by: "admin-1",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({ data: workflow, error: null });
    mockUpdateIdeaStageState.mockResolvedValue({
      data: {
        idea_id: "idea-1",
        workflow_id: "wf-1",
        current_stage_id: "s-2",
        state_version: 2,
        terminal_outcome: null,
        updated_by: "admin-1",
        updated_at: "2026-01-02T00:00:00Z",
      },
      error: null,
    });
    mockRecordStageEvent.mockResolvedValue({ data: { id: "ev-1" }, error: null });

    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const transRes1 = await POST(
      new Request("http://localhost/api/admin/review/ideas/idea-1/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "advance",
          expectedStateVersion: 1,
        }),
      }),
      { params: Promise.resolve({ id: "idea-1" }) }
    );

    expect(transRes1.status).toBe(200);
    expect(mockRecordStageEvent).toHaveBeenCalled();

    // Step 4: Advance from stage 2 → 3
    vi.clearAllMocks();
    setupAdminAuth();
    mockIdeaExists.mockResolvedValue({ exists: true, error: null });
    mockGetIdeaStageState.mockResolvedValue({
      data: {
        idea_id: "idea-1",
        workflow_id: "wf-1",
        current_stage_id: "s-2",
        state_version: 2,
        terminal_outcome: null,
        updated_by: "admin-1",
        updated_at: "2026-01-02T00:00:00Z",
      },
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({ data: workflow, error: null });
    mockUpdateIdeaStageState.mockResolvedValue({
      data: {
        idea_id: "idea-1",
        workflow_id: "wf-1",
        current_stage_id: "s-3",
        state_version: 3,
        terminal_outcome: null,
        updated_by: "admin-1",
        updated_at: "2026-01-03T00:00:00Z",
      },
      error: null,
    });
    mockRecordStageEvent.mockResolvedValue({ data: { id: "ev-2" }, error: null });

    const transRes2 = await POST(
      new Request("http://localhost/api/admin/review/ideas/idea-1/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "advance",
          expectedStateVersion: 2,
        }),
      }),
      { params: Promise.resolve({ id: "idea-1" }) }
    );

    expect(transRes2.status).toBe(200);

    // Step 5: At last stage, accept via terminal_accept
    vi.clearAllMocks();
    setupAdminAuth();
    mockIdeaExists.mockResolvedValue({ exists: true, error: null });
    mockGetIdeaStageState.mockResolvedValue({
      data: {
        idea_id: "idea-1",
        workflow_id: "wf-1",
        current_stage_id: "s-3",
        state_version: 3,
        terminal_outcome: null,
        updated_by: "admin-1",
        updated_at: "2026-01-03T00:00:00Z",
      },
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({ data: workflow, error: null });
    mockUpdateIdeaStageState.mockResolvedValue({
      data: {
        idea_id: "idea-1",
        workflow_id: "wf-1",
        current_stage_id: "s-3",
        state_version: 4,
        terminal_outcome: "accepted",
        updated_by: "admin-1",
        updated_at: "2026-01-04T00:00:00Z",
      },
      error: null,
    });
    mockRecordStageEvent.mockResolvedValue({ data: { id: "ev-3" }, error: null });

    const transRes3 = await POST(
      new Request("http://localhost/api/admin/review/ideas/idea-1/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "terminal_accept",
          expectedStateVersion: 3,
          comment: "Approved for implementation",
        }),
      }),
      { params: Promise.resolve({ id: "idea-1" }) }
    );

    expect(transRes3.status).toBe(200);
    const finalBody = await transRes3.json();
    expect(finalBody.terminalOutcome).toBe("accepted");
  });

  it("returns 409 on stale version during transition", async () => {
    setupAdminAuth();
    mockIdeaExists.mockResolvedValue({ exists: true, error: null });
    mockGetIdeaStageState.mockResolvedValue({
      data: {
        idea_id: "idea-1",
        workflow_id: "wf-1",
        current_stage_id: "s-1",
        state_version: 5, // actual version is 5
        terminal_outcome: null,
        updated_by: "admin-1",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });
    mockGetWorkflowById.mockResolvedValue({ data: workflow, error: null });

    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const res = await POST(
      new Request("http://localhost/api/admin/review/ideas/idea-1/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "advance",
          expectedStateVersion: 3, // stale — actual is 5
        }),
      }),
      { params: Promise.resolve({ id: "idea-1" }) }
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Conflict");
  });
});
