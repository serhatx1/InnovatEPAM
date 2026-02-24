import { describe, it, expect } from "vitest";

/**
 * Middleware configuration tests.
 * These verify the matcher config and protection logic without needing
 * a full Next.js server. The actual cookie/session logic is handled by
 * Supabase's updateSession which is tested via integration tests.
 */
describe("middleware configuration", () => {
  it("exports the middleware function", async () => {
    const mod = await import("../../middleware");
    expect(typeof mod.middleware).toBe("function");
  });

  it("matcher covers /ideas and /admin routes", async () => {
    const mod = await import("../../middleware");
    expect(mod.config.matcher).toContain("/ideas/:path*");
    expect(mod.config.matcher).toContain("/admin/:path*");
  });

  it("matcher does NOT include /auth/login", async () => {
    const mod = await import("../../middleware");
    const matchers: string[] = mod.config.matcher;
    const coversLogin = matchers.some(
      (m) => m === "/auth/login" || m === "/auth/:path*"
    );
    expect(coversLogin).toBe(false);
  });

  it("matcher does NOT include /auth/register", async () => {
    const mod = await import("../../middleware");
    const matchers: string[] = mod.config.matcher;
    const coversRegister = matchers.some(
      (m) => m === "/auth/register" || m === "/auth/:path*"
    );
    expect(coversRegister).toBe(false);
  });

  it("matcher does NOT include root /", async () => {
    const mod = await import("../../middleware");
    const matchers: string[] = mod.config.matcher;
    expect(matchers).not.toContain("/");
  });
});
