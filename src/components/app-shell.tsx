import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  const role = await getUserRole(supabase, user.id);
  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r bg-card md:flex md:flex-col">
        <div className="px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            InnovatEPAM
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Portal</h2>
        </div>

        <Separator />

        <nav className="flex-1 px-3 py-4">
          <ul className="grid gap-1">
            <li>
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/">Home</Link>
              </Button>
            </li>
            <li>
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/ideas">Ideas</Link>
              </Button>
            </li>
            <li>
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/ideas/new">Submit Idea</Link>
              </Button>
            </li>
            {isAdmin && (
              <li>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link href="/admin/review">Admin Review</Link>
                </Button>
              </li>
            )}
          </ul>
        </nav>

        <Separator />

        <div className="px-5 py-4">
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full justify-start">
            <Link href="/auth/logout">Logout</Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="border-b bg-background px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold tracking-tight">InnovatEPAM</p>
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/logout">Logout</Link>
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/ideas">Ideas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/ideas/new">Submit</Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/review">Admin</Link>
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
