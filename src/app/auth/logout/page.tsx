"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setLoading(false);
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Logout</h1>
      <button onClick={handleLogout} disabled={loading} style={{ padding: 10 }}>
        {loading ? "Logging out..." : "Logout"}
      </button>
    </main>
  );
}
