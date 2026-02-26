import { createClient } from "@/lib/supabase/server";
import { getAttachmentUrl, getAttachmentDownloadUrl } from "@/lib/supabase/storage";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdeaById, getUserRole, getAttachmentsByIdeaId } from "@/lib/queries";
import { getBlindReviewEnabled } from "@/lib/queries/portal-settings";
import { getIdeaStageState } from "@/lib/queries/review-state";
import { getScoresForIdea, getScoreAggregateForIdea } from "@/lib/queries/idea-scores";
import { shouldAnonymize } from "@/lib/review/blind-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AttachmentListDetail, type AttachmentDetail } from "@/components/ui/attachment-list-detail";
import ReviewProgressTimeline from "@/components/review-progress-timeline";
import ScoreForm from "@/components/score-form";
import ScoresSection from "@/components/scores-section";

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

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: typedIdea, error } = await getIdeaById(supabase, id);

  // Fetch submitter email (FR-19/S6: show submitter name)
  let submitterEmail: string | null = null;
  let submitterDisplayName: string | null = null;

  // ── Blind review anonymization ─────────────────────────
  const { enabled: blindReviewEnabled } = await getBlindReviewEnabled(supabase);
  const role = await getUserRole(supabase, user.id);
  const isAdmin = role === "admin";

  if (typedIdea) {
    let isAnonymized = false;

    if (blindReviewEnabled) {
      const { data: stageState } = await getIdeaStageState(supabase, id);
      const terminalOutcome = stageState?.terminal_outcome ?? null;
      isAnonymized = shouldAnonymize({
        viewerRole: isAdmin ? "admin" : "submitter",
        viewerId: user.id,
        ideaUserId: typedIdea.user_id,
        terminalOutcome,
        blindReviewEnabled: true,
      });
    }

    if (isAnonymized) {
      submitterDisplayName = "Anonymous Submitter";
    } else {
      const { data: profile } = await supabase
        .from("user_profile")
        .select("email")
        .eq("id", typedIdea.user_id)
        .single();
      submitterEmail = profile?.email ?? null;
    }
  }

  if (error || !typedIdea) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Idea Not Found</h1>
        <p className="text-muted-foreground mt-2">The idea you are looking for does not exist.</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href="/ideas">← Back to Ideas</Link>
        </Button>
      </main>
    );
  }

  // ── Scoring data ───────────────────────────────────────
  let myScore: number | null = null;
  let myComment: string | null = null;
  let isTerminal = false;
  let isOwnIdea = typedIdea.user_id === user.id;

  if (isAdmin) {
    // Fetch stage state to determine terminal status
    const { data: stageState } = await getIdeaStageState(supabase, id);
    isTerminal = stageState?.terminal_outcome !== null && stageState?.terminal_outcome !== undefined;

    // Fetch evaluator's existing score
    const { data: scores } = await getScoresForIdea(supabase, id);
    const existing = scores.find((s) => s.evaluator_id === user.id);
    if (existing) {
      myScore = existing.score;
      myComment = existing.comment;
    }
  }

  // ── Resolve attachments ────────────────────────────────
  const attachmentDetails: AttachmentDetail[] = [];

  const { data: attachmentRecords } = await getAttachmentsByIdeaId(supabase, id);

  if (attachmentRecords && attachmentRecords.length > 0) {
    // New multi-attachment flow
    for (const att of attachmentRecords) {
      const url = await getAttachmentDownloadUrl(att.storage_path, att.original_file_name);
      if (url) {
        attachmentDetails.push({
          id: att.id,
          idea_id: att.idea_id,
          original_file_name: att.original_file_name,
          file_size: att.file_size,
          mime_type: att.mime_type,
          storage_path: att.storage_path,
          upload_order: att.upload_order,
          download_url: url,
        });
      }
    }
  } else if (typedIdea.attachment_url) {
    // Legacy single-attachment fallback
    const legacyUrl = await getAttachmentUrl(typedIdea.attachment_url);
    if (legacyUrl) {
      const fileName = typedIdea.attachment_url.split("/").pop() ?? "attachment";
      attachmentDetails.push({
        id: null,
        idea_id: typedIdea.id,
        original_file_name: fileName,
        file_size: null,
        mime_type: null,
        storage_path: typedIdea.attachment_url,
        upload_order: 0,
        download_url: legacyUrl,
      });
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{typedIdea.title}</h1>
          <Badge variant={STATUS_VARIANT[typedIdea.status] ?? "outline"}>
            {STATUS_LABEL[typedIdea.status] ?? typedIdea.status}
          </Badge>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-y-2 text-sm leading-6">
          <span className="font-medium text-muted-foreground">Category</span>
          <span>{typedIdea.category}</span>
          <span className="font-medium text-muted-foreground">Submitter</span>
          <span>{submitterDisplayName ?? submitterEmail ?? "Unknown"}</span>
          <span className="font-medium text-muted-foreground">Submitted</span>
          <span>{new Date(typedIdea.created_at).toLocaleString()}</span>
          <span className="font-medium text-muted-foreground">Last Updated</span>
          <span>{new Date(typedIdea.updated_at).toLocaleString()}</span>
        </div>

        <Separator />

        {/* Description */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-1">Description</h2>
          <p className="whitespace-pre-wrap">{typedIdea.description}</p>
        </div>

        {/* Category Fields */}
        {typedIdea.category_fields && Object.keys(typedIdea.category_fields).length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Category Details</h2>
              <ul className="grid gap-1 text-sm">
                {Object.entries(typedIdea.category_fields).map(([key, value]) => (
                  <li key={key}>
                    <span className="font-medium">{key.replaceAll("_", " ")}:</span>{" "}
                    {String(value)}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Attachments */}
        {attachmentDetails.length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Attachments</h2>
              <AttachmentListDetail attachments={attachmentDetails} />
            </div>
          </>
        )}

        {/* Evaluator Comment */}
        {typedIdea.evaluator_comment && (
          <>
            <Separator />
            <div className="rounded-lg border border-border/40 bg-muted/40 px-4 py-3">
              <h2 className="text-sm font-medium text-muted-foreground mb-1">Evaluator Comment</h2>
              <p className="whitespace-pre-wrap text-sm">{typedIdea.evaluator_comment}</p>
            </div>
          </>
        )}

        {/* Review Stage Progress */}
        <Separator />
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Review Progress</h2>
          <ReviewProgressTimeline ideaId={typedIdea.id} />
        </div>

        {/* Score Form (admin / evaluator only) */}
        {isAdmin && (
          <>
            <Separator />
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Score</h2>
              <ScoreForm
                ideaId={typedIdea.id}
                existingScore={myScore}
                existingComment={myComment}
                disabled={isTerminal}
                disabledReason={isTerminal ? "Scoring is closed — idea has reached a terminal outcome." : undefined}
              />
            </div>
          </>
        )}

        {/* Scores overview (admins see all, submitters see their own idea) */}
        {(isAdmin || isOwnIdea) && (
          <>
            <Separator />
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Scores</h2>
              <ScoresSection ideaId={typedIdea.id} currentUserId={user.id} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
