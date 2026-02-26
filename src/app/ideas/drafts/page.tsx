import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listDrafts } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { DraftListClient } from "@/components/draft-list-client";

export default async function DraftsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: drafts, error } = await listDrafts(supabase, user.id);

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">My Drafts</h1>
        <p className="mt-2 text-destructive">Error loading drafts: {error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">My Drafts</h1>
        <Button asChild>
          <Link href="/ideas/new">+ Create New Idea</Link>
        </Button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Continue editing your saved drafts or create a new idea.
      </p>

      <DraftListClient drafts={drafts} />
    </main>
  );
}
