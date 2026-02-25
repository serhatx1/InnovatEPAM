import { describe, it, expect } from "vitest";
import { validateCategoryFieldsForCategory } from "@/lib/validation/category-fields";

/**
 * Extended validation tests covering all 5 categories and edge cases
 * not covered by the base validation-dynamic-fields.test.ts.
 */

describe("validateCategoryFieldsForCategory — all categories", () => {
  // ── Process Improvement ───────────────────────────

  describe("Process Improvement", () => {
    it("succeeds with valid required fields", () => {
      const result = validateCategoryFieldsForCategory("Process Improvement", {
        current_process: "Manual data entry into spreadsheets",
        time_saved_hours: "20",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.current_process).toBe("Manual data entry into spreadsheets");
        expect(result.data.time_saved_hours).toBe(20);
      }
    });

    it("fails when current_process is empty", () => {
      const result = validateCategoryFieldsForCategory("Process Improvement", {
        current_process: "",
        time_saved_hours: "10",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.current_process).toBeTruthy();
      }
    });

    it("fails when time_saved_hours exceeds max (1000)", () => {
      const result = validateCategoryFieldsForCategory("Process Improvement", {
        current_process: "Some process",
        time_saved_hours: "1001",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.time_saved_hours?.[0]).toContain("<= 1000");
      }
    });

    it("fails when time_saved_hours is below min (1)", () => {
      const result = validateCategoryFieldsForCategory("Process Improvement", {
        current_process: "Some process",
        time_saved_hours: "0",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.time_saved_hours?.[0]).toContain(">= 1");
      }
    });

    it("fails when time_saved_hours is not a number", () => {
      const result = validateCategoryFieldsForCategory("Process Improvement", {
        current_process: "Some process",
        time_saved_hours: "abc",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Customer Experience ───────────────────────────

  describe("Customer Experience", () => {
    it("succeeds with required field and optional field", () => {
      const result = validateCategoryFieldsForCategory("Customer Experience", {
        target_customer_segment: "Enterprise B2B",
        expected_nps_impact: "15",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.target_customer_segment).toBe("Enterprise B2B");
        expect(result.data.expected_nps_impact).toBe(15);
      }
    });

    it("succeeds with required field only (optional omitted)", () => {
      const result = validateCategoryFieldsForCategory("Customer Experience", {
        target_customer_segment: "SMB",
      });
      expect(result.success).toBe(true);
    });

    it("succeeds with empty optional nps_impact", () => {
      const result = validateCategoryFieldsForCategory("Customer Experience", {
        target_customer_segment: "SMB",
        expected_nps_impact: "",
      });
      expect(result.success).toBe(true);
    });

    it("fails when target_customer_segment is empty", () => {
      const result = validateCategoryFieldsForCategory("Customer Experience", {
        target_customer_segment: "",
        expected_nps_impact: "10",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.target_customer_segment).toBeTruthy();
      }
    });

    it("fails when expected_nps_impact exceeds max (100)", () => {
      const result = validateCategoryFieldsForCategory("Customer Experience", {
        target_customer_segment: "Enterprise",
        expected_nps_impact: "101",
      });
      expect(result.success).toBe(false);
    });

    it("fails when expected_nps_impact is below min (-100)", () => {
      const result = validateCategoryFieldsForCategory("Customer Experience", {
        target_customer_segment: "Enterprise",
        expected_nps_impact: "-101",
      });
      expect(result.success).toBe(false);
    });

    it("allows negative expected_nps_impact within range", () => {
      const result = validateCategoryFieldsForCategory("Customer Experience", {
        target_customer_segment: "Enterprise",
        expected_nps_impact: "-50",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expected_nps_impact).toBe(-50);
      }
    });
  });

  // ── Employee Engagement ───────────────────────────

  describe("Employee Engagement", () => {
    it("succeeds with valid required fields", () => {
      const result = validateCategoryFieldsForCategory("Employee Engagement", {
        target_team: "Engineering",
        engagement_metric: "Satisfaction",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.target_team).toBe("Engineering");
        expect(result.data.engagement_metric).toBe("Satisfaction");
      }
    });

    it("accepts all valid engagement_metric options", () => {
      for (const metric of ["Participation", "Satisfaction", "Retention", "Productivity"]) {
        const result = validateCategoryFieldsForCategory("Employee Engagement", {
          target_team: "Sales",
          engagement_metric: metric,
        });
        expect(result.success).toBe(true);
      }
    });

    it("fails when engagement_metric is invalid option", () => {
      const result = validateCategoryFieldsForCategory("Employee Engagement", {
        target_team: "Sales",
        engagement_metric: "Happiness",
      });
      expect(result.success).toBe(false);
    });

    it("fails when target_team is empty", () => {
      const result = validateCategoryFieldsForCategory("Employee Engagement", {
        target_team: "",
        engagement_metric: "Retention",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.target_team).toBeTruthy();
      }
    });

    it("fails when engagement_metric is empty (required)", () => {
      const result = validateCategoryFieldsForCategory("Employee Engagement", {
        target_team: "HR",
        engagement_metric: "",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Edge cases ────────────────────────────────────

  describe("edge cases", () => {
    it("strips unknown keys from input (stale fields)", () => {
      const result = validateCategoryFieldsForCategory("Cost Reduction", {
        cost_area: "Cloud",
        estimated_savings: "5000",
        stale_key: "should be stripped",
        another_stale: "also stripped",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("stale_key");
        expect(result.data).not.toHaveProperty("another_stale");
      }
    });

    it("handles null input as empty record", () => {
      const result = validateCategoryFieldsForCategory("Cost Reduction", null);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.cost_area).toBeTruthy();
      }
    });

    it("handles array input as empty record", () => {
      const result = validateCategoryFieldsForCategory("Cost Reduction", ["not", "valid"]);
      expect(result.success).toBe(false);
    });

    it("handles undefined input as empty record", () => {
      const result = validateCategoryFieldsForCategory("Cost Reduction", undefined);
      expect(result.success).toBe(false);
    });

    it("converts numeric values to strings before validation", () => {
      const result = validateCategoryFieldsForCategory("Cost Reduction", {
        cost_area: "Cloud",
        estimated_savings: 5000, // number, not string
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.estimated_savings).toBe(5000);
      }
    });

    it("converts null field values to empty string", () => {
      const result = validateCategoryFieldsForCategory("Cost Reduction", {
        cost_area: null,
        estimated_savings: "500",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.cost_area).toBeTruthy();
      }
    });
  });
});
