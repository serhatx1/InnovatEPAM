import { describe, it, expect } from "vitest";
import {
  checkConcurrencyVersion,
  conflictResponse,
  CONCURRENCY_CONFLICT,
} from "@/lib/review/concurrency";
import type { IdeaStageState } from "@/types";

function makeState(version: number): IdeaStageState {
  return {
    idea_id: "idea-1",
    workflow_id: "wf-1",
    current_stage_id: "stage-1",
    state_version: version,
    terminal_outcome: null,
    updated_by: "admin-1",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("Optimistic Concurrency Helper", () => {
  describe("checkConcurrencyVersion", () => {
    it("returns null when versions match", () => {
      const result = checkConcurrencyVersion(makeState(3), 3);
      expect(result).toBeNull();
    });

    it("returns CONFLICT when expected version is stale (lower)", () => {
      const result = checkConcurrencyVersion(makeState(5), 3);
      expect(result).toBe(CONCURRENCY_CONFLICT);
    });

    it("returns CONFLICT when expected version is ahead (higher)", () => {
      const result = checkConcurrencyVersion(makeState(2), 4);
      expect(result).toBe(CONCURRENCY_CONFLICT);
    });

    it("returns null for version 1 matching", () => {
      const result = checkConcurrencyVersion(makeState(1), 1);
      expect(result).toBeNull();
    });
  });

  describe("conflictResponse", () => {
    it("returns proper conflict response body", () => {
      const body = conflictResponse();
      expect(body.error).toBe("Conflict");
      expect(body.message).toBe("State changed, refresh and retry");
    });
  });

  describe("CONCURRENCY_CONFLICT constant", () => {
    it("equals 'CONFLICT'", () => {
      expect(CONCURRENCY_CONFLICT).toBe("CONFLICT");
    });
  });
});
