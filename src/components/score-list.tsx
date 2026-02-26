"use client";

import { Card, CardContent } from "@/components/ui/card";

export interface ScoreEntry {
  id: string;
  evaluatorId: string;
  evaluatorDisplayName: string;
  score: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreListProps {
  scores: ScoreEntry[];
  /** Current user's evaluator ID — used to highlight own score. */
  currentUserId?: string;
}

/**
 * Displays a list of individual score entries for an idea.
 * Highlights the current user's own score.
 */
export default function ScoreList({ scores, currentUserId }: ScoreListProps) {
  if (scores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="score-list-empty">
        No individual scores to display.
      </p>
    );
  }

  return (
    <div className="grid gap-2" data-testid="score-list">
      {scores.map((entry) => {
        const isOwn = currentUserId === entry.evaluatorId;
        return (
          <Card
            key={entry.id}
            className={`border-border/40 shadow-none ${isOwn ? "bg-primary/5 border-primary/30" : "bg-muted/40"}`}
            data-testid={isOwn ? "score-entry-own" : "score-entry"}
          >
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {entry.evaluatorDisplayName}
                  {isOwn && (
                    <span className="text-xs text-muted-foreground ml-2">(you)</span>
                  )}
                </span>
                <span className="text-sm font-semibold">{entry.score}/5</span>
              </div>
              {entry.comment && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {entry.comment}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
