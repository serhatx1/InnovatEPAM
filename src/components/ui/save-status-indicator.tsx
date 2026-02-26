"use client";

import { Loader2, Check, AlertTriangle } from "lucide-react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

/**
 * Subtle status indicator for auto-save state.
 * Renders nothing when idle, spinner when saving, checkmark when saved, warning on error.
 */
export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  if (status === "idle") {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3 w-3 text-green-600" />
          <span>Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="h-3 w-3 text-destructive" />
          <span>Save failed</span>
        </>
      )}
    </div>
  );
}
