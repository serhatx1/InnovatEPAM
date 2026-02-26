import { describe, it, expect } from "vitest";
import { scoreSubmissionSchema } from "@/lib/validation/score";

describe("scoreSubmissionSchema", () => {
  it("accepts a valid score with comment", () => {
    const result = scoreSubmissionSchema.safeParse({ score: 4, comment: "Good idea" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.score).toBe(4);
      expect(result.data.comment).toBe("Good idea");
    }
  });

  it("accepts a valid score without comment", () => {
    const result = scoreSubmissionSchema.safeParse({ score: 3 });
    expect(result.success).toBe(true);
  });

  it("accepts score = 1 (minimum)", () => {
    const result = scoreSubmissionSchema.safeParse({ score: 1 });
    expect(result.success).toBe(true);
  });

  it("accepts score = 5 (maximum)", () => {
    const result = scoreSubmissionSchema.safeParse({ score: 5 });
    expect(result.success).toBe(true);
  });

  it("accepts null comment", () => {
    const result = scoreSubmissionSchema.safeParse({ score: 3, comment: null });
    expect(result.success).toBe(true);
  });

  it("rejects score below 1", () => {
    const result = scoreSubmissionSchema.safeParse({ score: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects score above 5", () => {
    const result = scoreSubmissionSchema.safeParse({ score: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer score (decimal)", () => {
    const result = scoreSubmissionSchema.safeParse({ score: 3.5 });
    expect(result.success).toBe(false);
  });

  it("rejects missing score", () => {
    const result = scoreSubmissionSchema.safeParse({ comment: "No score" });
    expect(result.success).toBe(false);
  });

  it("rejects comment exceeding 500 characters", () => {
    const longComment = "a".repeat(501);
    const result = scoreSubmissionSchema.safeParse({ score: 3, comment: longComment });
    expect(result.success).toBe(false);
  });

  it("accepts comment at exactly 500 characters", () => {
    const maxComment = "a".repeat(500);
    const result = scoreSubmissionSchema.safeParse({ score: 3, comment: maxComment });
    expect(result.success).toBe(true);
  });

  it("trims whitespace from comment", () => {
    const result = scoreSubmissionSchema.safeParse({ score: 3, comment: "  trimmed  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.comment).toBe("trimmed");
    }
  });

  it("rejects non-number score (string)", () => {
    const result = scoreSubmissionSchema.safeParse({ score: "four" });
    expect(result.success).toBe(false);
  });
});
