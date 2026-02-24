import { describe, it, expect } from "vitest";
import { ideaSchema, validateFile } from "@/lib/validation/idea";
import { statusUpdateSchema } from "@/lib/validation/status";
import { MAX_FILE_SIZE } from "@/lib/constants";

describe("ideaSchema", () => {
  it("accepts valid idea input", () => {
    const result = ideaSchema.safeParse({
      title: "Automate onboarding",
      description: "Use AI to streamline new-hire onboarding process",
      category: "Process Improvement",
    });
    expect(result.success).toBe(true);
  });

  it("rejects title shorter than 5 chars", () => {
    const result = ideaSchema.safeParse({
      title: "Hi",
      description: "A valid description that is long enough",
      category: "Process Improvement",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 100 chars", () => {
    const result = ideaSchema.safeParse({
      title: "A".repeat(101),
      description: "A valid description that is long enough",
      category: "Process Improvement",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description shorter than 20 chars", () => {
    const result = ideaSchema.safeParse({
      title: "Valid Title",
      description: "Too short",
      category: "Process Improvement",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 1000 chars", () => {
    const result = ideaSchema.safeParse({
      title: "Valid Title",
      description: "D".repeat(1001),
      category: "Process Improvement",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = ideaSchema.safeParse({
      title: "Valid Title",
      description: "A valid description that is long enough",
      category: "Nonexistent Category",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid categories", () => {
    const categories = [
      "Process Improvement",
      "Technology Innovation",
      "Cost Reduction",
      "Customer Experience",
      "Employee Engagement",
    ];
    for (const category of categories) {
      const result = ideaSchema.safeParse({
        title: "Valid Title",
        description: "A valid description that is long enough",
        category,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects entirely missing fields", () => {
    const result = ideaSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("validateFile", () => {
  it("returns null for a valid PDF", () => {
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for a valid PNG", () => {
    const file = new File(["data"], "img.png", { type: "image/png" });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for a valid JPEG", () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for a valid DOCX", () => {
    const file = new File(["data"], "doc.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(validateFile(file)).toBeNull();
  });

  it("rejects files exceeding 5 MB", () => {
    const bigContent = new Uint8Array(MAX_FILE_SIZE + 1);
    const file = new File([bigContent], "big.pdf", { type: "application/pdf" });
    expect(validateFile(file)).toBe("File must not exceed 5 MB");
  });

  it("rejects disallowed MIME types", () => {
    const file = new File(["data"], "script.js", { type: "application/javascript" });
    expect(validateFile(file)).toBe("Accepted formats: PDF, PNG, JPG, DOCX");
  });

  it("rejects .exe files", () => {
    const file = new File(["data"], "malware.exe", { type: "application/x-msdownload" });
    expect(validateFile(file)).toBe("Accepted formats: PDF, PNG, JPG, DOCX");
  });
});

describe("statusUpdateSchema", () => {
  it("accepts accepted status without comment", () => {
    const result = statusUpdateSchema.safeParse({ status: "accepted" });
    expect(result.success).toBe(true);
  });

  it("accepts accepted status with optional comment", () => {
    const result = statusUpdateSchema.safeParse({
      status: "accepted",
      evaluatorComment: "Great idea!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts under_review status", () => {
    const result = statusUpdateSchema.safeParse({ status: "under_review" });
    expect(result.success).toBe(true);
  });

  it("requires comment of at least 10 chars when status is rejected", () => {
    const result = statusUpdateSchema.safeParse({
      status: "rejected",
      evaluatorComment: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects rejected status without comment", () => {
    const result = statusUpdateSchema.safeParse({ status: "rejected" });
    expect(result.success).toBe(false);
  });

  it("accepts rejected status with comment ≥ 10 chars", () => {
    const result = statusUpdateSchema.safeParse({
      status: "rejected",
      evaluatorComment: "Does not align with our strategy at this time",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status values", () => {
    const result = statusUpdateSchema.safeParse({ status: "pending" });
    expect(result.success).toBe(false);
  });

  it("rejects submitted as a target status", () => {
    const result = statusUpdateSchema.safeParse({ status: "submitted" });
    expect(result.success).toBe(false);
  });
});
