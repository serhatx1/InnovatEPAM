"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  REVIEW_WORKFLOW_MIN_STAGES,
  REVIEW_WORKFLOW_MAX_STAGES,
} from "@/lib/constants";

interface Stage {
  name: string;
}

interface WorkflowData {
  id: string;
  version: number;
  is_active: boolean;
  activated_at: string | null;
  stages: { id: string; name: string; position: number; is_enabled: boolean }[];
}

export default function WorkflowConfigPage() {
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowData | null>(null);
  const [stages, setStages] = useState<Stage[]>([
    { name: "" },
    { name: "" },
    { name: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchWorkflow = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/review/workflow");
      if (res.status === 404) {
        setCurrentWorkflow(null);
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setError("Access denied");
        return;
      }
      if (!res.ok) {
        setError("Failed to load workflow");
        return;
      }
      const data = await res.json();
      setCurrentWorkflow(data);
    } catch {
      setError("Failed to load workflow");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  function addStage() {
    if (stages.length >= REVIEW_WORKFLOW_MAX_STAGES) return;
    setStages([...stages, { name: "" }]);
  }

  function removeStage(index: number) {
    if (stages.length <= REVIEW_WORKFLOW_MIN_STAGES) return;
    setStages(stages.filter((_, i) => i !== index));
  }

  function updateStageName(index: number, name: string) {
    const updated = [...stages];
    updated[index] = { name };
    setStages(updated);
  }

  function moveStage(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;
    const updated = [...stages];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setStages(updated);
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const res = await fetch("/api/admin/review/workflow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save workflow");
        return;
      }

      setCurrentWorkflow(data);
      setSuccess(`Workflow v${data.version} activated successfully`);
    } catch {
      setError("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-muted-foreground">Loading workflow configuration...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">
          Review Workflow Configuration
        </h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Configure the review stages that new ideas will go through.
      </p>
      <div className="flex gap-2 mt-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/review">← Review Dashboard</Link>
        </Button>
      </div>

      <Separator className="my-6" />

      {/* Current Active Workflow */}
      {currentWorkflow && (
        <Card className="border-border/60 shadow-none mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Active Workflow
              </CardTitle>
              <Badge variant="default">v{currentWorkflow.version}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentWorkflow.stages.map((stage, i) => (
                <Badge key={stage.id} variant="secondary">
                  {i + 1}. {stage.name}
                </Badge>
              ))}
            </div>
            {currentWorkflow.activated_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Activated: {new Date(currentWorkflow.activated_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stage Configuration Form */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {currentWorkflow ? "Create New Version" : "Configure Stages"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Define {REVIEW_WORKFLOW_MIN_STAGES}-{REVIEW_WORKFLOW_MAX_STAGES} review stages in order.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          {stages.map((stage, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor={`stage-${index}`} className="text-sm mb-1">
                  Stage {index + 1}
                </Label>
                <Input
                  id={`stage-${index}`}
                  value={stage.name}
                  onChange={(e) => updateStageName(index, e.target.value)}
                  placeholder={`Stage ${index + 1} name`}
                  maxLength={80}
                />
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveStage(index, "up")}
                  disabled={index === 0}
                  aria-label={`Move stage ${index + 1} up`}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveStage(index, "down")}
                  disabled={index === stages.length - 1}
                  aria-label={`Move stage ${index + 1} down`}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStage(index)}
                  disabled={stages.length <= REVIEW_WORKFLOW_MIN_STAGES}
                  aria-label={`Remove stage ${index + 1}`}
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}

          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addStage}
              disabled={stages.length >= REVIEW_WORKFLOW_MAX_STAGES}
            >
              + Add Stage
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600">{success}</p>
          )}

          <Separator />

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Activate Workflow"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
