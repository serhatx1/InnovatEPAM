import { describe, it, expect } from "vitest";
import { ideaSchema } from "@/lib/validation/idea";

describe("ideaSchema", () => {
  it("accepts valid idea input", () => {
    const result = ideaSchema.safeParse({
      title: "Automate onboarding",
      description: "Use AI to streamline new-hire onboarding process",
      category: "Process Improvement",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = ideaSchema.safeParse({
      title: "",
      description: "Some description",
      category: "Other",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const result = ideaSchema.safeParse({
      title: "My Idea",
      description: "",
      category: "Other",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing category", () => {
    const result = ideaSchema.safeParse({
      title: "My Idea",
      description: "Some description",
      category: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects entirely missing fields", () => {
    const result = ideaSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
