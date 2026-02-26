import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetUserRole = vi.fn();
const mockListIdeas = vi.fn();
const mockGetIdeaById = vi.fn();
const mockGetBlindReviewEnabled = vi.fn();
const mockSetBlindReviewEnabled = vi.fn();
const mockGetIdeaStageState = vi.fn();
const mockGetAttachmentsByIdeaId = vi.fn();

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
  setBlindReviewEnabled: (...args: unknown[]) => mockSetBlindReviewEnabled(...args),
}));

vi.mock("@/lib/queries/review-state", () => ({
  getIdeaStageState: (...args: unknown[]) => mockGetIdeaStageState(...args),
}));

vi.mock("@/lib/supabase/storage", () => ({
  getAttachmentUrl: vi.fn().mockResolvedValue(null),
  getAttachmentDownloadUrl: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/queries/idea-scores", () => ({
  getScoreAggregatesForIdeas: vi.fn(async () => ({ data: new Map(), error: null })),
  getScoreAggregateForIdea: vi.fn(async () => ({ data: { avgScore: null, scoreCount: 0 }, error: null })),
}));

// ── Fixtures ────────────────────────────────────────────

const adminUser = { id: "admin-1" };
const evaluatorUser = { id: "evaluator-1" };
const submitterUser = { id: "submitter-1" };

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

function makePutRequest(body: Record<string, unknown>) {
  return { json: async () => body } as any;
}

function makeRequest(url = "http://localhost:3000/api/ideas"): Request {
  return { url } as any;
}

// ── Integration: Full Blind Review Lifecycle ─────────────

describe("Integration: Blind Review Toggle → Evaluator Listing → Detail → Terminal Reveal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("admin enables blind review, evaluator sees anonymous on listing, identity revealed at terminal", async () => {
    // Step 1: Admin enables blind review via PUT
    mockGetUser.mockResolvedValue({ data: { user: adminUser } });
    mockGetUserRole.mockResolvedValue("admin");
    mockSetBlindReviewEnabled.mockResolvedValue({
      data: { enabled: true, updatedBy: "admin-1", updatedAt: "2026-02-26T00:00:00Z" },
      error: null,
    });

    const { PUT } = await import("@/app/api/admin/settings/blind-review/route");
    const enableRes = await PUT(makePutRequest({ enabled: true }));
    const enableBody = await enableRes.json();
    expect(enableRes.status).toBe(200);
    expect(enableBody.enabled).toBe(true);

    // Step 2: Admin verifies setting via GET
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: adminUser } });
    mockGetUserRole.mockResolvedValue("admin");
    mockGetBlindReviewEnabled.mockResolvedValue({
      enabled: true,
      updatedBy: "admin-1",
      updatedAt: "2026-02-26T00:00:00Z",
    });

    const { GET: getSettings } = await import("@/app/api/admin/settings/blind-review/route");
    const verifyRes = await getSettings();
    const verifyBody = await verifyRes.json();
    expect(verifyRes.status).toBe(200);
    expect(verifyBody.enabled).toBe(true);

    // Step 3: Evaluator views idea listing — should be anonymous
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: evaluatorUser } });
    mockGetUserRole.mockResolvedValue("submitter"); // non-admin = evaluator
    mockListIdeas.mockResolvedValue({ data: [sampleIdea], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-02-26T00:00:00Z" });
    setupStageStateQuery([{ idea_id: "idea-1", terminal_outcome: null }]);

    const { GET: getIdeas } = await import("@/app/api/ideas/route");
    const listRes = await getIdeas(makeRequest() as any);
    const listBody = await listRes.json();
    expect(listRes.status).toBe(200);
    expect(listBody[0].user_id).toBe("anonymous");
    expect(listBody[0].submitter_display_name).toBe("Anonymous Submitter");

    // Step 4: Evaluator views idea detail — should be anonymous
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: evaluatorUser } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-02-26T00:00:00Z" });
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: null }, error: null });

    const { GET: getDetail } = await import("@/app/api/ideas/[id]/route");
    const detailRes = await getDetail(
      new Request("http://localhost/api/ideas/idea-1") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const detailBody = await detailRes.json();
    expect(detailRes.status).toBe(200);
    expect(detailBody.user_id).toBe("anonymous");

    // Step 5: Idea reaches terminal → identity revealed
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: evaluatorUser } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-02-26T00:00:00Z" });
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: "accepted" }, error: null });

    const { GET: getDetailTerminal } = await import("@/app/api/ideas/[id]/route");
    const terminalRes = await getDetailTerminal(
      new Request("http://localhost/api/ideas/idea-1") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const terminalBody = await terminalRes.json();
    expect(terminalRes.status).toBe(200);
    expect(terminalBody.user_id).toBe("submitter-1"); // terminal → revealed
  });

  it("admin disables blind review, evaluator sees full identity", async () => {
    // Admin disables blind review
    mockGetUser.mockResolvedValue({ data: { user: adminUser } });
    mockGetUserRole.mockResolvedValue("admin");
    mockSetBlindReviewEnabled.mockResolvedValue({
      data: { enabled: false, updatedBy: "admin-1", updatedAt: "2026-02-26T01:00:00Z" },
      error: null,
    });

    const { PUT } = await import("@/app/api/admin/settings/blind-review/route");
    const disableRes = await PUT(makePutRequest({ enabled: false }));
    expect(disableRes.status).toBe(200);
    const disableBody = await disableRes.json();
    expect(disableBody.enabled).toBe(false);

    // Evaluator sees full identity
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: evaluatorUser } });
    mockListIdeas.mockResolvedValue({ data: [sampleIdea], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: false, updatedBy: null, updatedAt: null });

    const { GET: getIdeas } = await import("@/app/api/ideas/route");
    const listRes = await getIdeas(makeRequest() as any);
    const listBody = await listRes.json();
    expect(listRes.status).toBe(200);
    expect(listBody[0].user_id).toBe("submitter-1");
    expect(listBody[0].submitter_display_name).toBeUndefined();
  });
});

