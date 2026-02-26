"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface ScoreFormProps {
  ideaId: string;
  /** Pre-existing score value (for update flow). */
  existingScore?: number | null;
  /** Pre-existing comment (for update flow). */
  existingComment?: string | null;
  /** Whether scoring is disabled (e.g. terminal idea). */
  disabled?: boolean;
  /** Reason why scoring is disabled, shown as a message. */
  disabledReason?: string;
  /** Callback on successful score submission. */
  onScoreSubmitted?: (score: number, comment: string | null) => void;
}

export default function ScoreForm({
  ideaId,
  existingScore = null,
  existingComment = null,
  disabled = false,
  disabledReason,
  onScoreSubmitted,
}: ScoreFormProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(existingScore);
  const [comment, setComment] = useState<string>(existingComment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isUpdate = existingScore !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (selectedScore === null) {
      setError("Please select a score");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/ideas/${ideaId}/score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: selectedScore,
          comment: comment.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to submit score");
        return;
      }

      setSuccess(isUpdate ? "Score updated" : "Score submitted");
      onScoreSubmitted?.(selectedScore, comment.trim() || null);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div>
        <Label className="text-sm font-medium">Your Score</Label>
        {disabled && disabledReason && (
          <p className="text-sm text-muted-foreground mt-1">{disabledReason}</p>
        )}
        <div
          className="inline-flex items-stretch rounded-xl border border-border overflow-hidden mt-2"
          role="radiogroup"
          aria-label="Score"
        >
          {([
            { value: 1, label: "Poor", bg: "bg-red-500/10 hover:bg-red-500/20", activeBg: "bg-red-100 ring-2 ring-red-400", activeText: "text-red-700" },
            { value: 2, label: "Fair", bg: "bg-orange-500/10 hover:bg-orange-500/20", activeBg: "bg-orange-100 ring-2 ring-orange-400", activeText: "text-orange-700" },
            { value: 3, label: "OK", bg: "bg-yellow-500/10 hover:bg-yellow-500/20", activeBg: "bg-yellow-100 ring-2 ring-yellow-400", activeText: "text-yellow-700" },
            { value: 4, label: "Good", bg: "bg-lime-500/10 hover:bg-lime-500/20", activeBg: "bg-lime-100 ring-2 ring-lime-400", activeText: "text-lime-700" },
            { value: 5, label: "Great", bg: "bg-emerald-500/10 hover:bg-emerald-500/20", activeBg: "bg-emerald-100 ring-2 ring-emerald-400", activeText: "text-emerald-700" },
          ] as const).map((item) => {
            const active = selectedScore === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Score ${item.value} - ${item.label}`}
                disabled={disabled}
                onClick={() => setSelectedScore(item.value)}
                className={`
                  flex flex-col items-center justify-center px-5 py-3 transition-all
                  border-r border-border last:border-r-0
                  ${active ? `${item.activeBg} z-10` : item.bg}
                  ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <span className={`text-base font-bold ${active ? item.activeText : "text-foreground"}`}>
                  {item.value}
                </span>
                <span className={`text-[11px] font-medium mt-0.5 ${active ? item.activeText : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="score-comment" className="text-sm font-medium">
          Comment <span className="text-muted-foreground">(optional, max 500 chars)</span>
        </Label>
        <Textarea
          id="score-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          maxLength={500}
          disabled={disabled}
          className="mt-1"
          rows={3}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-green-600" role="status">
          {success}
        </p>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={disabled || submitting || selectedScore === null}
      >
        {submitting ? "Submitting..." : isUpdate ? "Update Score" : "Submit Score"}
      </Button>
    </form>
  );
}
