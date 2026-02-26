import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();
const mockSingle = vi.fn();

function makeMockSupabase() {
  // Chain for getBlindReviewEnabled: from → select → eq → maybeSingle
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelect.mockReturnValue({ eq: mockEq });

  // Chain for setBlindReviewEnabled: from → upsert → select → single
  mockSingle.mockResolvedValue({ data: null, error: null });
  const selectAfterUpsert = vi.fn().mockReturnValue({ single: mockSingle });
  mockUpsert.mockReturnValue({ select: selectAfterUpsert });

  return {
    from: vi.fn((table: string) => {
      if (table !== "portal_setting") throw new Error(`Unexpected table: ${table}`);
      return {
        select: mockSelect,
        upsert: mockUpsert,
      };
    }),
  } as any;
}

// ── Tests ───────────────────────────────────────────────

describe("getBlindReviewEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns false (default) when no setting exists", async () => {
    const supabase = makeMockSupabase();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { getBlindReviewEnabled } = await import("@/lib/queries/portal-settings");
    const result = await getBlindReviewEnabled(supabase);

    expect(result.enabled).toBe(false);
    expect(result.updatedBy).toBeNull();
    expect(result.updatedAt).toBeNull();
  });

  it("returns true when setting value is true", async () => {
    const supabase = makeMockSupabase();
    mockMaybeSingle.mockResolvedValue({
      data: { value: true, updated_by: "admin-1", updated_at: "2026-01-01T00:00:00Z" },
      error: null,
    });

    const { getBlindReviewEnabled } = await import("@/lib/queries/portal-settings");
    const result = await getBlindReviewEnabled(supabase);

    expect(result.enabled).toBe(true);
    expect(result.updatedBy).toBe("admin-1");
    expect(result.updatedAt).toBe("2026-01-01T00:00:00Z");
  });

  it("returns false when setting value is false", async () => {
    const supabase = makeMockSupabase();
    mockMaybeSingle.mockResolvedValue({
      data: { value: false, updated_by: "admin-1", updated_at: "2026-01-01T00:00:00Z" },
      error: null,
    });

    const { getBlindReviewEnabled } = await import("@/lib/queries/portal-settings");
    const result = await getBlindReviewEnabled(supabase);

    expect(result.enabled).toBe(false);
  });

  it("returns false on database error", async () => {
    const supabase = makeMockSupabase();
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });

    const { getBlindReviewEnabled } = await import("@/lib/queries/portal-settings");
    const result = await getBlindReviewEnabled(supabase);

    expect(result.enabled).toBe(false);
  });
});

describe("setBlindReviewEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns updated setting on success", async () => {
    const supabase = makeMockSupabase();
    mockSingle.mockResolvedValue({
      data: { value: true, updated_by: "admin-1", updated_at: "2026-02-01T00:00:00Z" },
      error: null,
    });

    const { setBlindReviewEnabled } = await import("@/lib/queries/portal-settings");
    const result = await setBlindReviewEnabled(supabase, true, "admin-1");

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      enabled: true,
      updatedBy: "admin-1",
      updatedAt: "2026-02-01T00:00:00Z",
    });
  });

  it("returns error on database failure", async () => {
    const supabase = makeMockSupabase();
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "RLS violation" },
    });

    const { setBlindReviewEnabled } = await import("@/lib/queries/portal-settings");
    const result = await setBlindReviewEnabled(supabase, true, "admin-1");

    expect(result.data).toBeNull();
    expect(result.error).toBe("RLS violation");
  });

  it("can disable blind review", async () => {
    const supabase = makeMockSupabase();
    mockSingle.mockResolvedValue({
      data: { value: false, updated_by: "admin-1", updated_at: "2026-02-01T01:00:00Z" },
      error: null,
    });

    const { setBlindReviewEnabled } = await import("@/lib/queries/portal-settings");
    const result = await setBlindReviewEnabled(supabase, false, "admin-1");

    expect(result.error).toBeNull();
    expect(result.data?.enabled).toBe(false);
  });
});
