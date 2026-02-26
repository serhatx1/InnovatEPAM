import { describe, it, expect } from "vitest";
import {
  shapeSubmitterProgress,
  shapeFullProgress,
  shapeProgressByRole,
} from "@/lib/review/visibility";
import type { ReviewStageEvent, ReviewStage } from "@/types";

// ── Test Fixtures ───────────────────────────────────────

const stages: ReviewStage[] = [
  { id: "s-1", workflow_id: "wf-1", name: "Screening", position: 1, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "s-2", workflow_id: "wf-1", name: "Technical", position: 2, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "s-3", workflow_id: "wf-1", name: "Final", position: 3, is_enabled: true, created_at: "2026-01-01T00:00:00Z" },
];

const events: ReviewStageEvent[] = [
  {
    id: "ev-1",
    idea_id: "idea-1",
    workflow_id: "wf-1",
    from_stage_id: null,
    to_stage_id: "s-1",
    action: "advance",
    evaluator_comment: null,
    actor_id: "admin-1",
    occurred_at: "2026-01-01T10:00:00Z",
  },
  {
    id: "ev-2",
    idea_id: "idea-1",
    workflow_id: "wf-1",
    from_stage_id: "s-1",
    to_stage_id: "s-2",
    action: "advance",
    evaluator_comment: "Looks promising",
    actor_id: "admin-1",
    occurred_at: "2026-01-02T10:00:00Z",
  },
];

// ── Tests ───────────────────────────────────────────────

describe("shapeSubmitterProgress", () => {
  it("strips actor identity and evaluator comments from events", () => {
    const result = shapeSubmitterProgress(
      "idea-1",
      "Technical",
      "2026-01-02T10:00:00Z",
      events,
      stages
    );

    expect(result.ideaId).toBe("idea-1");
    expect(result.currentStage).toBe("Technical");
    expect(result.currentStageUpdatedAt).toBe("2026-01-02T10:00:00Z");
    expect(result.events).toHaveLength(2);

    // No actor or comment fields
    for (const ev of result.events) {
      expect(ev).not.toHaveProperty("actorId");
      expect(ev).not.toHaveProperty("evaluatorComment");
      expect(ev).not.toHaveProperty("action");
      expect(ev).not.toHaveProperty("id");
      expect(ev).not.toHaveProperty("fromStage");
    }

    expect(result.events[0].toStage).toBe("Screening");
    expect(result.events[1].toStage).toBe("Technical");
  });

  it("maps unknown stage IDs to 'Unknown'", () => {
    const eventWithUnknownStage: ReviewStageEvent[] = [
      {
        ...events[0],
        to_stage_id: "s-unknown",
      },
    ];

    const result = shapeSubmitterProgress(
      "idea-1",
      "Unknown",
      "2026-01-01T10:00:00Z",
      eventWithUnknownStage,
      stages
    );

    expect(result.events[0].toStage).toBe("Unknown");
  });

  it("does not include terminalOutcome or stateVersion", () => {
    const result = shapeSubmitterProgress(
      "idea-1",
      "Technical",
      "2026-01-02T10:00:00Z",
      events,
      stages
    );

    expect(result).not.toHaveProperty("terminalOutcome");
    expect(result).not.toHaveProperty("stateVersion");
  });
});

describe("shapeFullProgress", () => {
  it("includes all fields for admin/evaluator view", () => {
    const result = shapeFullProgress(
      "idea-1",
      "Technical",
      "2026-01-02T10:00:00Z",
      null,
      3,
      events,
      stages
    );

    expect(result.ideaId).toBe("idea-1");
    expect(result.currentStage).toBe("Technical");
    expect(result.terminalOutcome).toBeNull();
    expect(result.stateVersion).toBe(3);
    expect(result.events).toHaveLength(2);

    const firstEvent = result.events[0];
    expect(firstEvent.id).toBe("ev-1");
    expect(firstEvent.fromStage).toBeNull();
    expect(firstEvent.toStage).toBe("Screening");
    expect(firstEvent.action).toBe("advance");
    expect(firstEvent.actorId).toBe("admin-1");

    const secondEvent = result.events[1];
    expect(secondEvent.fromStage).toBe("Screening");
    expect(secondEvent.toStage).toBe("Technical");
    expect(secondEvent.evaluatorComment).toBe("Looks promising");
  });

  it("includes terminal outcome when present", () => {
    const result = shapeFullProgress(
      "idea-1",
      "Final",
      "2026-01-03T10:00:00Z",
      "accepted",
      5,
      events,
      stages
    );

    expect(result.terminalOutcome).toBe("accepted");
  });
});

describe("shapeProgressByRole", () => {
  it("returns full progress for admin", () => {
    const result = shapeProgressByRole(
      "admin",
      "idea-1",
      "Technical",
      "2026-01-02T10:00:00Z",
      null,
      3,
      events,
      stages
    );

    expect(result).toHaveProperty("stateVersion");
    expect(result).toHaveProperty("terminalOutcome");
    expect(result.events[1]).toHaveProperty("actorId");
    expect(result.events[1]).toHaveProperty("evaluatorComment");
  });

  it("returns full progress for evaluator", () => {
    const result = shapeProgressByRole(
      "evaluator",
      "idea-1",
      "Technical",
      "2026-01-02T10:00:00Z",
      null,
      3,
      events,
      stages
    );

    expect(result).toHaveProperty("stateVersion");
    expect(result.events[1]).toHaveProperty("actorId");
  });

  it("returns stripped progress for submitter during non-terminal", () => {
    const result = shapeProgressByRole(
      "submitter",
      "idea-1",
      "Technical",
      "2026-01-02T10:00:00Z",
      null,
      3,
      events,
      stages
    );

    expect(result).not.toHaveProperty("stateVersion");
    expect(result).not.toHaveProperty("terminalOutcome");
    expect(result.events[0]).not.toHaveProperty("actorId");
    expect(result.events[0]).not.toHaveProperty("evaluatorComment");
  });

  it("returns full progress for submitter after terminal acceptance", () => {
    const result = shapeProgressByRole(
      "submitter",
      "idea-1",
      "Final",
      "2026-01-03T10:00:00Z",
      "accepted",
      5,
      events,
      stages
    );

    expect(result).toHaveProperty("stateVersion");
    expect(result).toHaveProperty("terminalOutcome");
    expect(result.events[1]).toHaveProperty("actorId");
  });

  it("returns full progress for submitter after terminal rejection", () => {
    const result = shapeProgressByRole(
      "submitter",
      "idea-1",
      "Final",
      "2026-01-03T10:00:00Z",
      "rejected",
      5,
      events,
      stages
    );

    expect(result).toHaveProperty("terminalOutcome");
    expect((result as { terminalOutcome: string }).terminalOutcome).toBe("rejected");
    expect(result.events[1]).toHaveProperty("evaluatorComment");
  });
});
