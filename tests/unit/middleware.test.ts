import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock the supabase middleware module
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn().mockResolvedValue(NextResponse.next()),
}));

import { middleware, config } from "../../middleware";

function createRequest(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const url = new URL(pathname, "http://localhost:3000");
  const req = new NextRequest(url);

  // Add cookies
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }

  return req;
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows unauthenticated access to /auth/login", async () => {
    const req = createRequest("/auth/login");
    const res = await middleware(req);
    // Should not redirect
    expect(res.status).not.toBe(307);
  });

  it("allows unauthenticated access to /auth/register", async () => {
    const req = createRequest("/auth/register");
    const res = await middleware(req);
    expect(res.status).not.toBe(307);
  });

  it("allows unauthenticated access to /", async () => {
    const req = createRequest("/");
    const res = await middleware(req);
    expect(res.status).not.toBe(307);
  });

  it("redirects unauthenticated requests to /ideas to /auth/login", async () => {
    const req = createRequest("/ideas");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/login");
  });

  it("redirects unauthenticated requests to /admin/review to /auth/login", async () => {
    const req = createRequest("/admin/review");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/login");
  });

  it("allows authenticated requests to /ideas", async () => {
    const req = createRequest("/ideas", {
      "sb-test-auth-token": "some-token",
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(307);
  });

  it("allows authenticated requests to /admin/review", async () => {
    const req = createRequest("/admin/review", {
      "sb-test-auth-token": "some-token",
    });
    const res = await middleware(req);
    expect(res.status).not.toBe(307);
  });
});

describe("middleware config", () => {
  it("matches /ideas/:path* and /admin/:path*", () => {
    expect(config.matcher).toContain("/ideas/:path*");
    expect(config.matcher).toContain("/admin/:path*");
  });
});
