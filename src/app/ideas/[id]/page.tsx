import { createClient } from "@/lib/supabase/server";
import { getAttachmentUrl } from "@/lib/supabase/storage";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdeaById, getUserRole } from "@/lib/queries";
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
  if (typedIdea) {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("email")
      .eq("id", typedIdea.user_id)
      .single();
    submitterEmail = profile?.email ?? null;
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

  // Resolve attachment signed URL
  let attachmentDownloadUrl: string | null = null;
  if (typedIdea.attachment_url) {
    attachmentDownloadUrl = await getAttachmentUrl(typedIdea.attachment_url);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/ideas">← Back to Ideas</Link>
      </Button>

      <Card className="border-border/60 shadow-none">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-3xl font-semibold tracking-tight">{typedIdea.title}</CardTitle>
            <Badge variant={STATUS_VARIANT[typedIdea.status] ?? "outline"}>
              {STATUS_LABEL[typedIdea.status] ?? typedIdea.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-y-2 text-sm leading-6">
            <span className="font-medium text-muted-foreground">Category</span>
            <span>{typedIdea.category}</span>
            <span className="font-medium text-muted-foreground">Submitter</span>
            <span>{submitterEmail ?? "Unknown"}</span>
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

          {/* Attachment */}
          {attachmentDownloadUrl && (
            <>
              <Separator />
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-2">Attachment</h2>
                <Button asChild variant="outline" size="sm">
                  <a href={attachmentDownloadUrl} target="_blank" rel="noopener noreferrer">
                    Download Attachment
                  </a>
                </Button>
              </div>
            </>
          )}

          {/* Evaluator Comment */}
          {typedIdea.evaluator_comment && (
            <>
              <Separator />
              <Card className="border-border/40 bg-muted/40 shadow-none">
                <CardContent className="pt-4">
                  <h2 className="text-sm font-medium text-muted-foreground mb-1">Evaluator Comment</h2>
                  <p className="whitespace-pre-wrap text-sm">{typedIdea.evaluator_comment}</p>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
