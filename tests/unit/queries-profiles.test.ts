import { describe, it, expect, vi } from "vitest";
import { getUserRole } from "@/lib/queries/profiles";

describe("getUserRole", () => {
  it("returns the role string for an existing user", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const role = await getUserRole(supabase, "user-123");

    expect(role).toBe("admin");
    expect(supabase.from).toHaveBeenCalledWith("user_profile");
    expect(chainable.eq).toHaveBeenCalledWith("id", "user-123");
  });

  it("returns 'submitter' for a standard user", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: "submitter" },
        error: null,
      }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const role = await getUserRole(supabase, "user-456");
    expect(role).toBe("submitter");
  });

  it("returns null when user is not found", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const role = await getUserRole(supabase, "nonexistent");
    expect(role).toBeNull();
  });

  it("returns null when data has no role field", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const role = await getUserRole(supabase, "user-789");
    expect(role).toBeNull();
  });
});
