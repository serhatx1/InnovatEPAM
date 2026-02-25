import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewIdeaPage from "@/app/ideas/new/page";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

// Mock sonner toast
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
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

// ── Helper to fill required base fields ───────────────

function fillBaseFields() {
  fireEvent.change(screen.getByLabelText(/Title/), {
    target: { value: "A Valid Title For Testing" },
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
    target: { value: "Cloud" },
  });
  fireEvent.change(screen.getByLabelText(/Estimated Savings \(USD\)/), {
    target: { value: "5000" },
  });
}

describe("NewIdeaPage — submission success flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "idea-1" }),
    } as Response);
  });

  it("shows success toast and redirects on successful submission", async () => {
    render(<NewIdeaPage />);
    fillBaseFields();

    fireEvent.submit(screen.getByRole("button", { name: /submit idea/i }).closest("form")!);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    expect(toastSuccess).toHaveBeenCalledWith("Idea submitted successfully!");
    expect(push).toHaveBeenCalledWith("/ideas");
    expect(refresh).toHaveBeenCalled();
  });

  it("disables submit button while loading", async () => {
    // Make fetch hang (never resolves)
    let resolvePromise: (v: unknown) => void;
    global.fetch = vi.fn().mockReturnValue(
      new Promise((r) => {
        resolvePromise = r;
      })
    );

    render(<NewIdeaPage />);
    fillBaseFields();

    const submitButton = screen.getByRole("button", { name: /submit idea/i });
    fireEvent.submit(submitButton.closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
    });

    // Resolve to clean up
    resolvePromise!({
      ok: true,
      json: async () => ({}),
    });
  });
});

describe("NewIdeaPage — API error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error toast when API returns non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Validation failed" }),
    } as Response);

    render(<NewIdeaPage />);
    fillBaseFields();

    fireEvent.submit(screen.getByRole("button", { name: /submit idea/i }).closest("form")!);

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Validation failed"));
    expect(push).not.toHaveBeenCalled();
  });

  it("shows generic error toast when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<NewIdeaPage />);
    fillBaseFields();

    fireEvent.submit(screen.getByRole("button", { name: /submit idea/i }).closest("form")!);

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Network error"));
  });

  it("shows fallback message for non-Error throws", async () => {
    global.fetch = vi.fn().mockRejectedValue("string error");

    render(<NewIdeaPage />);
    fillBaseFields();

    fireEvent.submit(screen.getByRole("button", { name: /submit idea/i }).closest("form")!);

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Something went wrong"));
  });
});

describe("NewIdeaPage — client-side file validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  it("renders file input with correct accept attribute", () => {
    render(<NewIdeaPage />);
    const fileInput = screen.getByLabelText(/Attachment/) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.getAttribute("accept")).toBe(".pdf,.png,.jpg,.jpeg,.docx");
  });

  it("shows file size limit guidance text", () => {
    render(<NewIdeaPage />);
    expect(screen.getByText(/Max 5 MB/)).toBeInTheDocument();
    expect(screen.getByText(/PDF, PNG, JPG, DOCX/)).toBeInTheDocument();
  });
});

describe("NewIdeaPage — dynamic field validation errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  it("shows inline errors when required category fields are missing", async () => {
    render(<NewIdeaPage />);

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "A Valid Title For Testing" },
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
    // Don't fill cost_area or estimated_savings — leave them empty

    // Submit the form
    await act(async () => {
      const form = screen.getByRole("button", { name: /submit idea/i }).closest("form")!;
      fireEvent.submit(form);
    });

    // Validation should block fetch
    expect(global.fetch).not.toHaveBeenCalled();

    // Debug: check if any error-styled text appeared
    const destructiveTexts = document.querySelectorAll(".text-destructive");
    expect(destructiveTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("clears field error when user starts typing in errored field", async () => {
    render(<NewIdeaPage />);

    fireEvent.change(screen.getByLabelText(/Title/), {
      target: { value: "A Valid Title For Testing" },
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

    await act(async () => {
      const form = screen.getByRole("button", { name: /submit idea/i }).closest("form")!;
      fireEvent.submit(form);
    });

    const errorsBefore = document.querySelectorAll(".text-destructive").length;
    expect(errorsBefore).toBeGreaterThanOrEqual(1);

    // Start typing in cost_area to clear its error
    fireEvent.change(screen.getByLabelText(/Cost Area/), {
      target: { value: "Cloud" },
    });

    const errorsAfter = document.querySelectorAll(".text-destructive").length;
    expect(errorsAfter).toBeLessThan(errorsBefore);
  });
});

describe("NewIdeaPage — category edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  it("clears category fields when invalid category is selected", () => {
    render(<NewIdeaPage />);

    // Select valid category
    fireEvent.change(screen.getByLabelText("Category *"), {
      target: { value: "Cost Reduction" },
    });
    expect(screen.getByLabelText(/Cost Area/)).toBeInTheDocument();

    // Select invalid category
    fireEvent.change(screen.getByLabelText("Category *"), {
      target: { value: "Nonexistent" },
    });

    expect(screen.queryByLabelText(/Cost Area/)).not.toBeInTheDocument();
    expect(screen.queryByText("Category Details")).not.toBeInTheDocument();
  });

  it("shows no dynamic fields when category is reset to empty", () => {
    render(<NewIdeaPage />);

    fireEvent.change(screen.getByLabelText("Category *"), {
      target: { value: "Technology Innovation" },
    });
    expect(screen.getByLabelText(/Technology Area/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Category *"), {
      target: { value: "" },
    });

    expect(screen.queryByLabelText(/Technology Area/)).not.toBeInTheDocument();
  });

  it("renders all 5 categories in select options", () => {
    render(<NewIdeaPage />);
    const options = screen.getAllByRole("option");
    // 5 categories + 1 placeholder "Select a category"
    expect(options.length).toBeGreaterThanOrEqual(6);
  });
});
