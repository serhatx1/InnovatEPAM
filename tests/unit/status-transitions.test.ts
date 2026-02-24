import { describe, it, expect } from "vitest";
import { isValidTransition } from "@/lib/validation/status";

describe("isValidTransition", () => {
  // Valid transitions
  it("allows submitted → under_review", () => {
    expect(isValidTransition("submitted", "under_review")).toBe(true);
  });

  it("allows submitted → accepted (direct evaluation)", () => {
    expect(isValidTransition("submitted", "accepted")).toBe(true);
  });

  it("allows submitted → rejected (direct evaluation)", () => {
    expect(isValidTransition("submitted", "rejected")).toBe(true);
  });

  it("allows under_review → accepted", () => {
    expect(isValidTransition("under_review", "accepted")).toBe(true);
  });

  it("allows under_review → rejected", () => {
    expect(isValidTransition("under_review", "rejected")).toBe(true);
  });

  // Invalid transitions
  it("rejects accepted → submitted (reversal)", () => {
    expect(isValidTransition("accepted", "submitted")).toBe(false);
  });

  it("rejects rejected → accepted (reversal)", () => {
    expect(isValidTransition("rejected", "accepted")).toBe(false);
  });

  it("rejects accepted → rejected (terminal-to-terminal)", () => {
    expect(isValidTransition("accepted", "rejected")).toBe(false);
  });

  it("rejects rejected → submitted (reversal)", () => {
    expect(isValidTransition("rejected", "submitted")).toBe(false);
  });

  it("rejects accepted → under_review (reversal)", () => {
    expect(isValidTransition("accepted", "under_review")).toBe(false);
  });

  it("rejects under_review → submitted (backward)", () => {
    expect(isValidTransition("under_review", "submitted")).toBe(false);
  });

  // Edge cases
  it("rejects unknown current status", () => {
    expect(isValidTransition("unknown" as any, "accepted")).toBe(false);
  });

  it("rejects same-to-same transition", () => {
    expect(isValidTransition("submitted", "submitted")).toBe(false);
  });
});
