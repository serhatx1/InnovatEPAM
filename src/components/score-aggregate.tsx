"use client";

import { Badge } from "@/components/ui/badge";

export interface ScoreAggregateProps {
  avgScore: number | null;
  scoreCount: number;
}

/**
 * Displays the average score badge and count label.
 * Shows "No scores yet" when scoreCount is 0.
 */
export default function ScoreAggregate({ avgScore, scoreCount }: ScoreAggregateProps) {
  if (scoreCount === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="score-empty">
        No scores yet
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3" data-testid="score-aggregate">
      <Badge variant="secondary" className="text-base px-3 py-1">
        {avgScore !== null ? avgScore.toFixed(1) : "—"}
      </Badge>
      <span className="text-sm text-muted-foreground">
        Average from {scoreCount} {scoreCount === 1 ? "evaluator" : "evaluators"}
      </span>
    </div>
  );
}
