import { describe, it, expect } from "vitest";
import { ideaSchema, validateFile } from "@/lib/validation/idea";
import { statusUpdateSchema } from "@/lib/validation/status";
import { IDEA_CATEGORIES } from "@/lib/constants";

// ── ideaSchema ─────────────────────────────────────────

describe("ideaSchema", () => {
  const validInput = {
    title: "Automate onboarding process",
    description: "Use AI to streamline new-hire onboarding process across teams",
    category: "Process Improvement" as const,
  };

  it("accepts valid idea input", () => {
    const result = ideaSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  // Title constraints (FR-10: 5–100 chars)
  it("rejects title shorter than 5 characters", () => {
    const result = ideaSchema.safeParse({ ...validInput, title: "Abcd" });
    expect(result.success).toBe(false);
  });

  it("accepts title with exactly 5 characters", () => {
    const result = ideaSchema.safeParse({ ...validInput, title: "Abcde" });
    expect(result.success).toBe(true);
  });

  it("accepts title with exactly 100 characters", () => {
    const result = ideaSchema.safeParse({ ...validInput, title: "A".repeat(100) });
    expect(result.success).toBe(true);
  });

  it("rejects title longer than 100 characters", () => {
    const result = ideaSchema.safeParse({ ...validInput, title: "A".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = ideaSchema.safeParse({ ...validInput, title: "" });
    expect(result.success).toBe(false);
  });

  // Description constraints (FR-11: 20–1000 chars)
  it("rejects description shorter than 20 characters", () => {
    const result = ideaSchema.safeParse({ ...validInput, description: "Too short text." });
    expect(result.success).toBe(false);
  });

  it("accepts description with exactly 20 characters", () => {
    const result = ideaSchema.safeParse({ ...validInput, description: "A".repeat(20) });
    expect(result.success).toBe(true);
  });

  it("accepts description with exactly 1000 characters", () => {
    const result = ideaSchema.safeParse({ ...validInput, description: "A".repeat(1000) });
    expect(result.success).toBe(true);
  });

  it("rejects description longer than 1000 characters", () => {
    const result = ideaSchema.safeParse({ ...validInput, description: "A".repeat(1001) });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = ideaSchema.safeParse({ ...validInput, description: "" });
    expect(result.success).toBe(false);
  });

  // Category constraints (FR-12: enum from IDEA_CATEGORIES)
  it("accepts all valid categories", () => {
    for (const cat of IDEA_CATEGORIES) {
      const result = ideaSchema.safeParse({ ...validInput, category: cat });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid category", () => {
    const result = ideaSchema.safeParse({ ...validInput, category: "Invalid Category" });
    expect(result.success).toBe(false);
  });

  it("rejects empty category", () => {
    const result = ideaSchema.safeParse({ ...validInput, category: "" });
    expect(result.success).toBe(false);
  });

  it("rejects entirely missing fields", () => {
    const result = ideaSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── validateFile ───────────────────────────────────────

describe("validateFile", () => {
  function createMockFile(name: string, size: number, type: string): File {
    const buffer = new ArrayBuffer(size);
    return new File([buffer], name, { type });
  }

  it("accepts a valid PDF file", () => {
    const file = createMockFile("doc.pdf", 1024, "application/pdf");
    const result = validateFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("accepts a valid PNG file", () => {
    const file = createMockFile("img.png", 2048, "image/png");
    const result = validateFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts a valid JPEG file", () => {
    const file = createMockFile("photo.jpg", 2048, "image/jpeg");
    const result = validateFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts a valid DOCX file", () => {
    const file = createMockFile(
      "report.docx",
      1024,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    const result = validateFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts a file exactly at 5 MB", () => {
    const file = createMockFile("big.pdf", 5 * 1024 * 1024, "application/pdf");
    const result = validateFile(file);
    expect(result.valid).toBe(true);
  });

  it("rejects a file exceeding 5 MB", () => {
    const file = createMockFile("huge.pdf", 5 * 1024 * 1024 + 1, "application/pdf");
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("5 MB");
  });

  it("rejects an unsupported MIME type (text/plain)", () => {
    const file = createMockFile("readme.txt", 100, "text/plain");
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("PDF");
  });

  it("rejects an unsupported MIME type (application/zip)", () => {
    const file = createMockFile("archive.zip", 100, "application/zip");
    const result = validateFile(file);
    expect(result.valid).toBe(false);
  });
});

// ── statusUpdateSchema ─────────────────────────────────

describe("statusUpdateSchema", () => {
  it("accepts status=accepted without comment", () => {
    const result = statusUpdateSchema.safeParse({ status: "accepted" });
    expect(result.success).toBe(true);
  });

  it("accepts status=accepted with optional comment", () => {
    const result = statusUpdateSchema.safeParse({
      status: "accepted",
      evaluatorComment: "Great idea!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts status=under_review without comment", () => {
    const result = statusUpdateSchema.safeParse({ status: "under_review" });
    expect(result.success).toBe(true);
  });

  it("accepts status=rejected with comment ≥ 10 chars", () => {
    const result = statusUpdateSchema.safeParse({
      status: "rejected",
      evaluatorComment: "This does not align with our strategy",
    });
    expect(result.success).toBe(true);
  });

  it("accepts status=rejected with exactly 10-char comment", () => {
    const result = statusUpdateSchema.safeParse({
      status: "rejected",
      evaluatorComment: "1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("rejects status=rejected without comment", () => {
    const result = statusUpdateSchema.safeParse({ status: "rejected" });
    expect(result.success).toBe(false);
  });

  it("rejects status=rejected with comment < 10 chars", () => {
    const result = statusUpdateSchema.safeParse({
      status: "rejected",
      evaluatorComment: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects status=rejected with empty comment", () => {
    const result = statusUpdateSchema.safeParse({
      status: "rejected",
      evaluatorComment: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status value", () => {
    const result = statusUpdateSchema.safeParse({ status: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects status=submitted (not a valid admin action)", () => {
    const result = statusUpdateSchema.safeParse({ status: "submitted" });
    expect(result.success).toBe(false);
  });
});
