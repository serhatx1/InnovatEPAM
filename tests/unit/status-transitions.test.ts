import { describe, it, expect } from "vitest";
import { isValidTransition } from "@/lib/validation/status";

describe("isValidTransition", () => {
  // Valid transitions
  it("allows submitted → under_review", () => {
    expect(isValidTransition("submitted", "under_review")).toBe(true);
  });

  it("allows submitted → accepted", () => {
    expect(isValidTransition("submitted", "accepted")).toBe(true);
  });

  it("allows submitted → rejected", () => {
    expect(isValidTransition("submitted", "rejected")).toBe(true);
  });

  it("allows under_review → accepted", () => {
    expect(isValidTransition("under_review", "accepted")).toBe(true);
  });

  it("allows under_review → rejected", () => {
    expect(isValidTransition("under_review", "rejected")).toBe(true);
  });

  // Invalid transitions
  it("blocks accepted → submitted (reversal)", () => {
    expect(isValidTransition("accepted", "submitted")).toBe(false);
  });

  it("blocks rejected → accepted (reversal)", () => {
    expect(isValidTransition("rejected", "accepted")).toBe(false);
  });

  it("blocks accepted → rejected (terminal-to-terminal)", () => {
    expect(isValidTransition("accepted", "rejected")).toBe(false);
  });

  it("blocks rejected → submitted (reversal)", () => {
    expect(isValidTransition("rejected", "submitted")).toBe(false);
  });

  it("blocks under_review → submitted (backward)", () => {
    expect(isValidTransition("under_review", "submitted")).toBe(false);
  });

  // Edge cases
  it("returns false for unknown current status", () => {
    expect(isValidTransition("unknown", "accepted")).toBe(false);
  });

  it("returns false for same-status transition", () => {
    expect(isValidTransition("submitted", "submitted")).toBe(false);
  });
});
