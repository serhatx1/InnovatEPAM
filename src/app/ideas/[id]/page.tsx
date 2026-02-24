import { createClient } from "@/lib/supabase/server";
import { getAttachmentUrl } from "@/lib/supabase/storage";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdeaById, getUserRole } from "@/lib/queries";

const STATUS_BADGE: Record<string, string> = {
  submitted: "🟡 Submitted",
  under_review: "🔵 Under Review",
  accepted: "✅ Accepted",
  rejected: "❌ Rejected",
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
      <main style={{ padding: 24 }}>
        <h1>Idea Not Found</h1>
        <p>The idea you are looking for does not exist.</p>
        <Link href="/ideas">← Back to Ideas</Link>
      </main>
    );
  }

  // Resolve attachment signed URL
  let attachmentDownloadUrl: string | null = null;
  if (typedIdea.attachment_url) {
    attachmentDownloadUrl = await getAttachmentUrl(typedIdea.attachment_url);
  }

  return (
    <main style={{ padding: 24, maxWidth: 700 }}>
      <Link href="/ideas">← Back to Ideas</Link>

      <h1 style={{ marginTop: 16 }}>{typedIdea.title}</h1>

      <table style={{ marginBottom: 16 }}>
        <tbody>
          <tr>
            <td style={{ padding: "4px 16px 4px 0", fontWeight: "bold" }}>Category</td>
            <td>{typedIdea.category}</td>
          </tr>
          <tr>
            <td style={{ padding: "4px 16px 4px 0", fontWeight: "bold" }}>Status</td>
            <td>{STATUS_BADGE[typedIdea.status] ?? typedIdea.status}</td>
          </tr>
          <tr>
            <td style={{ padding: "4px 16px 4px 0", fontWeight: "bold" }}>Submitter</td>
            <td>{submitterEmail ?? "Unknown"}</td>
          </tr>
          <tr>
            <td style={{ padding: "4px 16px 4px 0", fontWeight: "bold" }}>Submitted</td>
            <td>{new Date(typedIdea.created_at).toLocaleString()}</td>
          </tr>
          <tr>
            <td style={{ padding: "4px 16px 4px 0", fontWeight: "bold" }}>Last Updated</td>
            <td>{new Date(typedIdea.updated_at).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <h2>Description</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{typedIdea.description}</p>

      {typedIdea.category_fields && Object.keys(typedIdea.category_fields).length > 0 && (
        <>
          <h2>Category Details</h2>
          <ul>
            {Object.entries(typedIdea.category_fields).map(([key, value]) => (
              <li key={key}>
                <strong>{key.replaceAll("_", " ")}:</strong> {String(value)}
              </li>
            ))}
          </ul>
        </>
      )}

      {attachmentDownloadUrl && (
        <>
          <h2>Attachment</h2>
          <a href={attachmentDownloadUrl} target="_blank" rel="noopener noreferrer">
            Download Attachment
          </a>
        </>
      )}

      {typedIdea.evaluator_comment && (
        <>
          <h2>Evaluator Comment</h2>
          <p style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
            {typedIdea.evaluator_comment}
          </p>
        </>
      )}
    </main>
  );
}
