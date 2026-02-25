"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmailConfirmedPage() {
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");
  const [hashError, setHashError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#")) {
      setStatus("success");
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const error = params.get("error");
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description");

    if (error || errorCode || errorDescription) {
      setHashError(errorDescription || errorCode || error || "Email confirmation failed");
      setStatus("error");
      return;
    }

    setStatus("success");
  }, []);

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
                : "Your account is now verified."}
          </CardDescription>
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
