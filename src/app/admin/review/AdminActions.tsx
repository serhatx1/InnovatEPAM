"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IdeaStatus } from "@/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminActionsProps {
  ideaId: string;
  currentStatus: IdeaStatus;
}

export default function AdminActions({ ideaId, currentStatus }: AdminActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(currentStatus);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStatusUpdate(newStatus: string) {
    // Reject requires a comment of at least 10 characters (FR-26)
    if (newStatus === "rejected") {
      if (!comment.trim()) {
        toast.error("A comment is required when rejecting an idea.");
        return;
      }
      if (comment.trim().length < 10) {
        toast.error("Rejection comment must be at least 10 characters.");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/ideas/${ideaId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          evaluatorComment: comment || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update status");
      }

      setStatus(newStatus);
      toast.success(`Status updated to ${newStatus}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isTerminal = status === "accepted" || status === "rejected";

  return (
    <div className="rounded-md border bg-muted/30 p-3 mt-1">
      {!isTerminal && (
        <>
          <div className="grid gap-2 mb-3">
            <Label htmlFor={`comment-${ideaId}`}>
              Comment {status !== "rejected" ? "(optional, required for reject)" : "(required)"}
            </Label>
            <Textarea
              id={`comment-${ideaId}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Add evaluator feedback..."
            />
          </div>

          <div className="flex gap-2">
            {status === "submitted" && (
              <Button
                onClick={() => handleStatusUpdate("under_review")}
                disabled={loading}
                variant="secondary"
                size="sm"
              >
                Start Review
              </Button>
            )}
            <Button
              onClick={() => handleStatusUpdate("accepted")}
              disabled={loading}
              size="sm"
            >
              Accept
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={loading} variant="destructive" size="sm">
                  Reject
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject this idea?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will mark the idea as rejected. A comment of at least 10 characters is required.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {!comment.trim() || comment.trim().length < 10 ? (
                  <p className="text-sm text-destructive">
                    Please add a comment (min 10 chars) before rejecting.
                  </p>
                ) : null}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleStatusUpdate("rejected")}
                    disabled={!comment.trim() || comment.trim().length < 10}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Confirm Reject
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}

      {isTerminal && (
        <p className="text-sm text-muted-foreground italic">This idea has been finalized.</p>
      )}
    </div>
  );
}
