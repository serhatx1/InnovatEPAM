import { describe, it, expect } from "vitest";
import { draftSaveSchema, draftSubmitSchema } from "@/lib/validation/draft";

describe("draftSaveSchema", () => {
  it("accepts empty object (no required fields)", () => {
    const result = draftSaveSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts title-only payload", () => {
    const result = draftSaveSchema.safeParse({ title: "My Idea" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("My Idea");
    }
  });

  it("accepts partial fields (title + description, no category)", () => {
    const result = draftSaveSchema.safeParse({
      title: "My Idea",
      description: "Some description",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("My Idea");
      expect(result.data.description).toBe("Some description");
    }
  });

  it("accepts full payload", () => {
    const result = draftSaveSchema.safeParse({
      title: "Full Draft Title",
      description: "A complete description of my idea with enough content",
      category: "Process Improvement",
      category_fields: { current_process: "Manual" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects title > 100 characters", () => {
    const result = draftSaveSchema.safeParse({
      title: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects description > 1000 characters", () => {
    const result = draftSaveSchema.safeParse({
      description: "A".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for title", () => {
    const result = draftSaveSchema.safeParse({ title: "" });
    expect(result.success).toBe(true);
  });
});

describe("draftSubmitSchema", () => {
  it("rejects empty object (all fields required)", () => {
    const result = draftSubmitSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects title < 5 chars", () => {
    const result = draftSubmitSchema.safeParse({
      title: "Hi",
      description: "A valid description that is at least twenty characters long",
      category: "Process Improvement",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title > 100 chars", () => {
    const result = draftSubmitSchema.safeParse({
      title: "A".repeat(101),
      description: "A valid description that is at least twenty characters long",
      category: "Process Improvement",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description < 20 chars", () => {
    const result = draftSubmitSchema.safeParse({
      title: "Valid Title Here",
      description: "Too short",
      category: "Process Improvement",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description > 1000 chars", () => {
    const result = draftSubmitSchema.safeParse({
      title: "Valid Title Here",
      description: "A".repeat(1001),
      category: "Process Improvement",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing category", () => {
    const result = draftSubmitSchema.safeParse({
      title: "Valid Title Here",
      description: "A valid description that is at least twenty characters long",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = draftSubmitSchema.safeParse({
      title: "Valid Title Here",
      description: "A valid description that is at least twenty characters long",
      category: "Invalid Category",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid full payload", () => {
    const result = draftSubmitSchema.safeParse({
      title: "Valid Title Here",
      description: "A valid description that is at least twenty characters long",
      category: "Process Improvement",
    });
    expect(result.success).toBe(true);
  });
});
