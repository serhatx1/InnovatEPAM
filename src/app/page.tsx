import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, listIdeas } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">InnovatEPAM Portal</h1>
            <p className="text-sm text-muted-foreground">Enterprise innovation workspace.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/register">Register</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const role = await getUserRole(supabase, user.id);
  const isAdmin = role === "admin";
  const { data: myIdeas } = await listIdeas(supabase, { userId: user.id });
  const myIdeasCount = myIdeas.length;

  let actionableCount = 0;
  if (isAdmin) {
    const { data: allIdeas } = await listIdeas(supabase);
    actionableCount = allIdeas.filter(
      (idea) => idea.status === "submitted" || idea.status === "under_review"
    ).length;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60 shadow-none">
          <CardContent className="space-y-1 p-6">
            <p className="text-sm text-muted-foreground">My Ideas</p>
            <p className="text-3xl font-semibold tracking-tight">{myIdeasCount}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-none">
          <CardContent className="space-y-1 p-6">
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="text-3xl font-semibold tracking-tight">{isAdmin ? "Admin" : "Submitter"}</p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-border/60 shadow-none md:col-span-2">
            <CardContent className="space-y-1 p-6">
              <p className="text-sm text-muted-foreground">Actionable Reviews</p>
              <p className="text-3xl font-semibold tracking-tight">{actionableCount}</p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/ideas/new">Submit New Idea</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/ideas">View Ideas</Link>
        </Button>
      </section>
    </main>
  );
}
