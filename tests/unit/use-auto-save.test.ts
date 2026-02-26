import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import { AUTOSAVE_DEBOUNCE_MS } from "@/lib/constants";

// ── Setup ───────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutoSave", () => {
  it("calls save callback after AUTOSAVE_DEBOUNCE_MS debounce", async () => {
    const onSave = vi.fn().mockResolvedValue({ id: "draft-1" });
    const { result } = renderHook(() =>
      useAutoSave({
        data: { title: "Hello" },
        draftId: null,
        stagingSessionId: "session-1",
        onSave,
      })
    );

    // Initially idle
    expect(result.current.saveStatus).toBe("idle");

    // Advance half the debounce — shouldn't fire yet
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS / 2);
    });
    expect(onSave).not.toHaveBeenCalled();

    // Advance the rest — should fire
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS / 2 + 100);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("does NOT call save when form data has not changed (dirty check)", async () => {
    const onSave = vi.fn().mockResolvedValue({ id: "draft-1" });
    const data = { title: "Static" };

    const { rerender } = renderHook(
      ({ data: d }) =>
        useAutoSave({
          data: d,
          draftId: "draft-1",
          stagingSessionId: "s1",
          onSave,
        }),
      { initialProps: { data } }
    );

    // First save after initial mount
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 100);
    });
    const calls = onSave.mock.calls.length;

    // Re-render with same data
    rerender({ data: { ...data } });
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 100);
    });

    // Should NOT have called save again
    expect(onSave.mock.calls.length).toBe(calls);
  });

  it("creates draft via POST on first auto-save (no draftId)", async () => {
    const onSave = vi.fn().mockResolvedValue({ id: "new-draft-1" });
    const { result } = renderHook(() =>
      useAutoSave({
        data: { title: "New Idea" },
        draftId: null,
        stagingSessionId: "session-1",
        onSave,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 100);
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New Idea" }),
      null,
      "session-1"
    );
    expect(result.current.draftId).toBe("new-draft-1");
  });

  it("updates draft via PATCH on subsequent saves (draftId set)", async () => {
    const onSave = vi.fn().mockResolvedValue({ id: "draft-1" });
    const { rerender } = renderHook(
      ({ data: d }) =>
        useAutoSave({
          data: d,
          draftId: "draft-1",
          stagingSessionId: "s1",
          onSave,
        }),
      { initialProps: { data: { title: "V1" } } }
    );

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 100);
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: "V1" }),
      "draft-1",
      "s1"
    );

    // Change data — triggers new save
    rerender({ data: { title: "V2" } });
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 100);
    });

    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "V2" }),
      "draft-1",
      "s1"
    );
  });

  it("sets saveStatus to 'saving' during request", async () => {
    let resolveSave: (value: { id: string }) => void;
    const onSave = vi.fn(
      () =>
        new Promise<{ id: string }>((resolve) => {
          resolveSave = resolve;
        })
    );

    const { result } = renderHook(() =>
      useAutoSave({
        data: { title: "Test" },
        draftId: null,
        stagingSessionId: "s1",
        onSave,
      })
    );

    // Trigger the debounce
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 100);
    });

    // During the save, status should be "saving"
    expect(result.current.saveStatus).toBe("saving");

    // Resolve the save
    await act(async () => {
      resolveSave!({ id: "draft-1" });
    });

    expect(result.current.saveStatus).toBe("saved");
  });

  it("sets saveStatus to 'saved' on success", async () => {
    const onSave = vi.fn().mockResolvedValue({ id: "draft-1" });
    const { result } = renderHook(() =>
      useAutoSave({
        data: { title: "Success" },
        draftId: null,
        stagingSessionId: "s1",
        onSave,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 100);
    });

    // Wait for the promise to resolve
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe("saved");
  });

  it("sets saveStatus to 'error' on failure and retries on next change", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ id: "draft-1" });

    const { result, rerender } = renderHook(
      ({ data: d }) =>
        useAutoSave({
          data: d,
          draftId: null,
          stagingSessionId: "s1",
          onSave,
        }),
      { initialProps: { data: { title: "V1" } } }
    );

    // First save — fails
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 100);
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe("error");

    // Change data — should retry
    rerender({ data: { title: "V2" } });
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 100);
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(result.current.saveStatus).toBe("saved");
  });

  it("passes stagingSessionId on first create for staged file association", async () => {
    const onSave = vi.fn().mockResolvedValue({ id: "draft-1" });
    renderHook(() =>
      useAutoSave({
        data: { title: "With Files" },
        draftId: null,
        stagingSessionId: "staging-abc",
        onSave,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 100);
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: "With Files" }),
      null,
      "staging-abc"
    );
  });
});
