import { describe, it, expect } from "vitest";
import { ideaSchema, validateFile, validateFiles } from "@/lib/validation/idea";
import { statusUpdateSchema } from "@/lib/validation/status";
import { MAX_FILE_SIZE, MAX_TOTAL_ATTACHMENT_SIZE, MAX_ATTACHMENTS, ALLOWED_FILE_TYPES } from "@/lib/constants";

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

  it("returns null for a valid GIF", () => {
    const file = new File(["data"], "anim.gif", { type: "image/gif" });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for a valid WEBP", () => {
    const file = new File(["data"], "photo.webp", { type: "image/webp" });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for a valid XLSX", () => {
    const file = new File(["data"], "sheet.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for a valid PPTX", () => {
    const file = new File(["data"], "slides.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for a valid CSV", () => {
    const file = new File(["col1,col2\nval1,val2"], "data.csv", { type: "text/csv" });
    expect(validateFile(file)).toBeNull();
  });

  it("accepts all 9 supported MIME types", () => {
    for (const mimeType of ALLOWED_FILE_TYPES) {
      const file = new File(["data"], "test-file", { type: mimeType });
      expect(validateFile(file)).toBeNull();
    }
  });

  it("rejects files exceeding 10 MB", () => {
    const bigContent = new Uint8Array(MAX_FILE_SIZE + 1);
    const file = new File([bigContent], "big.pdf", { type: "application/pdf" });
    expect(validateFile(file)).toBe("File must not exceed 10 MB");
  });

  it("rejects empty (0-byte) files", () => {
    const file = new File([], "empty.pdf", { type: "application/pdf" });
    expect(validateFile(file)).toBe("File is empty");
  });

  it("rejects disallowed MIME types", () => {
    const file = new File(["data"], "script.js", { type: "application/javascript" });
    expect(validateFile(file)).toBe("Accepted formats: PDF, PNG, JPG, GIF, WEBP, DOCX, XLSX, PPTX, CSV");
  });

  it("rejects .exe files", () => {
    const file = new File(["data"], "malware.exe", { type: "application/x-msdownload" });
    expect(validateFile(file)).toBe("Accepted formats: PDF, PNG, JPG, GIF, WEBP, DOCX, XLSX, PPTX, CSV");
  });
});

describe("validateFiles", () => {
  const makeFile = (name: string, sizeBytes: number, type = "application/pdf") => {
    const content = new Uint8Array(sizeBytes);
    return new File([content], name, { type });
  };

  it("returns null for 0 files (optional)", () => {
    expect(validateFiles([])).toBeNull();
  });

  it("returns null for 1 valid file", () => {
    const files = [makeFile("doc.pdf", 1000)];
    expect(validateFiles(files)).toBeNull();
  });

  it("returns null for 5 valid files within total size", () => {
    const files = Array.from({ length: 5 }, (_, i) => makeFile(`file${i}.pdf`, 1000));
    expect(validateFiles(files)).toBeNull();
  });

  it("rejects if count > MAX_ATTACHMENTS (5)", () => {
    const files = Array.from({ length: 6 }, (_, i) => makeFile(`file${i}.pdf`, 100));
    const result = validateFiles(files);
    expect(result).not.toBeNull();
    expect(result!.countError).toBe("Maximum 5 files allowed");
  });

  it("rejects if total size > MAX_TOTAL_ATTACHMENT_SIZE (25 MB)", () => {
    // 3 files of 9MB each = 27MB > 25MB
    const files = Array.from({ length: 3 }, (_, i) => makeFile(`big${i}.pdf`, 9 * 1024 * 1024));
    const result = validateFiles(files);
    expect(result).not.toBeNull();
    expect(result!.totalSizeError).toBe("Total attachment size must not exceed 25 MB");
  });

  it("returns per-file errors without failing all valid files", () => {
    const files = [
      makeFile("good.pdf", 1000, "application/pdf"),
      makeFile("bad.exe", 1000, "application/x-msdownload"),
      makeFile("also-good.png", 1000, "image/png"),
    ];
    const result = validateFiles(files);
    expect(result).not.toBeNull();
    expect(result!.fileErrors).toHaveLength(1);
    expect(result!.fileErrors![0].index).toBe(1);
    expect(result!.fileErrors![0].name).toBe("bad.exe");
    expect(result!.valid).toHaveLength(2);
  });

  it("returns per-file error for oversized individual file", () => {
    const files = [
      makeFile("good.pdf", 1000),
      makeFile("huge.pdf", MAX_FILE_SIZE + 1),
    ];
    const result = validateFiles(files);
    expect(result).not.toBeNull();
    expect(result!.fileErrors).toHaveLength(1);
    expect(result!.fileErrors![0].index).toBe(1);
    expect(result!.fileErrors![0].error).toBe("File must not exceed 10 MB");
  });

  it("returns per-file error for 0-byte files", () => {
    const files = [
      makeFile("good.pdf", 1000),
      new File([], "empty.pdf", { type: "application/pdf" }),
    ];
    const result = validateFiles(files);
    expect(result).not.toBeNull();
    expect(result!.fileErrors).toHaveLength(1);
    expect(result!.fileErrors![0].error).toBe("File is empty");
  });

  it("can report multiple errors simultaneously (count + file errors)", () => {
    // 6 files, one of which is invalid type
    const files = Array.from({ length: 5 }, (_, i) => makeFile(`file${i}.pdf`, 100));
    files.push(new File(["data"], "bad.exe", { type: "application/x-msdownload" }));
    const result = validateFiles(files);
    expect(result).not.toBeNull();
    expect(result!.countError).toBe("Maximum 5 files allowed");
    expect(result!.fileErrors!.length).toBeGreaterThanOrEqual(1);
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
