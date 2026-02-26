import { describe, it, expect } from "vitest";

describe("AppShell — drafts nav", () => {
  it("app-shell module exports AppShell component", async () => {
    const mod = await import("@/components/app-shell");
    expect(typeof mod.AppShell).toBe("function");
  });
});
