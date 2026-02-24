import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmailConfirmedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md border-border/60 shadow-none">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">Email confirmed</CardTitle>
          <CardDescription>Your account is now verified.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button asChild>
            <Link href="/auth/login">Go to Login</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
