import { describe, it, expect } from "vitest";

/**
 * Integration-level smoke tests that verify the API route modules
 * can be imported without errors. Actual HTTP testing would require
 * a running Next.js server or MSW.
 */
describe("API route smoke tests", () => {
  it("ideas API route module exports GET and POST", async () => {
    const mod = await import("@/app/api/ideas/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });

  it("idea detail API route module exports GET", async () => {
    const mod = await import("@/app/api/ideas/[id]/route");
    expect(typeof mod.GET).toBe("function");
  });

  it("admin status API route module exports PATCH", async () => {
    const mod = await import("@/app/api/admin/ideas/[id]/status/route");
    expect(typeof mod.PATCH).toBe("function");
  });
});

describe("storage utility smoke test", () => {
  it("storage module exports uploadIdeaAttachment and getAttachmentUrl", async () => {
    const mod = await import("@/lib/supabase/storage");
    expect(typeof mod.uploadIdeaAttachment).toBe("function");
    expect(typeof mod.getAttachmentUrl).toBe("function");
  });
});
