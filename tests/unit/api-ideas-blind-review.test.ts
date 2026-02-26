import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetUserRole = vi.fn();
const mockListIdeas = vi.fn();
const mockGetIdeaById = vi.fn();
const mockGetBlindReviewEnabled = vi.fn();
const mockGetIdeaStageState = vi.fn();
const mockGetAttachmentsByIdeaId = vi.fn();
const mockGetAttachmentUrl = vi.fn();
const mockGetAttachmentDownloadUrl = vi.fn();

// Mock supabase.from().select().in() chain for stage states
const mockIn = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

vi.mock("@/lib/queries", () => ({
  getUserRole: (...args: unknown[]) => mockGetUserRole(...args),
  listIdeas: (...args: unknown[]) => mockListIdeas(...args),
  getIdeaById: (...args: unknown[]) => mockGetIdeaById(...args),
  getAttachmentsByIdeaId: (...args: unknown[]) => mockGetAttachmentsByIdeaId(...args),
}));

vi.mock("@/lib/queries/portal-settings", () => ({
  getBlindReviewEnabled: (...args: unknown[]) => mockGetBlindReviewEnabled(...args),
}));

vi.mock("@/lib/queries/review-state", () => ({
  getIdeaStageState: (...args: unknown[]) => mockGetIdeaStageState(...args),
}));

vi.mock("@/lib/supabase/storage", () => ({
  getAttachmentUrl: (...args: unknown[]) => mockGetAttachmentUrl(...args),
  getAttachmentDownloadUrl: (...args: unknown[]) => mockGetAttachmentDownloadUrl(...args),
}));

vi.mock("@/lib/queries/idea-scores", () => ({
  getScoreAggregatesForIdeas: vi.fn(async () => ({ data: new Map(), error: null })),
  getScoreAggregateForIdea: vi.fn(async () => ({ data: { avgScore: null, scoreCount: 0 }, error: null })),
}));

// ── Helpers ─────────────────────────────────────────────

function authedUser(id = "evaluator-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function makeRequest(url = "http://localhost:3000/api/ideas"): Request {
  return { url } as any;
}

const sampleIdea = {
  id: "idea-1",
  user_id: "submitter-1",
  title: "Great Idea",
  description: "A test idea",
  category: "technology",
  category_fields: {},
  status: "under_review",
  attachment_url: null,
  evaluator_comment: null,
  deleted_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function setupStageStateQuery(stageStates: Array<{ idea_id: string; terminal_outcome: string | null }>) {
  mockIn.mockResolvedValue({ data: stageStates, error: null });
  mockSelect.mockReturnValue({ in: mockIn });
  mockFrom.mockReturnValue({ select: mockSelect });
}

// ── GET /api/ideas tests ────────────────────────────────

describe("GET /api/ideas with blind review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("anonymizes ideas for evaluator when blind review is ON", async () => {
    authedUser("evaluator-1");
    mockListIdeas.mockResolvedValue({ data: [sampleIdea], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-01-01T00:00:00Z" });
    mockGetUserRole.mockResolvedValue("submitter"); // non-admin = evaluator role
    setupStageStateQuery([{ idea_id: "idea-1", terminal_outcome: null }]);

    const { GET } = await import("@/app/api/ideas/route");
    const response = await GET(makeRequest() as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].user_id).toBe("anonymous");
    expect(body[0].submitter_display_name).toBe("Anonymous Submitter");
  });

  it("does NOT anonymize ideas when blind review is OFF", async () => {
    authedUser("evaluator-1");
    mockListIdeas.mockResolvedValue({ data: [sampleIdea], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: false, updatedBy: null, updatedAt: null });

    const { GET } = await import("@/app/api/ideas/route");
    const response = await GET(makeRequest() as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].user_id).toBe("submitter-1");
    expect(body[0].submitter_display_name).toBeUndefined();
  });

  it("does NOT anonymize for admin when blind review is ON", async () => {
    authedUser("admin-1");
    mockListIdeas.mockResolvedValue({ data: [sampleIdea], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-01-01T00:00:00Z" });
    mockGetUserRole.mockResolvedValue("admin");
    setupStageStateQuery([{ idea_id: "idea-1", terminal_outcome: null }]);

    const { GET } = await import("@/app/api/ideas/route");
    const response = await GET(makeRequest() as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].user_id).toBe("submitter-1");
  });

  it("reveals identity for ideas with terminal outcome when blind review is ON", async () => {
    authedUser("evaluator-1");
    mockListIdeas.mockResolvedValue({ data: [sampleIdea], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-01-01T00:00:00Z" });
    mockGetUserRole.mockResolvedValue("submitter");
    setupStageStateQuery([{ idea_id: "idea-1", terminal_outcome: "accepted" }]);

    const { GET } = await import("@/app/api/ideas/route");
    const response = await GET(makeRequest() as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].user_id).toBe("submitter-1"); // terminal → revealed
  });
});

// ── GET /api/ideas/[id] tests ───────────────────────────

describe("GET /api/ideas/[id] with blind review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("anonymizes idea detail for evaluator when blind review is ON (non-terminal)", async () => {
    authedUser("evaluator-1");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-01-01T00:00:00Z" });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: null }, error: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/ideas/idea-1") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user_id).toBe("anonymous");
    expect(body.submitter_display_name).toBe("Anonymous Submitter");
  });

  it("reveals identity on terminal idea even with blind review ON", async () => {
    authedUser("evaluator-1");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-01-01T00:00:00Z" });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: "rejected" }, error: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/ideas/idea-1") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user_id).toBe("submitter-1"); // terminal → revealed
  });

  it("does NOT anonymize for admin viewer", async () => {
    authedUser("admin-1");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-01-01T00:00:00Z" });
    mockGetUserRole.mockResolvedValue("admin");
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: null }, error: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/ideas/idea-1") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user_id).toBe("submitter-1");
  });

  it("does NOT anonymize when blind review is OFF", async () => {
    authedUser("evaluator-1");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: false, updatedBy: null, updatedAt: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/ideas/idea-1") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user_id).toBe("submitter-1");
  });
});

// ── Submitter self-view with blind review ON (US3) ──────

describe("GET /api/ideas — submitter self-view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("submitter sees own identity on their idea with blind review ON", async () => {
    authedUser("submitter-1"); // viewer IS the idea submitter
    mockListIdeas.mockResolvedValue({ data: [sampleIdea], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-01-01T00:00:00Z" });
    mockGetUserRole.mockResolvedValue("submitter");
    setupStageStateQuery([{ idea_id: "idea-1", terminal_outcome: null }]);

    const { GET } = await import("@/app/api/ideas/route");
    const response = await GET(makeRequest() as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].user_id).toBe("submitter-1"); // self-view → NOT masked
    expect(body[0].submitter_display_name).toBeUndefined();
  });
});

describe("GET /api/ideas/[id] — submitter self-view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("submitter sees own identity on own idea detail with blind review ON", async () => {
    authedUser("submitter-1"); // viewer IS the idea owner
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-01-01T00:00:00Z" });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: null }, error: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/ideas/idea-1") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user_id).toBe("submitter-1"); // self-view → NOT masked
    expect(body.submitter_display_name).toBeUndefined();
  });
});
