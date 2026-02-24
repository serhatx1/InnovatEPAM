import { describe, it, expect } from "vitest";
import { ROLES, isAdmin } from "@/lib/auth/roles";

describe("roles", () => {
  it("defines SUBMITTER and ADMIN constants", () => {
    expect(ROLES.SUBMITTER).toBe("submitter");
    expect(ROLES.ADMIN).toBe("admin");
  });

  it("isAdmin returns true for admin role", () => {
    expect(isAdmin("admin")).toBe(true);
  });

  it("isAdmin returns false for submitter role", () => {
    expect(isAdmin("submitter")).toBe(false);
  });

  it("isAdmin returns false for null/undefined", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it("isAdmin returns false for arbitrary string", () => {
    expect(isAdmin("manager")).toBe(false);
  });
});
