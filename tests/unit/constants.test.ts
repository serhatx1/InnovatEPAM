import { describe, it, expect } from "vitest";
import {
  IDEA_CATEGORIES,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  VALID_TRANSITIONS,
} from "@/lib/constants";

describe("IDEA_CATEGORIES", () => {
  it("contains exactly 5 categories", () => {
    expect(IDEA_CATEGORIES).toHaveLength(5);
  });

  it("contains the expected category values", () => {
    expect(IDEA_CATEGORIES).toContain("Process Improvement");
    expect(IDEA_CATEGORIES).toContain("Technology Innovation");
    expect(IDEA_CATEGORIES).toContain("Cost Reduction");
    expect(IDEA_CATEGORIES).toContain("Customer Experience");
    expect(IDEA_CATEGORIES).toContain("Employee Engagement");
  });

  it("is a readonly tuple", () => {
    // Verify it's an array (readonly tuples are arrays at runtime)
    expect(Array.isArray(IDEA_CATEGORIES)).toBe(true);
  });
});

describe("MAX_FILE_SIZE", () => {
  it("equals 5 MB (5 * 1024 * 1024 bytes)", () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });
});

describe("ALLOWED_FILE_TYPES", () => {
  it("includes PDF, PNG, JPEG, and DOCX MIME types", () => {
    expect(ALLOWED_FILE_TYPES).toContain("application/pdf");
    expect(ALLOWED_FILE_TYPES).toContain("image/png");
    expect(ALLOWED_FILE_TYPES).toContain("image/jpeg");
    expect(ALLOWED_FILE_TYPES).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("contains exactly 4 allowed types", () => {
    expect(ALLOWED_FILE_TYPES).toHaveLength(4);
  });
});

describe("VALID_TRANSITIONS", () => {
  it("allows submitted → under_review, accepted, rejected", () => {
    expect(VALID_TRANSITIONS.submitted).toEqual(
      expect.arrayContaining(["under_review", "accepted", "rejected"])
    );
  });

  it("allows under_review → accepted, rejected", () => {
    expect(VALID_TRANSITIONS.under_review).toEqual(
      expect.arrayContaining(["accepted", "rejected"])
    );
  });

  it("allows no transitions from accepted (terminal)", () => {
    expect(VALID_TRANSITIONS.accepted).toEqual([]);
  });

  it("allows no transitions from rejected (terminal)", () => {
    expect(VALID_TRANSITIONS.rejected).toEqual([]);
  });
});
