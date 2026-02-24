import { describe, it, expect, vi } from "vitest";
import { createIdea } from "@/lib/queries/ideas";

describe("createIdea with category_fields", () => {
  it("passes category_fields payload to supabase insert", async () => {
    const chainable = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "1" }, error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    await createIdea(supabase, {
      user_id: "user-1",
      title: "Idea",
      description: "A valid long description for query test coverage.",
      category: "Cost Reduction",
      category_fields: { cost_area: "Ops", estimated_savings: 1500 },
      attachment_url: null,
    });

    expect(chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        category_fields: { cost_area: "Ops", estimated_savings: 1500 },
      })
    );
  });
});
