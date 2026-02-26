"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Idea } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Trash2 } from "lucide-react";

interface DraftListClientProps {
  drafts: Idea[];
}

export function DraftListClient({ drafts: initialDrafts }: DraftListClientProps) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete draft");
        return;
      }
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success("Draft deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete draft");
    } finally {
      setDeletingId(null);
    }
  }

  if (drafts.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="text-muted-foreground">You have no drafts yet.</p>
        <Button asChild>
          <Link href="/ideas/new">Create New Idea</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4">
      {drafts.map((draft) => (
        <div key={draft.id} className="relative">
          <Link href={`/ideas/drafts/${draft.id}`}>
            <Card className="transition-colors hover:border-primary/40 pr-14">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {draft.title || "Untitled Draft"}
                  </CardTitle>
                  {draft.category && (
                    <Badge variant="secondary">{draft.category}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {draft.description || "No description yet"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Last saved:{" "}
                  {new Date(draft.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </CardContent>
            </Card>
          </Link>

          <div className="absolute right-3 top-4 z-10">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
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
                  <AlertDialogAction
                    onClick={() => handleDelete(draft.id)}
                    disabled={deletingId === draft.id}
                  >
                    {deletingId === draft.id ? "Deleting..." : "Continue"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}
