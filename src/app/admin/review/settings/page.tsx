import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import BlindReviewToggle from "./BlindReviewToggle";

export default async function AdminReviewSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const role = await getUserRole(supabase, user.id);

  if (role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground mt-2">Only administrators can access this page.</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href="/">← Home</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Review Settings</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Configure review workflow behaviour and anonymization settings.
      </p>
      <div className="flex gap-2 mt-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/review">← Review Dashboard</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/review/workflow">Workflow Config</Link>
        </Button>
      </div>

      <Separator className="my-6" />

      <BlindReviewToggle />
    </main>
  );
}
