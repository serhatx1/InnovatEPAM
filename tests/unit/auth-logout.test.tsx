import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ── Mocks ───────────────────────────────────────────────

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockSignOut = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import LogoutPage from "@/app/auth/logout/page";
import { toast } from "sonner";

// ── Tests ───────────────────────────────────────────────

describe("LogoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders logout page with heading and button", () => {
    render(<LogoutPage />);
    expect(screen.getByText(/end your current session/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("signs out and redirects on button click", async () => {
    mockSignOut.mockResolvedValue({});
    render(<LogoutPage />);

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Logged out");
      expect(mockPush).toHaveBeenCalledWith("/auth/login");
    });
  });
});
