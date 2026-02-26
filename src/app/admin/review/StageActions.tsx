"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ReviewTransitionAction } from "@/types";

interface StageState {
  ideaId: string;
  workflowId: string;
  currentStageId: string;
  currentStageName: string;
  stateVersion: number;
  terminalOutcome: string | null;
  updatedAt: string;
  events: {
    id: string;
    fromStage: string | null;
    toStage: string;
    action: string;
    evaluatorComment: string | null;
    actorId: string;
    occurredAt: string;
  }[];
}

interface StageActionsProps {
  ideaId: string;
}

export default function StageActions({ ideaId }: StageActionsProps) {
  const [stageState, setStageState] = useState<StageState | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [comment, setComment] = useState("");
  const [notInReview, setNotInReview] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/review/ideas/${ideaId}/stage`);
      if (res.status === 404) {
        setNotInReview(true);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setStageState(data);
      setNotInReview(false);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [ideaId]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  async function handleTransition(action: ReviewTransitionAction) {
    if (!stageState) return;
    setTransitioning(true);

    try {
      const res = await fetch(
        `/api/admin/review/ideas/${ideaId}/transition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            expectedStateVersion: stageState.stateVersion,
            comment: comment.trim() || undefined,
          }),
        }
      );

      if (res.status === 409) {
        toast.error("Conflict: stage was modified. Refreshing...");
        await fetchState();
        return;
      }

      if (!res.ok) {
        const body = await res.json();
        toast.error(body.message || body.error || "Transition failed");
        return;
      }

      toast.success(`Stage action "${action}" applied`);
      setComment("");
      await fetchState();
    } catch {
      toast.error("Failed to apply transition");
    } finally {
      setTransitioning(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground animate-pulse">
        Loading stage info...
      </div>
    );
  }

  if (notInReview) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Not in staged review
      </div>
    );
  }

  if (!stageState) return null;

  const isTerminal = stageState.terminalOutcome !== null;

  return (
    <Card className="border-border/40 bg-muted/30 shadow-none mt-2">
      <CardContent className="pt-4 pb-4 grid gap-3">
        {/* Current Stage */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Stage:</span>
          <Badge variant="secondary">{stageState.currentStageName}</Badge>
          <span className="text-xs text-muted-foreground">
            v{stageState.stateVersion}
          </span>
          {isTerminal && (
            <Badge
              variant={stageState.terminalOutcome === "accepted" ? "default" : "destructive"}
            >
              {stageState.terminalOutcome}
            </Badge>
          )}
        </div>

        {/* Actions */}
        {!isTerminal && (
          <>
            <div className="grid gap-1">
              <Label htmlFor={`stage-comment-${ideaId}`} className="text-xs">
                Comment (optional)
              </Label>
              <Textarea
                id={`stage-comment-${ideaId}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Evaluator feedback..."
                maxLength={1000}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleTransition("advance")}
                disabled={transitioning}
              >
                Advance →
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTransition("return")}
                disabled={transitioning}
              >
                ← Return
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTransition("hold")}
                disabled={transitioning}
              >
                Hold
              </Button>
              <Button
                size="sm"
                onClick={() => handleTransition("terminal_accept")}
                disabled={transitioning}
              >
                Accept (Final)
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleTransition("terminal_reject")}
                disabled={transitioning}
              >
                Reject (Final)
              </Button>
            </div>
          </>
        )}

        {/* Event History */}
        {stageState.events.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Stage History
            </p>
            <div className="space-y-1">
              {stageState.events.map((event) => (
                <div key={event.id} className="text-xs text-muted-foreground">
                  <span className="font-mono">
                    {new Date(event.occurredAt).toLocaleString()}
                  </span>
                  {" — "}
                  <span className="font-medium">{event.action}</span>
                  {event.fromStage && ` from ${event.fromStage}`}
                  {` → ${event.toStage}`}
                  {event.evaluatorComment && (
                    <span className="italic"> — "{event.evaluatorComment}"</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isTerminal && (
          <p className="text-sm italic text-muted-foreground">
            Review completed — {stageState.terminalOutcome}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
