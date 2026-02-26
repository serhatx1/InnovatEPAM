import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanupOrphanedStagedFiles } from "@/lib/supabase/storage";

/**
 * POST /api/admin/cleanup-staging — Remove orphaned staging files.
 * Admin-only endpoint. Removes files older than 24 hours by default.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await cleanupOrphanedStagedFiles();
    return NextResponse.json({
      message: "Staging cleanup complete",
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cleanup failed" },
      { status: 500 }
    );
  }
}
