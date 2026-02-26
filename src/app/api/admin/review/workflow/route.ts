import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/queries";
import {
  getActiveWorkflow,
  createAndActivateWorkflow,
} from "@/lib/queries/review-workflow";
import { reviewWorkflowInputSchema } from "@/lib/validation/review-workflow";

/**
 * GET /api/admin/review/workflow — Return the active workflow with ordered stages.
 * Role: admin only.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: workflow, error } = await getActiveWorkflow(supabase);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (!workflow) {
    return NextResponse.json({ error: "No active workflow" }, { status: 404 });
  }

  return NextResponse.json(workflow);
}

/**
 * PUT /api/admin/review/workflow — Create and activate a new workflow version.
 * Role: admin only.
 * Body: { stages: [{ name: string }] }
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = reviewWorkflowInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const { data: workflow, error } = await createAndActivateWorkflow(supabase, {
    stages: parsed.data.stages,
    created_by: user.id,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(workflow);
}
