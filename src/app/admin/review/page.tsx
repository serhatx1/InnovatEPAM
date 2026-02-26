import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserRole, listIdeas } from "@/lib/queries";
import AdminActions from "./AdminActions";
import StageActions from "./StageActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  submitted: "outline",
  under_review: "secondary",
  accepted: "default",
  rejected: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
};

export default async function AdminReviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Verify admin role
  const role = await getUserRole(supabase, user.id);

  if (role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Card className="border-border/60 shadow-none">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
            <p className="text-muted-foreground mt-2">Only administrators can access this page.</p>
            <Button asChild variant="ghost" size="sm" className="mt-4">
              <Link href="/">← Home</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { data: allIdeas, error } = await listIdeas(supabase);

  // FR-24: Show only actionable ideas (submitted, under_review)
  const ideaList = (allIdeas ?? []).filter(
    (idea) => idea.status === "submitted" || idea.status === "under_review"
  );

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Admin Review</h1>
        <p className="text-destructive mt-2">Error: {error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Admin Review Dashboard</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Review actionable submissions and finalize decisions.</p>
      <div className="flex gap-2 mt-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/ideas">← Ideas</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Home</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/review/workflow">⚙ Workflow Config</Link>
        </Button>
      </div>

      <Separator className="my-6" />

      {ideaList.length === 0 ? (
        <p className="text-muted-foreground">No ideas to review.</p>
      ) : (
        <div className="grid gap-5">
          {ideaList.map((idea) => (
            <Card key={idea.id} className="border-border/60 shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-medium leading-tight">
                    <Link href={`/ideas/${idea.id}`} className="hover:underline">
                      {idea.title}
                    </Link>
                  </CardTitle>
                  <Badge variant={STATUS_VARIANT[idea.status] ?? "outline"}>
                    {STATUS_LABEL[idea.status] ?? idea.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {idea.category} · {new Date(idea.created_at).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-sm whitespace-pre-wrap">
                  {idea.description.length > 200
                    ? idea.description.slice(0, 200) + "..."
                    : idea.description}
                </p>

                {idea.evaluator_comment && (
                  <Card className="border-border/40 bg-muted/40 shadow-none">
                    <CardContent className="pt-3 pb-3">
                      <p className="text-sm">
                        <span className="font-medium">Comment:</span> {idea.evaluator_comment}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <AdminActions ideaId={idea.id} currentStatus={idea.status} />
                <StageActions ideaId={idea.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
