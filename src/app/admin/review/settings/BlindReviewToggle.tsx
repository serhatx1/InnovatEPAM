"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EyeOff, Eye } from "lucide-react";

interface BlindReviewSetting {
  enabled: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

export default function BlindReviewToggle() {
  const [setting, setSetting] = useState<BlindReviewSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSetting = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/blind-review");
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to load setting");
        return;
      }
      const data = await res.json();
      setSetting(data);
      setError(null);
    } catch {
      setError("Failed to load blind review setting");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSetting();
  }, [fetchSetting]);

  async function handleToggle(enabled: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/blind-review", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to update setting");
        return;
      }
      const data = await res.json();
      setSetting(data);
    } catch {
      setError("Failed to update blind review setting");
    } finally {
      setSaving(false);
    }
  }

  const isEnabled = setting?.enabled ?? false;

  if (loading) {
    return (
      <Card className="border-border/60 shadow-none">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p className="text-muted-foreground text-sm">Loading blind review setting…</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`shadow-none transition-colors ${
        isEnabled
          ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20"
          : "border-border/60"
      }`}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg font-medium">Blind Review Mode</CardTitle>
          <Badge
            variant={isEnabled ? "default" : "outline"}
            className={`text-xs font-semibold ${
              isEnabled
                ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                : "text-muted-foreground"
            }`}
          >
            {isEnabled ? "ACTIVE" : "INACTIVE"}
          </Badge>
        </div>
        <CardDescription className="mt-1">
          Hide submitter identities from evaluators during the review process.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* ── Prominent action buttons ── */}
        <div className="flex gap-3">
          <Button
            size="lg"
            disabled={saving || isEnabled}
            onClick={() => handleToggle(true)}
            className={`flex-1 gap-2 text-sm font-semibold transition-all ${
              isEnabled
                ? "bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600 cursor-default"
                : "bg-background text-foreground border border-input hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
            }`}
          >
            <EyeOff className="h-4 w-4" />
            {saving && !isEnabled ? "Enabling…" : "Enable Blind Review"}
          </Button>
          <Button
            size="lg"
            disabled={saving || !isEnabled}
            onClick={() => handleToggle(false)}
            variant="outline"
            className={`flex-1 gap-2 text-sm font-semibold transition-all ${
              !isEnabled
                ? "bg-muted text-muted-foreground border-muted cursor-default"
                : "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
            }`}
          >
            <Eye className="h-4 w-4" />
            {saving && isEnabled ? "Disabling…" : "Disable Blind Review"}
          </Button>
        </div>

        {saving && (
          <div className="flex items-center gap-2 justify-center">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <span className="text-xs text-muted-foreground">Saving changes…</span>
          </div>
        )}

        {/* ── Info box ── */}
        <div className="rounded-md border bg-muted/40 px-4 py-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">When enabled:</strong> evaluators see{" "}
            <strong className="text-foreground">&ldquo;Anonymous Submitter&rdquo;</strong> instead
            of the real submitter identity during non-terminal review stages.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground mt-1">
            <strong className="text-foreground">Not affected:</strong> admins and submitters viewing their own ideas.
          </p>
        </div>

        {/* ── Status line ── */}
        <div className="flex items-center justify-between text-sm">
          <span className={isEnabled ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
            {isEnabled
              ? "Evaluators cannot see submitter names"
              : "Evaluators can see submitter names"}
          </span>
          {setting?.updatedAt && (
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(setting.updatedAt).toLocaleString()}
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
