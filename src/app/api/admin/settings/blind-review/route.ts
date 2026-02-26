import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/queries";
import { getBlindReviewEnabled, setBlindReviewEnabled } from "@/lib/queries/portal-settings";
import { blindReviewSettingSchema } from "@/lib/validation/blind-review";

/**
 * GET /api/admin/settings/blind-review — Read current blind review setting.
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

  const setting = await getBlindReviewEnabled(supabase);

  return NextResponse.json({
    enabled: setting.enabled,
    updatedBy: setting.updatedBy,
    updatedAt: setting.updatedAt,
  });
}

/**
 * PUT /api/admin/settings/blind-review — Enable or disable blind review.
 * Role: admin only.
 * Body: { enabled: boolean }
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
  const parsed = blindReviewSettingSchema.safeParse(body);

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

  const { data, error } = await setBlindReviewEnabled(
    supabase,
    parsed.data.enabled,
    user.id
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    enabled: data!.enabled,
    updatedBy: data!.updatedBy,
    updatedAt: data!.updatedAt,
  });
}
