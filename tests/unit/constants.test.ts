import { describe, it, expect } from "vitest";
import {
  IDEA_CATEGORIES,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  VALID_TRANSITIONS,
  CATEGORY_FIELD_DEFINITIONS,
} from "@/lib/constants";

describe("IDEA_CATEGORIES", () => {
  it("contains exactly 5 categories", () => {
    expect(IDEA_CATEGORIES).toHaveLength(5);
  });

  it("contains the expected categories", () => {
    expect(IDEA_CATEGORIES).toContain("Process Improvement");
    expect(IDEA_CATEGORIES).toContain("Technology Innovation");
    expect(IDEA_CATEGORIES).toContain("Cost Reduction");
    expect(IDEA_CATEGORIES).toContain("Customer Experience");
    expect(IDEA_CATEGORIES).toContain("Employee Engagement");
  });
});

describe("MAX_FILE_SIZE", () => {
  it("equals 5 MB in bytes", () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });
});

describe("ALLOWED_FILE_TYPES", () => {
  it("allows PDF", () => {
    expect(ALLOWED_FILE_TYPES).toContain("application/pdf");
  });

  it("allows PNG", () => {
    expect(ALLOWED_FILE_TYPES).toContain("image/png");
  });

  it("allows JPEG", () => {
    expect(ALLOWED_FILE_TYPES).toContain("image/jpeg");
  });

  it("allows DOCX", () => {
    expect(ALLOWED_FILE_TYPES).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("contains exactly 4 types", () => {
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

  it("has no transitions from accepted (terminal)", () => {
    expect(VALID_TRANSITIONS.accepted).toEqual([]);
  });

  it("has no transitions from rejected (terminal)", () => {
    expect(VALID_TRANSITIONS.rejected).toEqual([]);
  });
});

describe("CATEGORY_FIELD_DEFINITIONS", () => {
  it("has a definition for every category", () => {
    for (const category of IDEA_CATEGORIES) {
      expect(CATEGORY_FIELD_DEFINITIONS[category]).toBeDefined();
      expect(Array.isArray(CATEGORY_FIELD_DEFINITIONS[category])).toBe(true);
      expect(CATEGORY_FIELD_DEFINITIONS[category].length).toBeGreaterThan(0);
    }
  });

  it("has no categories beyond IDEA_CATEGORIES", () => {
    const definedCategories = Object.keys(CATEGORY_FIELD_DEFINITIONS);
    for (const cat of definedCategories) {
      expect(IDEA_CATEGORIES).toContain(cat);
    }
  });

  it("each field has required properties", () => {
    for (const category of IDEA_CATEGORIES) {
      for (const field of CATEGORY_FIELD_DEFINITIONS[category]) {
        expect(field.field_key).toBeTruthy();
        expect(field.field_label).toBeTruthy();
        expect(["text", "number", "select", "textarea"]).toContain(field.field_type);
        expect(typeof field.is_required).toBe("boolean");
      }
    }
  });

  it("select fields have options array", () => {
    for (const category of IDEA_CATEGORIES) {
      for (const field of CATEGORY_FIELD_DEFINITIONS[category]) {
        if (field.field_type === "select") {
          expect(Array.isArray(field.options)).toBe(true);
          expect(field.options!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("number fields have min/max when specified", () => {
    for (const category of IDEA_CATEGORIES) {
      for (const field of CATEGORY_FIELD_DEFINITIONS[category]) {
        if (field.field_type === "number") {
          if (field.min !== undefined) expect(typeof field.min).toBe("number");
          if (field.max !== undefined) expect(typeof field.max).toBe("number");
          if (field.min !== undefined && field.max !== undefined) {
            expect(field.min).toBeLessThanOrEqual(field.max);
          }
        }
      }
    }
  });

  it("field_keys are unique within each category", () => {
    for (const category of IDEA_CATEGORIES) {
      const keys = CATEGORY_FIELD_DEFINITIONS[category].map((f) => f.field_key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  describe("Process Improvement", () => {
    it("has current_process (textarea, required) and time_saved_hours (number, required)", () => {
      const fields = CATEGORY_FIELD_DEFINITIONS["Process Improvement"];
      const currentProcess = fields.find((f) => f.field_key === "current_process");
      const timeSaved = fields.find((f) => f.field_key === "time_saved_hours");

      expect(currentProcess).toBeDefined();
      expect(currentProcess!.field_type).toBe("textarea");
      expect(currentProcess!.is_required).toBe(true);

      expect(timeSaved).toBeDefined();
      expect(timeSaved!.field_type).toBe("number");
      expect(timeSaved!.is_required).toBe(true);
      expect(timeSaved!.min).toBe(1);
      expect(timeSaved!.max).toBe(1000);
    });
  });

  describe("Technology Innovation", () => {
    it("has technology_area (select, required) and prototype_readiness (select, optional)", () => {
      const fields = CATEGORY_FIELD_DEFINITIONS["Technology Innovation"];
      const techArea = fields.find((f) => f.field_key === "technology_area");
      const readiness = fields.find((f) => f.field_key === "prototype_readiness");

      expect(techArea).toBeDefined();
      expect(techArea!.field_type).toBe("select");
      expect(techArea!.is_required).toBe(true);
      expect(techArea!.options).toEqual(["AI/ML", "Automation", "Cloud", "Data"]);

      expect(readiness).toBeDefined();
      expect(readiness!.is_required).toBe(false);
    });
  });

  describe("Cost Reduction", () => {
    it("has cost_area (text, required) and estimated_savings (number, required)", () => {
      const fields = CATEGORY_FIELD_DEFINITIONS["Cost Reduction"];
      const costArea = fields.find((f) => f.field_key === "cost_area");
      const savings = fields.find((f) => f.field_key === "estimated_savings");

      expect(costArea).toBeDefined();
      expect(costArea!.field_type).toBe("text");
      expect(costArea!.is_required).toBe(true);

      expect(savings).toBeDefined();
      expect(savings!.min).toBe(0);
      expect(savings!.max).toBe(1000000);
    });
  });

  describe("Customer Experience", () => {
    it("has target_customer_segment (text, required) and expected_nps_impact (number, optional)", () => {
      const fields = CATEGORY_FIELD_DEFINITIONS["Customer Experience"];
      const segment = fields.find((f) => f.field_key === "target_customer_segment");
      const nps = fields.find((f) => f.field_key === "expected_nps_impact");

      expect(segment).toBeDefined();
      expect(segment!.is_required).toBe(true);

      expect(nps).toBeDefined();
      expect(nps!.is_required).toBe(false);
      expect(nps!.min).toBe(-100);
      expect(nps!.max).toBe(100);
    });
  });

  describe("Employee Engagement", () => {
    it("has target_team (text, required) and engagement_metric (select, required)", () => {
      const fields = CATEGORY_FIELD_DEFINITIONS["Employee Engagement"];
      const team = fields.find((f) => f.field_key === "target_team");
      const metric = fields.find((f) => f.field_key === "engagement_metric");

      expect(team).toBeDefined();
      expect(team!.is_required).toBe(true);

      expect(metric).toBeDefined();
      expect(metric!.field_type).toBe("select");
      expect(metric!.is_required).toBe(true);
      expect(metric!.options).toEqual(["Participation", "Satisfaction", "Retention", "Productivity"]);
    });
  });
});
