import { describe, it, expect, vi, beforeEach } from "vitest";

// T021: Tests for /ideas/drafts listing page
// These test the API smoke and route module exports

describe("Drafts page route", () => {
  it("drafts page module exports default component", async () => {
    const mod = await import("@/app/ideas/drafts/page");
    expect(typeof mod.default).toBe("function");
  });
});

describe("Drafts API module", () => {
  it("exports GET and POST handlers for /api/drafts", async () => {
    const mod = await import("@/app/api/drafts/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });

  it("exports GET, PATCH, DELETE handlers for /api/drafts/[id]", async () => {
    const mod = await import("@/app/api/drafts/[id]/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.PATCH).toBe("function");
    expect(typeof mod.DELETE).toBe("function");
  });

  it("exports POST handler for /api/drafts/[id]/submit", async () => {
    const mod = await import("@/app/api/drafts/[id]/submit/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("exports GET handler for /api/drafts/count", async () => {
    const mod = await import("@/app/api/drafts/count/route");
    expect(typeof mod.GET).toBe("function");
  });

  it("exports POST handler for /api/drafts/staging/upload", async () => {
    const mod = await import("@/app/api/drafts/staging/upload/route");
    expect(typeof mod.POST).toBe("function");
  });
});
