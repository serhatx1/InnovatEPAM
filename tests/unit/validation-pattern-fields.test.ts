import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for categoryFieldSchema pattern regex paths (lines 67-78
 * in category-fields.ts). No real CATEGORY_FIELD_DEFINITIONS use
 * `pattern`, so we mock constants to exercise those branches.
 */

const mockFieldDefinitions = {
  "Process Improvement": [],
  "Technology Innovation": [],
  "Cost Reduction": [],
  "Customer Experience": [],
  "Employee Engagement": [],
  // Fake category with pattern fields for testing
  __test_pattern_required: [
    {
      field_key: "code",
      field_label: "Code",
      field_type: "text" as const,
      is_required: true,
      pattern: "^[A-Z]{3}$",
    },
  ],
  __test_pattern_optional: [
    {
      field_key: "tag",
      field_label: "Tag",
      field_type: "text" as const,
      is_required: false,
      pattern: "^[a-z]+$",
    },
  ],
};

vi.mock("@/lib/constants", async () => {
  const actual = await vi.importActual<typeof import("@/lib/constants")>(
    "@/lib/constants"
  );
  return {
    ...actual,
    IDEA_CATEGORIES: [
      ...actual.IDEA_CATEGORIES,
      "__test_pattern_required",
      "__test_pattern_optional",
    ] as unknown as typeof actual.IDEA_CATEGORIES,
    CATEGORY_FIELD_DEFINITIONS: mockFieldDefinitions,
  };
});

let buildCategoryFieldsSchema: typeof import("@/lib/validation/category-fields")["buildCategoryFieldsSchema"];

beforeEach(async () => {
  const mod = await import("@/lib/validation/category-fields");
  buildCategoryFieldsSchema = mod.buildCategoryFieldsSchema;
});

describe("textFieldSchema with pattern (required)", () => {
  it("accepts value matching pattern", () => {
    const schema = buildCategoryFieldsSchema("__test_pattern_required" as any);
    const result = schema.safeParse({ code: "ABC" });
    expect(result.success).toBe(true);
  });

  it("rejects empty value (required)", () => {
    const schema = buildCategoryFieldsSchema("__test_pattern_required" as any);
    const result = schema.safeParse({ code: "" });
    expect(result.success).toBe(false);
  });

  it("rejects value not matching pattern", () => {
    const schema = buildCategoryFieldsSchema("__test_pattern_required" as any);
    const result = schema.safeParse({ code: "abc" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("format is invalid");
    }
  });

  it("rejects value with wrong length for pattern", () => {
    const schema = buildCategoryFieldsSchema("__test_pattern_required" as any);
    const result = schema.safeParse({ code: "ABCD" });
    expect(result.success).toBe(false);
  });
});

describe("textFieldSchema with pattern (optional)", () => {
  it("accepts value matching pattern", () => {
    const schema = buildCategoryFieldsSchema("__test_pattern_optional" as any);
    const result = schema.safeParse({ tag: "hello" });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for optional field", () => {
    const schema = buildCategoryFieldsSchema("__test_pattern_optional" as any);
    const result = schema.safeParse({ tag: "" });
    expect(result.success).toBe(true);
  });

  it("accepts undefined for optional field", () => {
    const schema = buildCategoryFieldsSchema("__test_pattern_optional" as any);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects value not matching pattern", () => {
    const schema = buildCategoryFieldsSchema("__test_pattern_optional" as any);
    const result = schema.safeParse({ tag: "INVALID" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("format is invalid");
    }
  });
});
