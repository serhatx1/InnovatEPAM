import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// ── Mocks ───────────────────────────────────────────────

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), refresh: vi.fn() }),
}));

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

// Mock window.location.hash
Object.defineProperty(window, "location", {
  value: { hash: "", origin: "http://localhost:3000" },
  writable: true,
});

import EmailConfirmedPage from "@/app/auth/confirmed/page";

describe("EmailConfirmedPage", () => {
  beforeEach(() => {
    window.location.hash = "";
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockReplace.mockClear();
  });

  it("shows success when no hash error", async () => {
    render(<EmailConfirmedPage />);
    await waitFor(() => {
      expect(screen.getByText(/email confirmed/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
  });

  it("shows success when hash has no error params", async () => {
    window.location.hash = "#access_token=xyz";
    render(<EmailConfirmedPage />);
    await waitFor(() => {
      expect(screen.getByText(/email confirmed/i)).toBeInTheDocument();
    });
  });

  it("shows error when hash contains error_description", async () => {
    window.location.hash = "#error=server_error&error_description=Token+expired";
    render(<EmailConfirmedPage />);
    await waitFor(() => {
      expect(screen.getByText(/confirmation failed/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Token expired/i)).toBeInTheDocument();
  });

  it("shows error_code when no error_description", async () => {
    window.location.hash = "#error_code=403";
    render(<EmailConfirmedPage />);
    await waitFor(() => {
      expect(screen.getByText(/confirmation failed/i)).toBeInTheDocument();
    });
  });

  it("renders go to login link", async () => {
    window.location.hash = "#error=server_error&error_description=Failed";
    render(<EmailConfirmedPage />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute(
        "href",
        "/auth/login"
      );
    });
  });
});
