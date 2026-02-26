import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────

const mockExchangeCodeForSession = vi.fn();
const mockVerifyOtp = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      verifyOtp: mockVerifyOtp,
    },
  })),
}));

import { GET } from "@/app/auth/confirm/route";
import { NextRequest } from "next/server";

// ── Tests ───────────────────────────────────────────────

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /auth/confirmed on successful code exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const request = new NextRequest("http://localhost:3000/auth/confirm?code=abc123");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/confirmed");
  });

  it("redirects to login error when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: "bad code" } });

    const request = new NextRequest("http://localhost:3000/auth/confirm?code=bad");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login?error=confirmation_failed");
  });

  it("verifies OTP when token_hash and type are provided", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=abc123&type=email"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/confirmed");
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "email",
      token_hash: "abc123",
    });
  });

  it("redirects to login error when OTP verification fails", async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: "bad otp" } });

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=bad&type=email"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login?error=confirmation_failed");
  });

  it("redirects to login error when no code or token provided", async () => {
    const request = new NextRequest("http://localhost:3000/auth/confirm");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login?error=confirmation_failed");
  });
});
