"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IDEA_CATEGORIES,
  MAX_FILE_SIZE,
  MAX_TOTAL_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS,
  ALLOWED_FILE_TYPES,
  CATEGORY_FIELD_DEFINITIONS,
  type IdeaCategory,
} from "@/lib/constants";
import { validateCategoryFieldsForCategory } from "@/lib/validation/category-fields";
import { validateFile, validateFiles } from "@/lib/validation/idea";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileUploadZone } from "@/components/ui/file-upload-zone";
import { UploadProgress } from "@/components/ui/upload-progress";
import { SaveStatusIndicator } from "@/components/ui/save-status-indicator";
import { useAutoSave } from "@/lib/hooks/use-auto-save";

export default function NewIdeaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<IdeaCategory | "">("");
  const [categoryFieldValues, setCategoryFieldValues] = useState<Record<string, string>>({});
  const [categoryFieldErrors, setCategoryFieldErrors] = useState<Record<string, string[]>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Generate a stable staging session ID for pre-draft file uploads
  const stagingSessionId = useMemo(
    () => crypto.randomUUID(),
    []
  );

  // Auto-save data object
  const autoSaveData = useMemo(
    () => ({
      title,
      description,
      category: selectedCategory || undefined,
      category_fields: Object.keys(categoryFieldValues).length > 0 ? categoryFieldValues : undefined,
    }),
    [title, description, selectedCategory, categoryFieldValues]
  );

  // Auto-save handler
  async function handleAutoSave(
    data: Record<string, unknown>,
    existingDraftId: string | null,
    sessionId: string
  ): Promise<{ id: string }> {
    const url = existingDraftId ? `/api/drafts/${existingDraftId}` : "/api/drafts";
    const method = existingDraftId ? "PATCH" : "POST";
    const body = existingDraftId ? data : { ...data, stagingSessionId: sessionId };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Auto-save failed");
    const result = await res.json();
    return { id: result.id };
  }

  const { saveStatus, draftId: autoSaveDraftId } = useAutoSave({
    data: autoSaveData,
    draftId,
    stagingSessionId,
    onSave: handleAutoSave,
  });

  // Keep draftId in sync with auto-save
  if (autoSaveDraftId && autoSaveDraftId !== draftId) {
    setDraftId(autoSaveDraftId);
  }

  const activeCategoryFields = selectedCategory
    ? CATEGORY_FIELD_DEFINITIONS[selectedCategory] ?? []
    : [];

  function handleCategoryChange(nextCategory: string) {
    if (!IDEA_CATEGORIES.includes(nextCategory as IdeaCategory)) {
      setSelectedCategory("");
      setCategoryFieldValues({});
      setCategoryFieldErrors({});
      return;
    }

    setSelectedCategory(nextCategory as IdeaCategory);
    setCategoryFieldValues({});
    setCategoryFieldErrors({});
  }

  function handleCategoryFieldChange(fieldKey: string, value: string) {
    setCategoryFieldValues((prev) => ({ ...prev, [fieldKey]: value }));
    setCategoryFieldErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  }

  function handleFilesAdded(newFiles: File[]) {
    setFileError(null);
    const combined = [...files, ...newFiles];

    // Client-side validation
    const validation = validateFiles(combined);
    if (validation) {
      if (validation.countError) {
        setFileError(validation.countError);
        return; // Don't add files if count exceeded
      }
      if (validation.fileErrors && validation.fileErrors.length > 0) {
        setFileError(validation.fileErrors[0].error);
        // Add only the valid files
        setFiles(validation.valid);
        return;
      }
      if (validation.totalSizeError) {
        setFileError(validation.totalSizeError);
        return;
      }
    }

    setFiles(combined);
  }

  function handleFileRemoved(index: number) {
    setFileError(null);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveDraft() {
    setSavingDraft(true);

    try {
      // Upload files to staging first (if any and no draft yet)
      const stagingFiles: Array<{
        storagePath: string;
        originalFileName: string;
        fileSize: number;
        mimeType: string;
      }> = [];

      if (files.length > 0 && !draftId) {
        for (const file of files) {
          const form = new FormData();
          form.append("file", file);
          form.append("sessionId", stagingSessionId);

          const uploadRes = await fetch("/api/drafts/staging/upload", {
            method: "POST",
            body: form,
          });

          if (!uploadRes.ok) {
            const err = await uploadRes.json();
            throw new Error(err.error || "File upload failed");
          }

          const uploadData = await uploadRes.json();
          stagingFiles.push(uploadData);
        }
      }

      const body: Record<string, unknown> = {};
      if (title) body.title = title;
      if (description) body.description = description;
      if (selectedCategory) body.category = selectedCategory;
      if (Object.keys(categoryFieldValues).length > 0) body.category_fields = categoryFieldValues;
      if (!draftId) body.stagingSessionId = stagingSessionId;
      if (stagingFiles.length > 0) body.stagingFiles = stagingFiles;

      const url = draftId ? `/api/drafts/${draftId}` : "/api/drafts";
      const method = draftId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save draft");
      }

      toast.success("Draft saved!");
      router.push("/ideas/drafts");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategoryFieldErrors({});
    setFileError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    const category = selectedCategory;
    formData.set("category", category);

    const dynamicValidation = validateCategoryFieldsForCategory(category, categoryFieldValues);
    if (!dynamicValidation.success) {
      setCategoryFieldErrors(dynamicValidation.errors);
      setLoading(false);
      return;
    }

    formData.set("category_fields", JSON.stringify(dynamicValidation.data));

    // Append all files
    for (const file of files) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to submit idea");
      }

      toast.success("Idea submitted successfully!");
      router.push("/ideas");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/ideas">← Back to Ideas</Link>
      </Button>

      <Card className="border-border/60 shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl font-semibold tracking-tight">Submit a New Idea</CardTitle>
            <SaveStatusIndicator status={saveStatus} />
          </div>
          <CardDescription>Share your innovation proposal with the team</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6">
            {/* Title */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Title *</Label>
                <span className="text-xs text-muted-foreground">{title.length}/100</span>
              </div>
              <Input
                id="title"
                name="title"
                required
                minLength={5}
                maxLength={100}
                placeholder="Short title for your idea"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">5–100 characters</p>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description *</Label>
                <span className="text-xs text-muted-foreground">{description.length}/1000</span>
              </div>
              <Textarea
                id="description"
                name="description"
                required
                minLength={20}
                maxLength={1000}
                rows={5}
                placeholder="Describe your innovation idea in detail"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">20–1000 characters</p>
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                name="category"
                required
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="">Select a category</option>
                {IDEA_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic category-specific fields */}
            {activeCategoryFields.length > 0 && (
              <>
                <Separator />
                <section aria-label="Category-specific fields" className="grid gap-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Category Details</h3>
                  {activeCategoryFields.map((field) => {
                    const errorMessages = categoryFieldErrors[field.field_key] ?? [];
                    const fieldValue = categoryFieldValues[field.field_key] ?? "";

                    return (
                      <div key={field.field_key} className="grid gap-2">
                        <Label htmlFor={`category-field-${field.field_key}`}>
                          {field.field_label}
                          {field.is_required ? " *" : " (optional)"}
                        </Label>

                        {field.field_type === "textarea" ? (
                          <Textarea
                            id={`category-field-${field.field_key}`}
                            value={fieldValue}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                              handleCategoryFieldChange(field.field_key, e.target.value)
                            }
                            rows={4}
                          />
                        ) : field.field_type === "select" ? (
                          <select
                            id={`category-field-${field.field_key}`}
                            value={fieldValue}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                              handleCategoryFieldChange(field.field_key, e.target.value)
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          >
                            <option value="">Select</option>
                            {(field.options ?? []).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id={`category-field-${field.field_key}`}
                            type={field.field_type === "number" ? "number" : "text"}
                            min={field.field_type === "number" ? field.min : undefined}
                            max={field.field_type === "number" ? field.max : undefined}
                            value={fieldValue}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              handleCategoryFieldChange(field.field_key, e.target.value)
                            }
                          />
                        )}

                        {errorMessages.map((message) => (
                          <p key={message} className="text-sm text-destructive">
                            {message}
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </section>
              </>
            )}

            <Separator />

            {/* File attachments (multi-file) */}
            <div className="grid gap-2">
              <Label>Attachments (optional)</Label>
              <FileUploadZone
                files={files}
                onFilesAdded={handleFilesAdded}
                onFileRemoved={handleFileRemoved}
                maxFiles={MAX_ATTACHMENTS}
                maxTotalSize={MAX_TOTAL_ATTACHMENT_SIZE}
                acceptedTypes={[...ALLOWED_FILE_TYPES]}
                error={fileError}
                disabled={loading}
              />
            </div>

            {loading && files.length > 0 && (
              <UploadProgress current={0} total={files.length} />
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={savingDraft || loading}
                onClick={handleSaveDraft}
              >
                {savingDraft ? "Saving..." : "Save Draft"}
              </Button>
              <Button type="submit" disabled={loading || savingDraft}>
                {loading ? "Submitting..." : "Submit Idea"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
