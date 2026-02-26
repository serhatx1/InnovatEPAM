import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DraftListClient } from "@/components/draft-list-client";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock AlertDialog to render inline (no portal) for jsdom compatibility
vi.mock("@/components/ui/alert-dialog", () => {
  const React = require("react");
  function AlertDialog({ children, ...props }: React.PropsWithChildren<{ open?: boolean; onOpenChange?: (v: boolean) => void }>) {
    const [open, setOpen] = React.useState(props.open ?? false);
    const onOpenChange = props.onOpenChange ?? setOpen;
    return React.createElement(
      "div",
      { "data-testid": "alert-dialog", "data-open": open },
      React.Children.map(children, (child: React.ReactElement) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { __open: open, __setOpen: (v: boolean) => { setOpen(v); onOpenChange(v); } } as Record<string, unknown>)
          : child
      )
    );
  }
  function AlertDialogTrigger({ children, __setOpen, ...props }: React.PropsWithChildren<{ asChild?: boolean; __setOpen?: (v: boolean) => void }>) {
    if (props.asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        onClick: (e: Event) => {
          (children as React.ReactElement<{ onClick?: (e: Event) => void }>).props.onClick?.(e);
          __setOpen?.(true);
        },
      } as Record<string, unknown>);
    }
    return React.createElement("button", { ...props, onClick: () => __setOpen?.(true) }, children);
  }
  function AlertDialogContent({ children, __open }: React.PropsWithChildren<{ __open?: boolean }>) {
    if (!__open) return null;
    return React.createElement("div", { role: "alertdialog" }, children);
  }
  function AlertDialogHeader({ children }: React.PropsWithChildren) {
    return React.createElement("div", null, children);
  }
  function AlertDialogTitle({ children }: React.PropsWithChildren) {
    return React.createElement("h2", null, children);
  }
  function AlertDialogDescription({ children }: React.PropsWithChildren) {
    return React.createElement("p", null, children);
  }
  function AlertDialogFooter({ children }: React.PropsWithChildren) {
    return React.createElement("div", null, children);
  }
  function AlertDialogCancel({ children, __setOpen }: React.PropsWithChildren<{ __setOpen?: (v: boolean) => void }>) {
    return React.createElement("button", { onClick: () => __setOpen?.(false) }, children);
  }
  function AlertDialogAction({ children, onClick, disabled }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) {
    return React.createElement("button", { onClick, disabled }, children);
  }
  return {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
  };
});

const mockDrafts = [
  {
    id: "d1",
    title: "Draft One",
    description: "Description one",
    category: "Product Feature",
    category_fields: {},
    status: "draft" as const,
    user_id: "u1",
    attachment_url: null,
    evaluator_comment: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
    deleted_at: null,
  },
  {
    id: "d2",
    title: "",
    description: "",
    category: "",
    category_fields: {},
    status: "draft" as const,
    user_id: "u1",
    attachment_url: null,
    evaluator_comment: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-03T00:00:00Z",
    deleted_at: null,
  },
];

describe("DraftListClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders draft cards with delete buttons", () => {
    render(<DraftListClient drafts={mockDrafts} />);
    expect(screen.getByText("Draft One")).toBeInTheDocument();
    expect(screen.getByText("Untitled Draft")).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(deleteButtons).toHaveLength(2);
  });

  it("shows AlertDialog on delete button click", async () => {
    render(<DraftListClient drafts={mockDrafts} />);
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("does nothing when cancelling deletion", async () => {
    global.fetch = vi.fn();
    render(<DraftListClient drafts={mockDrafts} />);
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls DELETE API and shows success toast on confirm", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response);

    render(<DraftListClient drafts={mockDrafts} />);
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/drafts/d1", {
        method: "DELETE",
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/deleted/i)
      );
    });
  });

  it("removes draft from list on successful deletion", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response);

    render(<DraftListClient drafts={mockDrafts} />);
    expect(screen.getByText("Draft One")).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.queryByText("Draft One")).not.toBeInTheDocument();
    });
  });

  it("shows error toast on delete failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    } as Response);

    render(<DraftListClient drafts={mockDrafts} />);
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/failed|error/i)
      );
    });
  });
});
