import { describe, it, expect } from "vitest";
import {
  reviewTransitionRequestSchema,
  reviewTransitionResponseSchema,
} from "@/lib/validation/review-transition";

describe("reviewTransitionRequestSchema", () => {
  it("accepts valid transition request", () => {
    const result = reviewTransitionRequestSchema.safeParse({
      action: "advance",
      expectedStateVersion: 3,
      comment: "Looks good",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = reviewTransitionRequestSchema.safeParse({
      action: "invalid_action",
      expectedStateVersion: 1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-positive expectedStateVersion", () => {
    const result = reviewTransitionRequestSchema.safeParse({
      action: "hold",
      expectedStateVersion: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe("reviewTransitionResponseSchema", () => {
  it("accepts valid transition response", () => {
    const result = reviewTransitionResponseSchema.safeParse({
      ideaId: "550e8400-e29b-41d4-a716-446655440000",
      workflowId: "550e8400-e29b-41d4-a716-446655440031",
      currentStageId: "550e8400-e29b-41d4-a716-446655440032",
      currentStageName: "Technical Review",
      stateVersion: 4,
      terminalOutcome: null,
      updatedAt: "2026-02-26T10:03:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("accepts terminal outcome values", () => {
    const accepted = reviewTransitionResponseSchema.safeParse({
      ideaId: "550e8400-e29b-41d4-a716-446655440000",
      workflowId: "550e8400-e29b-41d4-a716-446655440031",
      currentStageId: "550e8400-e29b-41d4-a716-446655440032",
      currentStageName: "Final Decision",
      stateVersion: 5,
      terminalOutcome: "accepted",
      updatedAt: "2026-02-26T10:03:00.000Z",
    });

    const rejected = reviewTransitionResponseSchema.safeParse({
      ideaId: "550e8400-e29b-41d4-a716-446655440000",
      workflowId: "550e8400-e29b-41d4-a716-446655440031",
      currentStageId: "550e8400-e29b-41d4-a716-446655440032",
      currentStageName: "Final Decision",
      stateVersion: 5,
      terminalOutcome: "rejected",
      updatedAt: "2026-02-26T10:03:00.000Z",
    });

    expect(accepted.success).toBe(true);
    expect(rejected.success).toBe(true);
  });
});
