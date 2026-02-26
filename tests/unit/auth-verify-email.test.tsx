import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VerifyEmailPage from "@/app/auth/verify-email/page";

describe("VerifyEmailPage", () => {
  it("renders with provided email", async () => {
    const page = await VerifyEmailPage({
      searchParams: Promise.resolve({ email: "test@example.com" }),
    });
    render(page);
    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("renders without email param", async () => {
    const page = await VerifyEmailPage({
      searchParams: Promise.resolve({}),
    });
    render(page);
    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/your inbox/i)).toBeInTheDocument();
  });

  it("has back to login link", async () => {
    const page = await VerifyEmailPage({
      searchParams: Promise.resolve({}),
    });
    render(page);
    expect(screen.getByRole("link", { name: /back to login/i })).toHaveAttribute(
      "href",
      "/auth/login"
    );
  });
});
