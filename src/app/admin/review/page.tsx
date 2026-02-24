import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserRole, listIdeas } from "@/lib/queries";
import AdminActions from "./AdminActions";

const STATUS_BADGE: Record<string, string> = {
  submitted: "🟡 Submitted",
  under_review: "🔵 Under Review",
  accepted: "✅ Accepted",
  rejected: "❌ Rejected",
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
      <main style={{ padding: 24 }}>
        <h1>Access Denied</h1>
        <p>Only administrators can access this page.</p>
        <Link href="/">← Home</Link>
      </main>
    );
  }

  const { data: allIdeas, error } = await listIdeas(supabase);

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Admin Review</h1>
        <p style={{ color: "red" }}>Error: {error}</p>
      </main>
    );
  }

  // Filter to only actionable statuses (FR-24)
  const ideaList = allIdeas.filter(
    (idea) => idea.status === "submitted" || idea.status === "under_review"
  );

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Admin Review Dashboard</h1>
      <p>
        <Link href="/ideas">← Back to Ideas</Link> | <Link href="/">Home</Link>
      </p>

      {ideaList.length === 0 ? (
        <p>No ideas to review.</p>
      ) : (
        <div style={{ display: "grid", gap: 24, marginTop: 16 }}>
          {ideaList.map((idea) => (
            <div
              key={idea.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h2 style={{ margin: 0 }}>
                  <Link href={`/ideas/${idea.id}`}>{idea.title}</Link>
                </h2>
                <span>{STATUS_BADGE[idea.status] ?? idea.status}</span>
              </div>
              <p style={{ color: "#666", margin: "4px 0" }}>
                {idea.category} · {new Date(idea.created_at).toLocaleDateString()}
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {idea.description.length > 200
                  ? idea.description.slice(0, 200) + "..."
                  : idea.description}
              </p>

              {idea.evaluator_comment && (
                <p style={{ background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
                  <strong>Comment:</strong> {idea.evaluator_comment}
                </p>
              )}

              <AdminActions ideaId={idea.id} currentStatus={idea.status} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
