"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { IdeaForm } from "@/components/idea-form";

interface DraftData {
  id: string;
  title: string;
  description: string;
  category: string;
  category_fields: Record<string, string>;
  status: string;
  attachments?: Array<{
    id: string;
    original_file_name: string;
    file_size: number;
    mime_type: string;
    download_url: string;
  }>;
}

export default function DraftEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const stagingSessionId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    async function fetchDraft() {
      const { id } = await params;
      setDraftId(id);

      try {
        const res = await fetch(`/api/drafts/${id}`);
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/auth/login");
            return;
          }
          if (res.status === 404) {
            router.push("/ideas");
            return;
          }
          throw new Error("Failed to load draft");
        }

        const data = await res.json();

        // If not a draft (e.g., submitted), redirect to detail view
        if (data.status !== "draft") {
          router.push(`/ideas/${id}`);
          return;
        }

        setDraft(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load draft");
      } finally {
        setLoading(false);
      }
    }

    fetchDraft();
  }, [params, router]);

  const handleSaveDraft = useCallback(
    async (data: Record<string, unknown>) => {
      if (!draftId) return;

      try {
        const res = await fetch(`/api/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to save draft");
        }

        toast.success("Draft saved!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save draft");
      }
    },
    [draftId]
  );

  /**
   * Upload new files to staging, then attach them to the draft via PATCH.
   */
  const uploadNewFilesToDraft = useCallback(
    async (formData: FormData): Promise<void> => {
      if (!draftId) return;

      const files = formData.getAll("files").filter((f): f is File => f instanceof File);
      if (files.length === 0) return;

      const stagingFileMeta: Array<{
        storagePath: string;
        originalFileName: string;
        fileSize: number;
        mimeType: string;
      }> = [];

      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("sessionId", stagingSessionId);

        const uploadRes = await fetch("/api/drafts/staging/upload", {
          method: "POST",
          body: form,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "File upload failed");
        }

        const uploadData = await uploadRes.json();
        stagingFileMeta.push(uploadData);
      }

      // PATCH the draft with staging files to trigger server-side move + record creation
      const patchRes = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stagingSessionId,
          stagingFiles: stagingFileMeta,
        }),
      });

      if (!patchRes.ok) {
        const body = await patchRes.json();
        throw new Error(body.error || "Failed to attach files");
      }
    },
    [draftId, stagingSessionId]
  );

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      if (!draftId) return;

      // First update the draft with latest data
      const updateBody: Record<string, unknown> = {
        title: formData.get("title"),
        description: formData.get("description"),
        category: formData.get("category"),
      };
      const cfStr = formData.get("category_fields") as string;
      if (cfStr) {
        try {
          updateBody.category_fields = JSON.parse(cfStr);
        } catch {
          // ignore parse errors
        }
      }

      try {
        // Upload new files first (if any)
        await uploadNewFilesToDraft(formData);

        // Update draft text fields
        const patchRes = await fetch(`/api/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateBody),
        });

        if (!patchRes.ok) {
          const body = await patchRes.json();
          throw new Error(body.error || "Failed to update draft");
        }

        // Submit the draft
        const submitRes = await fetch(`/api/drafts/${draftId}/submit`, {
          method: "POST",
        });

        if (!submitRes.ok) {
          const body = await submitRes.json();
          if (body.details) {
            // Show validation errors
            const errorMsg = Object.entries(body.details)
              .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
              .join("; ");
            throw new Error(errorMsg);
          }
          throw new Error(body.error || "Failed to submit");
        }

        toast.success("Idea submitted successfully!");
        router.push(`/ideas/${draftId}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Submission failed");
      }
    },
    [draftId, router, uploadNewFilesToDraft]
  );

  const handleDelete = useCallback(async () => {
    if (!draftId) return;

    try {
      const res = await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Draft deleted");
      router.push("/ideas/drafts");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }, [draftId, router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-muted-foreground">Loading draft...</p>
      </main>
    );
  }

  if (error || !draft) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-destructive">{error || "Draft not found"}</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href="/ideas/drafts">← Back to Drafts</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/ideas/drafts">← Back to Drafts</Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Delete Draft
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this draft. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card className="border-border/60 shadow-none">
        <CardHeader>
          <CardTitle className="text-3xl font-semibold tracking-tight">Edit Draft</CardTitle>
          <CardDescription>Continue working on your draft or submit it for review</CardDescription>
        </CardHeader>
        <CardContent>
          <IdeaForm
            mode="draft-edit"
            initialData={{
              title: draft.title ?? "",
              description: draft.description ?? "",
              category: draft.category ?? "",
              category_fields: draft.category_fields ?? {},
              attachments: draft.attachments ?? [],
            }}
            draftId={draftId ?? undefined}
            stagingSessionId={stagingSessionId}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </main>
  );
}
