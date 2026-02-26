import { describe, it, expect } from "vitest";
import {
  reviewTransitionRequestSchema,
} from "@/lib/validation/review-transition";

describe("Review Transition Rules", () => {
  describe("reviewTransitionRequestSchema", () => {
    it("accepts valid advance action", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "advance",
        expectedStateVersion: 1,
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid return action", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "return",
        expectedStateVersion: 2,
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid hold action", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "hold",
        expectedStateVersion: 3,
      });
      expect(result.success).toBe(true);
    });

    it("accepts terminal_accept action", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "terminal_accept",
        expectedStateVersion: 5,
      });
      expect(result.success).toBe(true);
    });

    it("accepts terminal_reject action", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "terminal_reject",
        expectedStateVersion: 4,
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional comment", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "advance",
        expectedStateVersion: 1,
        comment: "Looks good to proceed",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid action", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "skip",
        expectedStateVersion: 1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero expectedStateVersion", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "advance",
        expectedStateVersion: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative expectedStateVersion", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "advance",
        expectedStateVersion: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer expectedStateVersion", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "advance",
        expectedStateVersion: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects comment exceeding 1000 characters", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "advance",
        expectedStateVersion: 1,
        comment: "A".repeat(1001),
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing expectedStateVersion", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "advance",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing action", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        expectedStateVersion: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Terminal action constraints", () => {
    it("terminal_accept is accepted as a valid action", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "terminal_accept",
        expectedStateVersion: 1,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("terminal_accept");
      }
    });

    it("terminal_reject is accepted as a valid action", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "terminal_reject",
        expectedStateVersion: 1,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("terminal_reject");
      }
    });

    it("terminal actions accept optional comment", () => {
      const result = reviewTransitionRequestSchema.safeParse({
        action: "terminal_accept",
        expectedStateVersion: 1,
        comment: "All criteria met for acceptance",
      });
      expect(result.success).toBe(true);
    });
  });
});
