"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LogoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setLoading(false);
    toast.success("Logged out");
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10">
      <Card className="w-full max-w-sm border-border/60 text-center shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">Logout</CardTitle>
          <CardDescription>End your current session</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogout} disabled={loading} className="w-full">
            {loading ? "Logging out..." : "Logout"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
