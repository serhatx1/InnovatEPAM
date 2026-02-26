import { describe, it, expect } from "vitest";
import {
  reviewStageInputSchema,
  reviewWorkflowInputSchema,
  reviewWorkflowResponseSchema,
} from "@/lib/validation/review-workflow";

describe("reviewStageInputSchema", () => {
  it("accepts a valid stage name", () => {
    const result = reviewStageInputSchema.safeParse({ name: "Initial Screening" });
    expect(result.success).toBe(true);
  });

  it("rejects empty stage name", () => {
    const result = reviewStageInputSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("reviewWorkflowInputSchema", () => {
  it("accepts valid workflow with 3 stages", () => {
    const result = reviewWorkflowInputSchema.safeParse({
      stages: [
        { name: "Initial Screening" },
        { name: "Technical Review" },
        { name: "Final Decision" },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects fewer than 3 stages", () => {
    const result = reviewWorkflowInputSchema.safeParse({
      stages: [{ name: "Stage 1" }, { name: "Stage 2" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects more than 7 stages", () => {
    const result = reviewWorkflowInputSchema.safeParse({
      stages: [
        { name: "Stage 1" },
        { name: "Stage 2" },
        { name: "Stage 3" },
        { name: "Stage 4" },
        { name: "Stage 5" },
        { name: "Stage 6" },
        { name: "Stage 7" },
        { name: "Stage 8" },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate stage names (case-insensitive)", () => {
    const result = reviewWorkflowInputSchema.safeParse({
      stages: [
        { name: "Screening" },
        { name: "screening" },
        { name: "Final Decision" },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("accepts exactly 7 stages (upper boundary)", () => {
    const result = reviewWorkflowInputSchema.safeParse({
      stages: Array.from({ length: 7 }, (_, i) => ({ name: `Stage ${i + 1}` })),
    });

    expect(result.success).toBe(true);
  });

  it("trims whitespace from stage names before uniqueness check", () => {
    const result = reviewWorkflowInputSchema.safeParse({
      stages: [
        { name: "  Screening  " },
        { name: "Tech Review" },
        { name: "Final Decision" },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stages[0].name).toBe("Screening");
    }
  });

  it("rejects stage name exceeding 80 characters", () => {
    const longName = "A".repeat(81);
    const result = reviewWorkflowInputSchema.safeParse({
      stages: [{ name: longName }, { name: "Two" }, { name: "Three" }],
    });

    expect(result.success).toBe(false);
  });
});

describe("reviewWorkflowResponseSchema", () => {
  it("accepts a valid response payload", () => {
    const result = reviewWorkflowResponseSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440031",
      version: 2,
      is_active: true,
      activated_at: "2026-02-26T10:01:00.000Z",
      stages: [
        {
          id: "550e8400-e29b-41d4-a716-446655440032",
          name: "Initial Screening",
          position: 1,
          is_enabled: true,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts null activated_at", () => {
    const result = reviewWorkflowResponseSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440031",
      version: 1,
      is_active: false,
      activated_at: null,
      stages: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid uuid in response", () => {
    const result = reviewWorkflowResponseSchema.safeParse({
      id: "not-a-uuid",
      version: 1,
      is_active: true,
      activated_at: null,
      stages: [],
    });

    expect(result.success).toBe(false);
  });
});
