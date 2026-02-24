import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md border-border/60 shadow-none">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to {email ? <span className="font-medium">{email}</span> : "your inbox"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Open the message and click the confirmation link to finish activation.
          </p>
          <Button asChild variant="outline">
            <Link href="/auth/login">Back to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
