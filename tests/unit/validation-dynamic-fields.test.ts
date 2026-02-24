import { describe, it, expect } from "vitest";
import { validateCategoryFieldsForCategory } from "@/lib/validation/category-fields";

describe("validateCategoryFieldsForCategory", () => {
  it("validates required fields for selected category", () => {
    const result = validateCategoryFieldsForCategory("Cost Reduction", {
      cost_area: "",
      estimated_savings: "5000",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.cost_area?.[0]).toContain("required");
    }
  });

  it("validates numeric range boundaries", () => {
    const result = validateCategoryFieldsForCategory("Cost Reduction", {
      cost_area: "Cloud spend",
      estimated_savings: "1000001",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.estimated_savings?.[0]).toContain("<= 1000000");
    }
  });

  it("allows optional field to be empty", () => {
    const result = validateCategoryFieldsForCategory("Technology Innovation", {
      technology_area: "AI/ML",
      prototype_readiness: "",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid select options", () => {
    const result = validateCategoryFieldsForCategory("Technology Innovation", {
      technology_area: "Quantum",
    });

    expect(result.success).toBe(false);
  });

  it("returns category error when category is missing", () => {
    const result = validateCategoryFieldsForCategory("", {});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.category?.[0]).toBe("Category is required");
    }
  });
});
