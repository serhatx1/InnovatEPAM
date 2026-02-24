import { describe, it, expect, vi } from "vitest";
import { getUserRole } from "@/lib/queries/profiles";

function createMockSupabase(data: any, error: any = null) {
  const mockSingle = vi.fn().mockResolvedValue({ data, error });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  return { from: mockFrom, _mocks: { mockFrom, mockSelect, mockEq, mockSingle } };
}

describe("getUserRole", () => {
  it("returns the role string for an existing user", async () => {
    const supabase = createMockSupabase({ role: "admin" });

    const role = await getUserRole(supabase as any, "user-1");

    expect(supabase.from).toHaveBeenCalledWith("user_profile");
    expect(supabase._mocks.mockSelect).toHaveBeenCalledWith("role");
    expect(supabase._mocks.mockEq).toHaveBeenCalledWith("id", "user-1");
    expect(role).toBe("admin");
  });

  it("returns 'submitter' for a default user", async () => {
    const supabase = createMockSupabase({ role: "submitter" });

    const role = await getUserRole(supabase as any, "user-2");
    expect(role).toBe("submitter");
  });

  it("returns null when user not found", async () => {
    const supabase = createMockSupabase(null, { message: "Not found" });

    const role = await getUserRole(supabase as any, "nonexistent");
    expect(role).toBeNull();
  });
});
