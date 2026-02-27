import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserRole, listIdeas } from "@/lib/queries";
import { getScoreAggregatesForIdeas } from "@/lib/queries/idea-scores";
import AdminActions from "./AdminActions";
import StageActions from "./StageActions";
import ScoreSortToggle from "@/components/score-sort-toggle";
import ScoreForm from "@/components/score-form";
import ScoresSection from "@/components/scores-section";
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

export default async function AdminReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ sortBy?: string; sortDir?: string }>;
}) {
  const params = await searchParams;
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
  const filteredIdeas = (allIdeas ?? []).filter(
    (idea) => idea.status === "submitted" || idea.status === "under_review"
  );

  // Fetch score aggregates for listed ideas
  const ideaIds = filteredIdeas.map((i) => i.id);
  const { data: scoreMap } = await getScoreAggregatesForIdeas(supabase, ideaIds);

  // Fetch admin's existing scores for all displayed ideas (batch)
  const { data: adminScoreRows } = ideaIds.length > 0
    ? await supabase
        .from("idea_score")
        .select("idea_id, score, comment")
        .eq("evaluator_id", user.id)
        .in("idea_id", ideaIds)
    : { data: [] };

  const adminScoreMap = new Map<string, { score: number; comment: string | null }>();
  for (const row of adminScoreRows ?? []) {
    adminScoreMap.set(row.idea_id, { score: row.score, comment: row.comment });
  }

  // Fetch terminal status for displayed ideas (batch)
  const { data: stageStateRows } = ideaIds.length > 0
    ? await supabase
        .from("idea_stage_state")
        .select("idea_id, terminal_outcome")
        .in("idea_id", ideaIds)
    : { data: [] };

  const terminalMap = new Map<string, boolean>();
  for (const row of stageStateRows ?? []) {
    terminalMap.set(row.idea_id, row.terminal_outcome !== null);
  }

  // Enrich with scores
  let ideaList = filteredIdeas.map((idea) => {
    const agg = scoreMap.get(idea.id);
    const adminScore = adminScoreMap.get(idea.id);
    return {
      ...idea,
      avgScore: agg?.avgScore ?? null,
      scoreCount: agg?.scoreCount ?? 0,
      myScore: adminScore?.score ?? null,
      myComment: adminScore?.comment ?? null,
      isTerminal: terminalMap.get(idea.id) ?? false,
      isOwnIdea: idea.user_id === user.id,
    };
  });

  // Sort by avgScore if requested
  if (params.sortBy === "avgScore") {
    const dir = params.sortDir ?? "desc";
    ideaList = ideaList.sort((a, b) => {
      if (a.avgScore === null && b.avgScore === null) return 0;
      if (a.avgScore === null) return 1;
      if (b.avgScore === null) return -1;
      return dir === "asc" ? a.avgScore - b.avgScore : b.avgScore - a.avgScore;
    });
  }

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
                  {idea.scoreCount > 0 && (
                    <span data-testid="idea-score-badge">
                      {" "}· Avg Score: {idea.avgScore?.toFixed(1)} ({idea.scoreCount}{" "}
                      {idea.scoreCount === 1 ? "review" : "reviews"})
                    </span>
                  )}
                  {idea.scoreCount === 0 && (
                    <span className="text-muted-foreground/60" data-testid="idea-no-score"> · No scores</span>
                  )}
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

                {/* Score Form */}
                <Separator />
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-2">Score</h2>
                  <ScoreForm
                    ideaId={idea.id}
                    existingScore={idea.myScore}
                    existingComment={idea.myComment}
                    disabled={idea.isTerminal}
                    disabledReason={idea.isTerminal ? "Scoring is closed — idea has reached a terminal outcome." : undefined}
                  />
                </div>

                {/* Scores Overview */}
                <Separator />
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-2">Scores</h2>
                  <ScoresSection ideaId={idea.id} currentUserId={user.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
