"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface SubmitterEvent {
  toStage: string;
  occurredAt: string;
}

interface FullEvent {
  id: string;
  fromStage: string | null;
  toStage: string;
  action: string;
  evaluatorComment: string | null;
  actorId: string;
  occurredAt: string;
}

type ProgressEvent = SubmitterEvent | FullEvent;

interface ProgressData {
  ideaId: string;
  currentStage: string;
  currentStageUpdatedAt: string;
  terminalOutcome?: string | null;
  stateVersion?: number;
  events: ProgressEvent[];
}

interface ReviewProgressTimelineProps {
  ideaId: string;
}

function isFullEvent(event: ProgressEvent): event is FullEvent {
  return "action" in event;
}

export default function ReviewProgressTimeline({
  ideaId,
}: ReviewProgressTimelineProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notInReview, setNotInReview] = useState(false);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch(`/api/ideas/${ideaId}/review-progress`);
        if (res.status === 404 || res.status === 403) {
          setNotInReview(true);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        setProgress(data);
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchProgress();
  }, [ideaId]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground animate-pulse">
        Loading review progress...
      </p>
    );
  }

  if (notInReview || !progress) return null;

  return (
    <Card className="border-border/40 bg-muted/30 shadow-none">
      <CardContent className="pt-4 pb-4 grid gap-3">
        {/* Current Stage Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current Stage:</span>
          <Badge variant="secondary">{progress.currentStage}</Badge>
          {progress.terminalOutcome && (
            <Badge
              variant={
                progress.terminalOutcome === "accepted"
                  ? "default"
                  : "destructive"
              }
            >
              {progress.terminalOutcome}
            </Badge>
          )}
        </div>

        {/* Timeline */}
        {progress.events.length > 0 && (
          <div className="mt-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Review Timeline
            </p>
            <ol className="relative border-l border-border/50 ml-2 space-y-3">
              {progress.events.map((event, idx) => (
                <li key={idx} className="ml-4">
                  <div className="absolute w-2 h-2 bg-muted-foreground/40 rounded-full -left-1 mt-1.5" />
                  <p className="text-sm font-medium">{event.toStage}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.occurredAt).toLocaleString()}
                  </p>
                  {isFullEvent(event) && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Action: {event.action}
                      </p>
                      {event.evaluatorComment && (
                        <p className="text-xs italic text-muted-foreground">
                          &ldquo;{event.evaluatorComment}&rdquo;
                        </p>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {progress.terminalOutcome && (
          <p className="text-sm italic text-muted-foreground">
            Review completed — {progress.terminalOutcome}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
