import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import DraftEditPage from "@/app/ideas/drafts/[id]/page";
import { toast } from "sonner";
import React from "react";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock AlertDialog to render inline (no portal) for jsdom compatibility
vi.mock("@/components/ui/alert-dialog", () => {
  const React = require("react");
  function AlertDialog({ children, ...props }: React.PropsWithChildren<{ open?: boolean; onOpenChange?: (v: boolean) => void }>) {
    const [open, setOpen] = React.useState(props.open ?? false);
    const onOpenChange = props.onOpenChange ?? setOpen;
    return React.createElement(
      "div",
      { "data-testid": "alert-dialog" },
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

const mockDraft = {
  id: "draft-1",
  title: "Test Draft",
  description: "A description that is long enough",
  category: "Process Improvement",
  category_fields: {},
  status: "draft",
  attachments: [],
};

describe("DraftEditPage delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupFetch(deleteResponse: { ok: boolean; status: number }) {
    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return {
          ok: deleteResponse.ok,
          status: deleteResponse.status,
          json: async () => (deleteResponse.ok ? { success: true } : { error: "Server error" }),
        } as Response;
      }
      // Default: return draft data for GET requests
      return {
        ok: true,
        status: 200,
        json: async () => mockDraft,
      } as Response;
    });
  }

  it("renders Delete Draft button with destructive variant", async () => {
    setupFetch({ ok: true, status: 200 });
    render(<DraftEditPage params={Promise.resolve({ id: "draft-1" })} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete Draft/i })).toBeInTheDocument();
    });
  });

  it("shows AlertDialog confirmation when Delete Draft is clicked", async () => {
    setupFetch({ ok: true, status: 200 });
    render(<DraftEditPage params={Promise.resolve({ id: "draft-1" })} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete Draft/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete Draft/i }));

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("calls DELETE API and redirects on confirm", async () => {
    setupFetch({ ok: true, status: 200 });
    render(<DraftEditPage params={Promise.resolve({ id: "draft-1" })} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete Draft/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete Draft/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/drafts/draft-1", {
        method: "DELETE",
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Draft deleted");
      expect(push).toHaveBeenCalledWith("/ideas/drafts");
    });
  });

  it("shows error toast on delete failure", async () => {
    setupFetch({ ok: false, status: 500 });
    render(<DraftEditPage params={Promise.resolve({ id: "draft-1" })} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete Draft/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete Draft/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete");
    });
  });
});
