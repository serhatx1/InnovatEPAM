import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateIdea = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } } })),
    },
    from: vi.fn(() => ({ select: vi.fn(() => ({ in: vi.fn(async () => ({ data: [], error: null })) })) })),
  })),
}));

vi.mock("@/lib/queries", () => ({
  listIdeas: vi.fn(),
  createIdea: (...args: unknown[]) => mockCreateIdea(...args),
  createAttachments: vi.fn(),
  bindSubmittedIdeaToWorkflow: vi.fn(async () => ({ data: null, error: null })),
  getUserRole: vi.fn(async () => "submitter"),
}));

vi.mock("@/lib/queries/portal-settings", () => ({
  getBlindReviewEnabled: vi.fn(async () => ({ enabled: false, updatedBy: null, updatedAt: null })),
}));

vi.mock("@/lib/review/blind-review", () => ({
  anonymizeIdeaList: vi.fn((ideas: unknown[]) => ideas),
}));

vi.mock("@/lib/supabase/storage", () => ({
  uploadIdeaAttachment: vi.fn(),
}));

describe("POST /api/ideas dynamic fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing required category-specific fields", async () => {
    const { POST } = await import("@/app/api/ideas/route");

    const formData = new FormData();
    formData.set("title", "Reduce Ops Cost");
    formData.set(
      "description",
      "A long enough description that satisfies base validation requirements."
    );
    formData.set("category", "Cost Reduction");
    formData.set("category_fields", JSON.stringify({ estimated_savings: "500" }));

    const request = { formData: async () => formData } as any;
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(body.details["category_fields.cost_area"]).toBeTruthy();
    expect(mockCreateIdea).not.toHaveBeenCalled();
  });

  it("creates idea with validated category_fields on success", async () => {
    mockCreateIdea.mockResolvedValue({
      data: { id: "idea-1", category_fields: { estimated_savings: 1000 } },
      error: null,
    });

    const { POST } = await import("@/app/api/ideas/route");

    const formData = new FormData();
    formData.set("title", "Save Costs in Vendor Spend");
    formData.set(
      "description",
      "A detailed and valid description for this cost reduction idea submission."
    );
    formData.set("category", "Cost Reduction");
    formData.set(
      "category_fields",
      JSON.stringify({ cost_area: "Vendors", estimated_savings: "1000", stale: "x" })
    );

    const request = { formData: async () => formData } as any;
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockCreateIdea).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        category: "Cost Reduction",
        category_fields: { cost_area: "Vendors", estimated_savings: 1000 },
      })
    );
  });
});
