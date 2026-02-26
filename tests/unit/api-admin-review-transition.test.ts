import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetUserRole = vi.fn();
const mockIdeaExists = vi.fn();
const mockGetIdeaStageState = vi.fn();
const mockUpdateIdeaStageState = vi.fn();
const mockRecordStageEvent = vi.fn();
const mockGetWorkflowById = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
  ideaExists: (...args: unknown[]) => mockIdeaExists(...args),
}));

vi.mock("@/lib/queries/review-state", () => ({
  getIdeaStageState: (...args: unknown[]) => mockGetIdeaStageState(...args),
  updateIdeaStageState: (...args: unknown[]) =>
    mockUpdateIdeaStageState(...args),
  recordStageEvent: (...args: unknown[]) => mockRecordStageEvent(...args),
}));

vi.mock("@/lib/queries/review-workflow", () => ({
  getWorkflowById: (...args: unknown[]) => mockGetWorkflowById(...args),
}));

// ── Helpers ─────────────────────────────────────────────

function authedUser(id = "admin-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function unauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function adminRole() {
  mockGetUserRole.mockResolvedValue("admin");
}

function evaluatorRole() {
  mockGetUserRole.mockResolvedValue("evaluator");
}

function submitterRole() {
  mockGetUserRole.mockResolvedValue("submitter");
}

const stages = [
  { id: "s-1", workflow_id: "wf-1", name: "Screening", position: 1, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "s-2", workflow_id: "wf-1", name: "Technical", position: 2, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "s-3", workflow_id: "wf-1", name: "Final", position: 3, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
];

const workflow = {
  id: "wf-1",
  version: 1,
  is_active: true,
  created_by: "admin-1",
  created_at: "2026-01-01T00:00:00Z",
  activated_at: "2026-01-01T00:00:00Z",
  stages,
};

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    idea_id: "idea-1",
    workflow_id: "wf-1",
    current_stage_id: "s-1",
    state_version: 1,
    terminal_outcome: null,
    updated_by: "admin-1",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown>) {
  return [
    { json: async () => body } as any,
    { params: Promise.resolve({ id: "idea-1" }) },
  ] as const;
}

function setupHappyPath(stateOverrides: Record<string, unknown> = {}) {
  authedUser();
  adminRole();
  mockIdeaExists.mockResolvedValue(true);
  mockGetIdeaStageState.mockResolvedValue({
    data: makeState(stateOverrides),
    error: null,
  });
  mockGetWorkflowById.mockResolvedValue({ data: workflow, error: null });
  mockRecordStageEvent.mockResolvedValue({ data: {}, error: null });
}

// ── Tests ───────────────────────────────────────────────

describe("POST /api/admin/review/ideas/[id]/transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────

  it("returns 401 for unauthenticated request", async () => {
    unauthenticated();
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "advance", expectedStateVersion: 1 }));
    expect(response.status).toBe(401);
  });

  it("returns 403 for submitter role", async () => {
    authedUser("user-1");
    submitterRole();
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "advance", expectedStateVersion: 1 }));
    expect(response.status).toBe(403);
  });

  it("allows evaluator role", async () => {
    setupHappyPath();
    evaluatorRole();
    mockUpdateIdeaStageState.mockResolvedValue({
      data: makeState({ current_stage_id: "s-2", state_version: 2 }),
      error: null,
    });
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "advance", expectedStateVersion: 1 }));
    expect(response.status).toBe(200);
  });

  // ── Validation ────────────────────────────────────

  it("returns 400 for invalid action", async () => {
    authedUser();
    adminRole();
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "skip", expectedStateVersion: 1 }));
    expect(response.status).toBe(400);
  });

  it("returns 404 when idea does not exist", async () => {
    authedUser();
    adminRole();
    mockIdeaExists.mockResolvedValue(false);
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "advance", expectedStateVersion: 1 }));
    expect(response.status).toBe(404);
  });

  // ── Concurrency ───────────────────────────────────

  it("returns 409 on stale expectedStateVersion", async () => {
    setupHappyPath({ state_version: 3 });
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "advance", expectedStateVersion: 1 }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Conflict");
    expect(body.message).toContain("refresh and retry");
  });

  // ── Advance ───────────────────────────────────────

  it("advances to next stage successfully", async () => {
    setupHappyPath();
    mockUpdateIdeaStageState.mockResolvedValue({
      data: makeState({ current_stage_id: "s-2", state_version: 2 }),
      error: null,
    });
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "advance", expectedStateVersion: 1 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.currentStageId).toBe("s-2");
    expect(body.currentStageName).toBe("Technical");
    expect(body.stateVersion).toBe(2);
  });

  it("rejects advance from last stage", async () => {
    setupHappyPath({ current_stage_id: "s-3" });
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "advance", expectedStateVersion: 1 }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain("last stage");
  });

  // ── Return ────────────────────────────────────────

  it("rejects return from first stage", async () => {
    setupHappyPath({ current_stage_id: "s-1" });
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "return", expectedStateVersion: 1 }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain("first stage");
  });

  // ── Terminal ──────────────────────────────────────

  it("terminal_accept only at last stage", async () => {
    setupHappyPath({ current_stage_id: "s-1" });
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "terminal_accept", expectedStateVersion: 1 }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain("last stage");
  });

  it("terminal_accept at last stage sets accepted outcome", async () => {
    setupHappyPath({ current_stage_id: "s-3" });
    mockUpdateIdeaStageState.mockResolvedValue({
      data: makeState({
        current_stage_id: "s-3",
        state_version: 2,
        terminal_outcome: "accepted",
      }),
      error: null,
    });
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "terminal_accept", expectedStateVersion: 1 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.terminalOutcome).toBe("accepted");
  });

  it("rejects transition on already terminal idea", async () => {
    setupHappyPath({ terminal_outcome: "accepted", current_stage_id: "s-3" });
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "advance", expectedStateVersion: 1 }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain("terminal");
  });

  // ── Hold ──────────────────────────────────────────

  it("hold keeps idea at current stage", async () => {
    setupHappyPath();
    mockUpdateIdeaStageState.mockResolvedValue({
      data: makeState({ state_version: 2 }),
      error: null,
    });
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    const response = await POST(...makeRequest({ action: "hold", expectedStateVersion: 1 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.currentStageId).toBe("s-1");
    expect(body.stateVersion).toBe(2);
  });

  // ── Event recording ───────────────────────────────

  it("records stage event on successful transition", async () => {
    setupHappyPath();
    mockUpdateIdeaStageState.mockResolvedValue({
      data: makeState({ current_stage_id: "s-2", state_version: 2 }),
      error: null,
    });
    const { POST } = await import(
      "@/app/api/admin/review/ideas/[id]/transition/route"
    );

    await POST(
      ...makeRequest({
        action: "advance",
        expectedStateVersion: 1,
        comment: "Good work",
      })
    );

    expect(mockRecordStageEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        idea_id: "idea-1",
        from_stage_id: "s-1",
        to_stage_id: "s-2",
        action: "advance",
        evaluator_comment: "Good work",
      })
    );
  });
});
