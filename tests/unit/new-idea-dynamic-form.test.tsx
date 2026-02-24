import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewIdeaPage from "@/app/ideas/new/page";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("NewIdeaPage dynamic category form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  it("shows category-specific fields when category is selected", () => {
    render(<NewIdeaPage />);

    fireEvent.change(screen.getByLabelText("Category *"), {
      target: { value: "Cost Reduction" },
    });

    expect(screen.getByLabelText(/Cost Area/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Savings \(USD\)/)).toBeInTheDocument();
  });

  it("replaces old fields when category is changed", () => {
    render(<NewIdeaPage />);

    fireEvent.change(screen.getByLabelText("Category *"), {
      target: { value: "Cost Reduction" },
    });
    expect(screen.getByLabelText(/Estimated Savings \(USD\)/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Category *"), {
      target: { value: "Technology Innovation" },
    });

    expect(screen.queryByLabelText(/Estimated Savings \(USD\)/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Technology Area/)).toBeInTheDocument();
  });

  it("submits only active category fields after category switch", async () => {
    render(<NewIdeaPage />);

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "Valid Dynamic Idea" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: {
        value:
          "This is a sufficiently long description to pass the base field validation checks.",
      },
    });

    fireEvent.change(screen.getByLabelText("Category *"), {
      target: { value: "Cost Reduction" },
    });
    fireEvent.change(screen.getByLabelText(/Cost Area/), {
      target: { value: "Operations" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Savings \(USD\)/), {
      target: { value: "1200" },
    });

    fireEvent.change(screen.getByLabelText("Category *"), {
      target: { value: "Technology Innovation" },
    });
    fireEvent.change(screen.getByLabelText(/Technology Area/), {
      target: { value: "AI/ML" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /submit idea/i }).closest("form")!);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [, options] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = options.body as FormData;
    const categoryFields = JSON.parse((body.get("category_fields") as string) ?? "{}");

    expect(body.get("category")).toBe("Technology Innovation");
    expect(categoryFields).toEqual({ technology_area: "AI/ML" });
    expect(categoryFields.estimated_savings).toBeUndefined();
  });
});
