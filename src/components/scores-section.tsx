"use client";

import { useEffect, useState } from "react";
import ScoreAggregate from "@/components/score-aggregate";
import ScoreList, { type ScoreEntry } from "@/components/score-list";

interface ScoresResponse {
  ideaId: string;
  aggregate: { avgScore: number | null; scoreCount: number };
  scores: ScoreEntry[];
  myScore: { id: string; score: number; comment: string | null; updatedAt: string } | null;
}

export interface ScoresSectionProps {
  ideaId: string;
  currentUserId: string;
}

/**
 * Client component that fetches and displays score aggregate + individual scores
 * for an idea. Re-fetches on mount.
 */
export default function ScoresSection({ ideaId, currentUserId }: ScoresSectionProps) {
  const [data, setData] = useState<ScoresResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScores() {
      try {
        const res = await fetch(`/api/ideas/${ideaId}/scores`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Silent fail — scores section is non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchScores();
  }, [ideaId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading scores...</p>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <ScoreAggregate
        avgScore={data.aggregate.avgScore}
        scoreCount={data.aggregate.scoreCount}
      />
      {data.scores.length > 0 && (
        <ScoreList scores={data.scores} currentUserId={currentUserId} />
      )}
    </div>
  );
}
