import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserRole, listIdeas } from "@/lib/queries";

const STATUS_BADGE: Record<string, string> = {
  submitted: "🟡 Submitted",
  under_review: "🔵 Under Review",
  accepted: "✅ Accepted",
  rejected: "❌ Rejected",
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
      <main style={{ padding: 24 }}>
        <h1>Ideas</h1>
        <p style={{ color: "red" }}>Error loading ideas: {error}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Ideas</h1>
        <Link href="/ideas/new" style={{ padding: "8px 16px", background: "#0070f3", color: "#fff", textDecoration: "none", borderRadius: 4 }}>
          + New Idea
        </Link>
      </div>

      {isAdmin && (
        <p style={{ marginBottom: 16 }}>
          <Link href="/admin/review">Go to Admin Review Dashboard →</Link>
        </p>
      )}

      {ideaList.length === 0 ? (
        <p>No ideas yet. Be the first to submit one!</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ccc" }}>
              <th style={{ padding: 8 }}>Title</th>
              <th style={{ padding: 8 }}>Category</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {ideaList.map((idea) => (
              <tr key={idea.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>
                  <Link href={`/ideas/${idea.id}`}>{idea.title}</Link>
                </td>
                <td style={{ padding: 8 }}>{idea.category}</td>
                <td style={{ padding: 8 }}>{STATUS_BADGE[idea.status] ?? idea.status}</td>
                <td style={{ padding: 8 }}>
                  {new Date(idea.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 24 }}>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
