import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockListIdeas = vi.fn();
const mockGetScoreAggregatesForIdeas = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({ select: vi.fn(() => ({ in: vi.fn(async () => ({ data: [], error: null })) })) })),
  })),
}));

vi.mock("@/lib/queries", () => ({
  listIdeas: (...args: unknown[]) => mockListIdeas(...args),
  createIdea: vi.fn(),
  createAttachments: vi.fn(),
  bindSubmittedIdeaToWorkflow: vi.fn(async () => ({ data: null, error: null })),
  getUserRole: vi.fn(async () => "admin"),
}));

vi.mock("@/lib/queries/portal-settings", () => ({
  getBlindReviewEnabled: vi.fn(async () => ({ enabled: false, updatedBy: null, updatedAt: null })),
}));

vi.mock("@/lib/queries/idea-scores", () => ({
  getScoreAggregatesForIdeas: (...args: unknown[]) => mockGetScoreAggregatesForIdeas(...args),
}));

vi.mock("@/lib/review/blind-review", () => ({
  anonymizeIdeaList: vi.fn((ideas: unknown[]) => ideas),
}));

vi.mock("@/lib/validation/idea", () => ({
  ideaSchema: { safeParse: vi.fn() },
  validateFiles: vi.fn(),
}));

vi.mock("@/lib/validation/category-fields", () => ({
  validateCategoryFieldsForCategory: vi.fn(),
}));

vi.mock("@/lib/supabase/storage", () => ({
  uploadMultipleAttachments: vi.fn(),
  deleteAttachments: vi.fn(),
}));

// ── Helpers ─────────────────────────────────────────────

function authed(id = "admin-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id } } });
}

function makeRequest(url = "http://localhost:3000/api/ideas"): Request {
  return { url } as any;
}

const sampleIdeas = [
  { id: "idea-1", title: "Idea A", status: "submitted" },
  { id: "idea-2", title: "Idea B", status: "submitted" },
  { id: "idea-3", title: "Idea C", status: "submitted" },
  { id: "idea-4", title: "Idea D", status: "submitted" },
];

function setupScoreMap(map: Map<string, { avgScore: number | null; scoreCount: number }>) {
  mockGetScoreAggregatesForIdeas.mockResolvedValue({ data: map, error: null });
}

// ── Tests ───────────────────────────────────────────────

describe("GET /api/ideas — score aggregates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("includes avgScore and scoreCount in response", async () => {
    authed();
    mockListIdeas.mockResolvedValue({ data: [sampleIdeas[0]], error: null });
    const map = new Map([["idea-1", { avgScore: 4.2, scoreCount: 3 }]]);
    setupScoreMap(map);

    const { GET } = await import("@/app/api/ideas/route");
    const res = await GET(makeRequest() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body[0].avgScore).toBe(4.2);
    expect(body[0].scoreCount).toBe(3);
  });

  it("returns null avgScore and 0 scoreCount for unscored ideas", async () => {
    authed();
    mockListIdeas.mockResolvedValue({ data: [sampleIdeas[0]], error: null });
    setupScoreMap(new Map());

    const { GET } = await import("@/app/api/ideas/route");
    const res = await GET(makeRequest() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body[0].avgScore).toBeNull();
    expect(body[0].scoreCount).toBe(0);
  });
});

describe("GET /api/ideas — sort by avgScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("sorts by avgScore descending", async () => {
    authed();
    mockListIdeas.mockResolvedValue({ data: [...sampleIdeas], error: null });
    const map = new Map([
      ["idea-1", { avgScore: 3.0, scoreCount: 2 }],
      ["idea-2", { avgScore: 5.0, scoreCount: 1 }],
      ["idea-3", { avgScore: 4.0, scoreCount: 3 }],
      ["idea-4", { avgScore: 1.0, scoreCount: 1 }],
    ]);
    setupScoreMap(map);

    const { GET } = await import("@/app/api/ideas/route");
    const res = await GET(makeRequest("http://localhost:3000/api/ideas?sortBy=avgScore&sortDir=desc") as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.map((i: { id: string }) => i.id)).toEqual(["idea-2", "idea-3", "idea-1", "idea-4"]);
  });

  it("sorts by avgScore ascending", async () => {
    authed();
    mockListIdeas.mockResolvedValue({ data: [...sampleIdeas], error: null });
    const map = new Map([
      ["idea-1", { avgScore: 3.0, scoreCount: 2 }],
      ["idea-2", { avgScore: 5.0, scoreCount: 1 }],
      ["idea-3", { avgScore: 4.0, scoreCount: 3 }],
      ["idea-4", { avgScore: 1.0, scoreCount: 1 }],
    ]);
    setupScoreMap(map);

    const { GET } = await import("@/app/api/ideas/route");
    const res = await GET(makeRequest("http://localhost:3000/api/ideas?sortBy=avgScore&sortDir=asc") as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.map((i: { id: string }) => i.id)).toEqual(["idea-4", "idea-1", "idea-3", "idea-2"]);
  });

  it("unscored ideas sort to bottom regardless of direction", async () => {
    authed();
    mockListIdeas.mockResolvedValue({ data: [...sampleIdeas], error: null });
    const map = new Map([
      ["idea-1", { avgScore: 3.0, scoreCount: 2 }],
      // idea-2 unscored
      ["idea-3", { avgScore: 5.0, scoreCount: 1 }],
      // idea-4 unscored
    ]);
    setupScoreMap(map);

    const { GET } = await import("@/app/api/ideas/route");
    const resDesc = await GET(makeRequest("http://localhost:3000/api/ideas?sortBy=avgScore&sortDir=desc") as any);
    const bodyDesc = await resDesc.json();

    // Scored first (desc), then unscored at bottom
    expect(bodyDesc[0].id).toBe("idea-3");
    expect(bodyDesc[1].id).toBe("idea-1");
    expect(bodyDesc[2].avgScore).toBeNull();
    expect(bodyDesc[3].avgScore).toBeNull();
  });

  it("does not sort when sortBy is not avgScore", async () => {
    authed();
    mockListIdeas.mockResolvedValue({ data: [...sampleIdeas], error: null });
    const map = new Map([
      ["idea-1", { avgScore: 1.0, scoreCount: 1 }],
      ["idea-2", { avgScore: 5.0, scoreCount: 1 }],
    ]);
    setupScoreMap(map);

    const { GET } = await import("@/app/api/ideas/route");
    const res = await GET(makeRequest("http://localhost:3000/api/ideas") as any);
    const body = await res.json();

    // Maintains original order (no sorting applied)
    expect(body[0].id).toBe("idea-1");
    expect(body[1].id).toBe("idea-2");
  });

  it("defaults to descending when sortDir not provided", async () => {
    authed();
    mockListIdeas.mockResolvedValue({ data: [sampleIdeas[0], sampleIdeas[1]], error: null });
    const map = new Map([
      ["idea-1", { avgScore: 2.0, scoreCount: 1 }],
      ["idea-2", { avgScore: 4.0, scoreCount: 1 }],
    ]);
    setupScoreMap(map);

    const { GET } = await import("@/app/api/ideas/route");
    const res = await GET(makeRequest("http://localhost:3000/api/ideas?sortBy=avgScore") as any);
    const body = await res.json();

    // Default desc: higher score first
    expect(body[0].id).toBe("idea-2");
    expect(body[1].id).toBe("idea-1");
  });
});
