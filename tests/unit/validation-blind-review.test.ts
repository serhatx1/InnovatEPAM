import { describe, it, expect } from "vitest";
import { blindReviewSettingSchema } from "@/lib/validation/blind-review";

describe("blindReviewSettingSchema", () => {
  it("accepts enabled = true", () => {
    const result = blindReviewSettingSchema.safeParse({ enabled: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(true);
    }
  });

  it("accepts enabled = false", () => {
    const result = blindReviewSettingSchema.safeParse({ enabled: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(false);
    }
  });

  it("rejects missing enabled field", () => {
    const result = blindReviewSettingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean enabled (string)", () => {
    const result = blindReviewSettingSchema.safeParse({ enabled: "true" });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean enabled (number)", () => {
    const result = blindReviewSettingSchema.safeParse({ enabled: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects null enabled", () => {
    const result = blindReviewSettingSchema.safeParse({ enabled: null });
    expect(result.success).toBe(false);
  });

  it("ignores extra fields", () => {
    const result = blindReviewSettingSchema.safeParse({ enabled: true, extra: "ignored" });
    expect(result.success).toBe(true);
  });
});
