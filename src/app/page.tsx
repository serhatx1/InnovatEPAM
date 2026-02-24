import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10">
      <Card className="w-full max-w-xl border-border/60 shadow-none">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
            InnovatEPAM Portal
          </CardTitle>
          <CardDescription className="text-base">
            Employee innovation management platform
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Button asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/register">Register</Link>
            </Button>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Button asChild variant="secondary">
              <Link href="/ideas">Browse Ideas</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/ideas/new">Submit Idea</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/review">Admin Review</Link>
            </Button>
          </div>
          <Separator />
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href="/auth/logout">Logout</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
