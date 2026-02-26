import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDraftCount } from "@/lib/queries";

/**
 * GET /api/drafts/count — Get the count of active drafts for the authenticated user.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count, error } = await getDraftCount(supabase, user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ count });
}
