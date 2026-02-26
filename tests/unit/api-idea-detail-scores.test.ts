import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetIdeaById = vi.fn();
const mockGetAttachmentUrl = vi.fn();
const mockGetAttachmentsByIdeaId = vi.fn();
const mockGetAttachmentDownloadUrl = vi.fn();
const mockGetScoreAggregateForIdea = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/queries", () => ({
  getIdeaById: (...args: unknown[]) => mockGetIdeaById(...args),
  getAttachmentsByIdeaId: (...args: unknown[]) => mockGetAttachmentsByIdeaId(...args),
  getUserRole: vi.fn(async () => "admin"),
}));

vi.mock("@/lib/queries/portal-settings", () => ({
  getBlindReviewEnabled: vi.fn(async () => ({ enabled: false, updatedBy: null, updatedAt: null })),
}));

vi.mock("@/lib/queries/review-state", () => ({
  getIdeaStageState: vi.fn(async () => ({ data: null, error: null })),
}));

vi.mock("@/lib/review/blind-review", () => ({
  shouldAnonymize: vi.fn(() => false),
  anonymizeIdeaResponse: vi.fn((idea: unknown) => idea),
}));

vi.mock("@/lib/supabase/storage", () => ({
  getAttachmentUrl: (...args: unknown[]) => mockGetAttachmentUrl(...args),
  getAttachmentDownloadUrl: (...args: unknown[]) => mockGetAttachmentDownloadUrl(...args),
}));

vi.mock("@/lib/queries/idea-scores", () => ({
  getScoreAggregateForIdea: (...args: unknown[]) => mockGetScoreAggregateForIdea(...args),
}));

// ── Helpers ─────────────────────────────────────────────

function authedUser(id = "admin-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function makeIdea(overrides = {}) {
  return {
    id: "idea-1",
    user_id: "user-1",
    title: "Test",
    description: "A test idea",
    category: "technology",
    category_fields: {},
    status: "under_review",
    attachment_url: null,
    evaluator_comment: null,
    deleted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeRequest(id: string) {
  return [
    {} as any,
    { params: Promise.resolve({ id }) },
  ] as const;
}

// ── Tests ───────────────────────────────────────────────

describe("GET /api/ideas/[id] — score aggregate fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAttachmentsByIdeaId.mockResolvedValue({ data: [], error: null });
    mockGetAttachmentUrl.mockResolvedValue(null);
  });

  it("includes avgScore and scoreCount in response", async () => {
    authedUser();
    mockGetIdeaById.mockResolvedValue({ data: makeIdea(), error: null });
    mockGetScoreAggregateForIdea.mockResolvedValue({
      data: { avgScore: 3.7, scoreCount: 5 },
      error: null,
    });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.avgScore).toBe(3.7);
    expect(body.scoreCount).toBe(5);
  });

  it("returns null avgScore and 0 scoreCount when no scores", async () => {
    authedUser();
    mockGetIdeaById.mockResolvedValue({ data: makeIdea(), error: null });
    mockGetScoreAggregateForIdea.mockResolvedValue({
      data: { avgScore: null, scoreCount: 0 },
      error: null,
    });

    const { GET } = await import("@/app/api/ideas/[id]/route");
    const response = await GET(...makeRequest("idea-1"));
    const body = await response.json();

    expect(body.avgScore).toBeNull();
    expect(body.scoreCount).toBe(0);
  });
});