// ── Integration: Admin Exemption & Submitter Self-View ──

describe("Integration: Admin Exemption and Submitter Self-View During Blind Review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("admin always sees full identity with blind review ON", async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } });
    mockGetUserRole.mockResolvedValue("admin");
    mockListIdeas.mockResolvedValue({ data: [sampleIdea], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-02-26T00:00:00Z" });
    setupStageStateQuery([{ idea_id: "idea-1", terminal_outcome: null }]);

    const { GET } = await import("@/app/api/ideas/route");
    const res = await GET(makeRequest() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body[0].user_id).toBe("submitter-1"); // admin → NOT masked
  });

  it("admin sees full identity on idea detail with blind review ON", async () => {
    mockGetUser.mockResolvedValue({ data: { user: adminUser } });
    mockGetUserRole.mockResolvedValue("admin");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-02-26T00:00:00Z" });
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: null }, error: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/ideas/idea-1") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user_id).toBe("submitter-1");
  });

  it("submitter sees own identity on listing with blind review ON", async () => {
    mockGetUser.mockResolvedValue({ data: { user: submitterUser } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockListIdeas.mockResolvedValue({ data: [sampleIdea], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-02-26T00:00:00Z" });
    setupStageStateQuery([{ idea_id: "idea-1", terminal_outcome: null }]);

    const { GET } = await import("@/app/api/ideas/route");
    const res = await GET(makeRequest() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body[0].user_id).toBe("submitter-1"); // self-view → NOT masked
  });

  it("submitter sees own identity on idea detail with blind review ON", async () => {
    mockGetUser.mockResolvedValue({ data: { user: submitterUser } });
    mockGetUserRole.mockResolvedValue("submitter");
    mockGetIdeaById.mockResolvedValue({ data: sampleIdea, error: null });
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockGetBlindReviewEnabled.mockResolvedValue({ enabled: true, updatedBy: "admin-1", updatedAt: "2026-02-26T00:00:00Z" });
    mockGetIdeaStageState.mockResolvedValue({ data: { terminal_outcome: null }, error: null });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/ideas/idea-1") as any,
      { params: Promise.resolve({ id: "idea-1" }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user_id).toBe("submitter-1"); // self-view → NOT masked
  });

  it("non-admin user receives 403 on settings endpoint", async () => {
    mockGetUser.mockResolvedValue({ data: { user: evaluatorUser } });
    mockGetUserRole.mockResolvedValue("submitter");

    const { GET } = await import("@/app/api/admin/settings/blind-review/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });
});
