"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IdeaStatus } from "@/types";

interface AdminActionsProps {
  ideaId: string;
  currentStatus: IdeaStatus;
}

export default function AdminActions({ ideaId, currentStatus }: AdminActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(currentStatus);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleStatusUpdate(newStatus: string) {
    // Reject requires a comment of at least 10 characters (FR-26)
    if (newStatus === "rejected") {
      if (!comment.trim()) {
        setError("A comment is required when rejecting an idea.");
        return;
      }
      if (comment.trim().length < 10) {
        setError("Rejection comment must be at least 10 characters.");
        return;
      }
    }

    setError(null);
    setSuccess(null);
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
      setSuccess(`Status updated to ${newStatus}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isTerminal = status === "accepted" || status === "rejected";

  return (
    <div style={{ marginTop: 12, padding: 12, background: "#fafafa", borderRadius: 4 }}>
      {error && <p style={{ color: "red", margin: "0 0 8px" }}>{error}</p>}
      {success && <p style={{ color: "green", margin: "0 0 8px" }}>{success}</p>}

      {!isTerminal && (
        <>
          <label style={{ display: "block", marginBottom: 8 }}>
            Comment {status !== "rejected" ? "(optional, required for reject)" : "(required)"}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
              placeholder="Add evaluator feedback..."
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            {status === "submitted" && (
              <button
                onClick={() => handleStatusUpdate("under_review")}
                disabled={loading}
                style={{ padding: "6px 16px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
              >
                Start Review
              </button>
            )}
            <button
              onClick={() => handleStatusUpdate("accepted")}
              disabled={loading}
              style={{ padding: "6px 16px", background: "#0a0", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
            >
              Accept
            </button>
            <button
              onClick={() => handleStatusUpdate("rejected")}
              disabled={loading}
              style={{ padding: "6px 16px", background: "#c00", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
            >
              Reject
            </button>
          </div>
        </>
      )}

      {isTerminal && <p style={{ fontStyle: "italic", color: "#666" }}>This idea has been finalized.</p>}
    </div>
  );
}
