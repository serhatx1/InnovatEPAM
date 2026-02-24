import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">InnovatEPAM Portal</CardTitle>
          <CardDescription>Employee innovation management platform</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
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
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/logout">Logout</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
