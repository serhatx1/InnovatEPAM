"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AUTOSAVE_DEBOUNCE_MS } from "@/lib/constants";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseAutoSaveOptions {
  /** Current form data to track for changes. */
  data: Record<string, unknown>;
  /** Existing draft ID — null for new drafts. */
  draftId: string | null;
  /** Staging session ID for pre-draft file uploads. */
  stagingSessionId: string;
  /** Callback to persist the draft. Receives (data, draftId | null, stagingSessionId). Returns { id } of created/updated draft. */
  onSave: (
    data: Record<string, unknown>,
    draftId: string | null,
    stagingSessionId: string
  ) => Promise<{ id: string }>;
}

/**
 * Auto-save hook that debounces saves, tracks dirty state via deep equality,
 * and exposes save status for UI indicators.
 */
export function useAutoSave({
  data,
  draftId: externalDraftId,
  stagingSessionId,
  onSave,
}: UseAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [internalDraftId, setInternalDraftId] = useState<string | null>(
    externalDraftId
  );

  const lastSavedRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const stagingRef = useRef(stagingSessionId);
  stagingRef.current = stagingSessionId;

  // Sync external draftId changes
  useEffect(() => {
    if (externalDraftId) {
      setInternalDraftId(externalDraftId);
    }
  }, [externalDraftId]);

  const doSave = useCallback(
    async (currentData: Record<string, unknown>) => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setSaveStatus("saving");

      try {
        const result = await onSaveRef.current(
          currentData,
          internalDraftId,
          stagingRef.current
        );
        setInternalDraftId(result.id);
        lastSavedRef.current = JSON.stringify(currentData);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      } finally {
        isSavingRef.current = false;
      }
    },
    [internalDraftId]
  );

  useEffect(() => {
    const serialized = JSON.stringify(data);

    // Skip if data hasn't changed since last save
    if (serialized === lastSavedRef.current) {
      return;
    }

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new debounce timer
    timerRef.current = setTimeout(() => {
      doSave(data);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, doSave]);

  return {
    saveStatus,
    draftId: internalDraftId,
  };
}
