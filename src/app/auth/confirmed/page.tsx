"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function EmailConfirmedPage() {
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");
  const [hashError, setHashError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#")) {
      const params = new URLSearchParams(hash.slice(1));
      const error = params.get("error");
      const errorCode = params.get("error_code");
      const errorDescription = params.get("error_description");

      if (error || errorCode || errorDescription) {
        setHashError(errorDescription || errorCode || error || "Email confirmation failed");
        setStatus("error");
        return;
      }
    }

    // Check if the user already has an active session from the confirm route
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setStatus("success");
        // Redirect authenticated user straight into the app
        setTimeout(() => router.replace("/ideas"), 1500);
      } else {
        setStatus("success");
      }
    });
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md border-border/60 shadow-none">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {status === "checking"
              ? "Checking confirmation"
              : status === "error"
                ? "Confirmation failed"
                : "Email confirmed"}
          </CardTitle>
          <CardDescription>
            {status === "checking"
              ? "Please wait while we verify your confirmation status."
              : status === "error"
                ? hashError
                : "Your account is now verified. Redirecting you to the portal…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {status === "error" ? (
            <Button asChild>
              <Link href="/auth/login">Go to Login</Link>
            </Button>
          ) : status === "success" ? (
            <Button asChild>
              <Link href="/ideas">Go to Portal</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
