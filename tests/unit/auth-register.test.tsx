import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ── Mocks ───────────────────────────────────────────────

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockSignUp = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signUp: mockSignUp },
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import RegisterPage from "@/app/auth/register/page";
import { toast } from "sonner";

// ── Tests ───────────────────────────────────────────────

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.origin used in emailRedirectTo
    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:3000", hash: "" },
      writable: true,
    });
  });

  it("renders registration form", () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("renders link to login page", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("link", { name: /login/i })).toHaveAttribute("href", "/auth/login");
  });

  it("registers successfully with email confirmation required", async () => {
    mockSignUp.mockResolvedValue({
      data: { session: null, user: { id: "u-1", identities: [{}] } },
      error: null,
    });
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Check your email to confirm your account.");
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/auth/verify-email"));
    });
  });

  it("registers with immediate session (email confirmation disabled)", async () => {
    mockSignUp.mockResolvedValue({
      data: { session: { access_token: "tok" }, user: { id: "u-1" } },
      error: null,
    });
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Registration successful. Redirecting...");
      expect(mockPush).toHaveBeenCalledWith("/ideas");
    });
  });

  it("shows error for duplicate email", async () => {
    mockSignUp.mockResolvedValue({
      data: {
        session: null,
        user: { id: "u-1", identities: [] },
      },
      error: null,
    });
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "existing@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("already exists")
      );
    });
  });

  it("shows error toast on sign up failure", async () => {
    mockSignUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Sign up failed" },
    });
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "fail@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Sign up failed");
    });
  });
});
