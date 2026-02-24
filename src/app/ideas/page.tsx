import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserRole, listIdeas } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  submitted: "outline",
  under_review: "secondary",
  accepted: "default",
  rejected: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
};

export default async function IdeasListPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const role = await getUserRole(supabase, user.id);
  const isAdmin = role === "admin";

  // FR-17: All authenticated users see all ideas
  const { data: ideaList, error } = await listIdeas(supabase);

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Ideas</h1>
        <p className="text-destructive mt-2">Error loading ideas: {error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Ideas</h1>
        <Button asChild>
          <Link href="/ideas/new">+ New Idea</Link>
        </Button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">Discover and track innovation submissions.</p>

      {isAdmin && (
        <p className="mt-2">
          <Button asChild variant="link" className="px-0">
            <Link href="/admin/review">Go to Admin Review Dashboard →</Link>
          </Button>
        </p>
      )}

      <Separator className="my-6" />

      {ideaList.length === 0 ? (
        <p className="text-muted-foreground">No ideas yet. Be the first to submit one!</p>
      ) : (
        <div className="grid gap-4">
          {ideaList.map((idea) => (
            <Link key={idea.id} href={`/ideas/${idea.id}`} className="block">
              <Card className="border-border/60 shadow-none transition-colors hover:bg-muted/40">
                <CardHeader className="pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-medium leading-tight">{idea.title}</CardTitle>
                    <Badge variant={STATUS_VARIANT[idea.status] ?? "outline"}>
                      {STATUS_LABEL[idea.status] ?? idea.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{idea.category}</span>
                    <span>·</span>
                    <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">← Home</Link>
        </Button>
      </div>
    </main>
  );
}
