import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getIdeaStageState,
  getIdeaStageStateWithEvents,
  createIdeaStageState,
  updateIdeaStageState,
  recordStageEvent,
  getStageEvents,
} from "@/lib/queries/review-state";

// ── Helpers ─────────────────────────────────────────────

function mockSupabase(overrides: Record<string, unknown> = {}) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return { from: vi.fn(() => chainable), _chain: chainable } as any;
}

// ── getIdeaStageState ───────────────────────────────────

describe("getIdeaStageState", () => {
  it("returns data on success", async () => {
    const state = { idea_id: "i-1", workflow_id: "wf-1", current_stage_id: "s-1" };
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: state, error: null }),
    });

    const result = await getIdeaStageState(supabase, "i-1");
    expect(result.data).toEqual(state);
    expect(result.error).toBeNull();
  });

  it("returns null data for not found (PGRST116)", async () => {
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      }),
    });

    const result = await getIdeaStageState(supabase, "i-1");
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it("returns error for other failures", async () => {
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "db error" },
      }),
    });

    const result = await getIdeaStageState(supabase, "i-1");
    expect(result.data).toBeNull();
    expect(result.error).toBe("db error");
  });
});

// ── getIdeaStageStateWithEvents ─────────────────────────

describe("getIdeaStageStateWithEvents", () => {
  it("returns state with events on success", async () => {
    const state = { idea_id: "i-1", workflow_id: "wf-1", current_stage_id: "s-1" };
    const events = [{ id: "e-1", action: "advance" }];

    // We need two separate from() calls — one for state, one for events
    let callCount = 0;
    const stateChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: state, error: null }),
    };
    const eventsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: events, error: null }),
    };
    const supabase = {
      from: vi.fn((table: string) => {
        callCount++;
        if (table === "idea_stage_state" || callCount === 1) return stateChain;
        return eventsChain;
      }),
    } as any;

    const result = await getIdeaStageStateWithEvents(supabase, "i-1");
    expect(result.data).toEqual({ ...state, events });
    expect(result.error).toBeNull();
  });

  it("returns null when state not found", async () => {
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      }),
    });

    const result = await getIdeaStageStateWithEvents(supabase, "i-1");
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it("returns error when state fetch fails", async () => {
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "state error" },
      }),
    });

    const result = await getIdeaStageStateWithEvents(supabase, "i-1");
    expect(result.data).toBeNull();
    expect(result.error).toBe("state error");
  });

  it("returns error when events fetch fails", async () => {
    const state = { idea_id: "i-1", workflow_id: "wf-1", current_stage_id: "s-1" };
    const stateChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: state, error: null }),
    };
    const eventsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "events error" } }),
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "idea_stage_state") return stateChain;
        return eventsChain;
      }),
    } as any;

    const result = await getIdeaStageStateWithEvents(supabase, "i-1");
    expect(result.data).toBeNull();
    expect(result.error).toBe("events error");
  });
});

// ── createIdeaStageState ────────────────────────────────

describe("createIdeaStageState", () => {
  it("returns created state on success", async () => {
    const newState = { idea_id: "i-1", workflow_id: "wf-1", current_stage_id: "s-1", updated_by: "u-1" };
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: newState, error: null }),
    });

    const result = await createIdeaStageState(supabase, {
      idea_id: "i-1",
      workflow_id: "wf-1",
      current_stage_id: "s-1",
      updated_by: "u-1",
    });
    expect(result.data).toEqual(newState);
    expect(result.error).toBeNull();
  });

  it("returns error on insert failure", async () => {
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "insert error" },
      }),
    });

    const result = await createIdeaStageState(supabase, {
      idea_id: "i-1",
      workflow_id: "wf-1",
      current_stage_id: "s-1",
      updated_by: "u-1",
    });
    expect(result.data).toBeNull();
    expect(result.error).toBe("insert error");
  });
});

// ── updateIdeaStageState ────────────────────────────────

describe("updateIdeaStageState", () => {
  it("returns updated state on success", async () => {
    const updated = { idea_id: "i-1", state_version: 2, current_stage_id: "s-2" };
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    });

    const result = await updateIdeaStageState(supabase, "i-1", 1, {
      current_stage_id: "s-2",
      updated_by: "admin-1",
    });
    expect(result.data).toEqual(updated);
    expect(result.error).toBeNull();
  });

  it("returns CONFLICT on stale version (PGRST116)", async () => {
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "no rows" },
      }),
    });

    const result = await updateIdeaStageState(supabase, "i-1", 99, {
      current_stage_id: "s-2",
      updated_by: "admin-1",
    });
    expect(result.data).toBeNull();
    expect(result.error).toBe("CONFLICT");
  });

  it("returns error for other failures", async () => {
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "OTHER", message: "db error" },
      }),
    });

    const result = await updateIdeaStageState(supabase, "i-1", 1, {
      current_stage_id: "s-2",
      updated_by: "admin-1",
    });
    expect(result.error).toBe("db error");
  });

  it("handles terminal_outcome parameter", async () => {
    const updated = { idea_id: "i-1", state_version: 2, terminal_outcome: "accepted" };
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    });

    const result = await updateIdeaStageState(supabase, "i-1", 1, {
      current_stage_id: "s-3",
      updated_by: "admin-1",
      terminal_outcome: "accepted",
    });
    expect(result.data?.terminal_outcome).toBe("accepted");
  });
});

// ── recordStageEvent ────────────────────────────────────

describe("recordStageEvent", () => {
  it("returns recorded event on success", async () => {
    const event = { id: "e-1", action: "advance" };
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: event, error: null }),
    });

    const result = await recordStageEvent(supabase, {
      idea_id: "i-1",
      workflow_id: "wf-1",
      from_stage_id: "s-1",
      to_stage_id: "s-2",
      action: "advance",
      actor_id: "admin-1",
    });
    expect(result.data).toEqual(event);
    expect(result.error).toBeNull();
  });

  it("returns error on insert failure", async () => {
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "event error" },
      }),
    });

    const result = await recordStageEvent(supabase, {
      idea_id: "i-1",
      workflow_id: "wf-1",
      from_stage_id: null,
      to_stage_id: "s-1",
      action: "advance",
      actor_id: "admin-1",
    });
    expect(result.error).toBe("event error");
  });

  it("handles optional evaluator_comment", async () => {
    const event = { id: "e-1", action: "advance", evaluator_comment: "Looks good" };
    const supabase = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: event, error: null }),
    });

    const result = await recordStageEvent(supabase, {
      idea_id: "i-1",
      workflow_id: "wf-1",
      from_stage_id: "s-1",
      to_stage_id: "s-2",
      action: "advance",
      evaluator_comment: "Looks good",
      actor_id: "admin-1",
    });
    expect(result.data?.evaluator_comment).toBe("Looks good");
  });
});

// ── getStageEvents ──────────────────────────────────────

describe("getStageEvents", () => {
  it("returns events on success", async () => {
    const events = [{ id: "e-1" }, { id: "e-2" }];
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: events, error: null }),
    };
    const supabase = { from: vi.fn(() => chain) } as any;

    const result = await getStageEvents(supabase, "i-1");
    expect(result.data).toHaveLength(2);
    expect(result.error).toBeNull();
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
    };
    const supabase = { from: vi.fn(() => chain) } as any;

    const result = await getStageEvents(supabase, "i-1");
    expect(result.data).toEqual([]);
    expect(result.error).toBe("fail");
  });

  it("returns empty array when data is null (no events)", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = { from: vi.fn(() => chain) } as any;

    const result = await getStageEvents(supabase, "i-1");
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});
