import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock window.location.hash
Object.defineProperty(window, "location", {
  value: { hash: "", origin: "http://localhost:3000" },
  writable: true,
});

import EmailConfirmedPage from "@/app/auth/confirmed/page";

describe("EmailConfirmedPage", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("shows success when no hash error", () => {
    render(<EmailConfirmedPage />);
    expect(screen.getByText(/email confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
  });

  it("shows success when hash has no error params", () => {
    window.location.hash = "#access_token=xyz";
    render(<EmailConfirmedPage />);
    expect(screen.getByText(/email confirmed/i)).toBeInTheDocument();
  });

  it("shows error when hash contains error_description", () => {
    window.location.hash = "#error=server_error&error_description=Token+expired";
    render(<EmailConfirmedPage />);
    expect(screen.getByText(/confirmation failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Token expired/i)).toBeInTheDocument();
  });

  it("shows error_code when no error_description", () => {
    window.location.hash = "#error_code=403";
    render(<EmailConfirmedPage />);
    expect(screen.getByText(/confirmation failed/i)).toBeInTheDocument();
  });

  it("renders go to login link", () => {
    render(<EmailConfirmedPage />);
    expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute(
      "href",
      "/auth/login"
    );
  });
});
