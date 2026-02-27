"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  IDEA_CATEGORIES,
  MAX_TOTAL_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS,
  ALLOWED_FILE_TYPES,
  CATEGORY_FIELD_DEFINITIONS,
  FILE_TYPE_LABELS,
  type IdeaCategory,
} from "@/lib/constants";
import { validateCategoryFieldsForCategory } from "@/lib/validation/category-fields";
import { validateFiles } from "@/lib/validation/idea";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileUploadZone } from "@/components/ui/file-upload-zone";
import { UploadProgress } from "@/components/ui/upload-progress";
import { SaveStatusIndicator } from "@/components/ui/save-status-indicator";
import { useAutoSave, type SaveStatus } from "@/lib/hooks/use-auto-save";

export type IdeaFormMode = "new" | "draft-edit";

export interface ExistingAttachment {
  id: string;
  original_file_name: string;
  file_size: number;
  mime_type: string;
  download_url: string;
}

export interface IdeaFormInitialData {
  title?: string;
  description?: string;
  category?: string;
  category_fields?: Record<string, string>;
  attachments?: ExistingAttachment[];
}

export interface IdeaFormProps {
  mode: IdeaFormMode;
  initialData?: IdeaFormInitialData;
  draftId?: string;
  stagingSessionId: string;
  onSaveDraft: (data: Record<string, unknown>, files: File[]) => void;
  onSubmit: (formData: FormData) => void;
}

export function IdeaForm({
  mode,
  initialData,
  draftId: externalDraftId,
  stagingSessionId,
  onSaveDraft,
  onSubmit,
}: IdeaFormProps) {
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [selectedCategory, setSelectedCategory] = useState<IdeaCategory | "">(
    (initialData?.category as IdeaCategory) ?? ""
  );
  const [categoryFieldValues, setCategoryFieldValues] = useState<Record<string, string>>(
    initialData?.category_fields ?? {}
  );
  const [categoryFieldErrors, setCategoryFieldErrors] = useState<Record<string, string[]>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>(
    initialData?.attachments ?? []
  );
  const [fileError, setFileError] = useState<string | null>(null);

  const activeCategoryFields = selectedCategory
    ? CATEGORY_FIELD_DEFINITIONS[selectedCategory] ?? []
    : [];

  // Auto-save data
  const autoSaveData = useMemo(
    () => ({
      title,
      description,
      category: selectedCategory || undefined,
      category_fields: Object.keys(categoryFieldValues).length > 0 ? categoryFieldValues : undefined,
    }),
    [title, description, selectedCategory, categoryFieldValues]
  );

  // Auto-save callback (no-op for form — page-level onSave handles this)
  async function handleAutoSave(
    data: Record<string, unknown>,
    currentDraftId: string | null,
    sessionId: string
  ): Promise<{ id: string }> {
    // This is a no-op placeholder — the parent page handles the actual save
    return { id: currentDraftId ?? "pending" };
  }

  const { saveStatus } = useAutoSave({
    data: autoSaveData,
    draftId: externalDraftId ?? null,
    stagingSessionId,
    onSave: handleAutoSave,
  });

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
    // Account for existing (already-uploaded) attachments in count limit
    const totalCount = existingAttachments.length + combined.length;
    if (totalCount > MAX_ATTACHMENTS) {
      setFileError(`Maximum ${MAX_ATTACHMENTS} files allowed (${existingAttachments.length} already attached)`);
      return;
    }
    const validation = validateFiles(combined);
    if (validation) {
      if (validation.countError) {
        setFileError(validation.countError);
        return;
      }
      if (validation.fileErrors && validation.fileErrors.length > 0) {
        setFileError(validation.fileErrors[0].error);
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

  function handleExistingAttachmentRemoved(index: number) {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSaveDraft() {
    const body: Record<string, unknown> = {};
    if (title) body.title = title;
    if (description) body.description = description;
    if (selectedCategory) body.category = selectedCategory;
    if (Object.keys(categoryFieldValues).length > 0) body.category_fields = categoryFieldValues;
    onSaveDraft(body, files);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategoryFieldErrors({});
    setFileError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("category", selectedCategory);

    // Validate category fields
    const dynamicValidation = validateCategoryFieldsForCategory(selectedCategory, categoryFieldValues);
    if (!dynamicValidation.success) {
      setCategoryFieldErrors(dynamicValidation.errors);
      setLoading(false);
      return;
    }
    formData.set("category_fields", JSON.stringify(dynamicValidation.data));

    for (const file of files) {
      formData.append("files", file);
    }

    onSubmit(formData);
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <SaveStatusIndicator status={saveStatus} />
      </div>

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
              <option key={cat} value={cat}>{cat}</option>
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
                          <option key={option} value={option}>{option}</option>
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
                      <p key={message} className="text-sm text-destructive">{message}</p>
                    ))}
                  </div>
                );
              })}
            </section>
          </>
        )}

        <Separator />

        {/* Existing attachments from server */}
        {existingAttachments.length > 0 && (
          <div className="grid gap-2">
            <Label>Current Attachments</Label>
            <ul className="space-y-1">
              {existingAttachments.map((att, index) => (
                <li
                  key={att.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Badge variant="secondary" className="text-xs font-mono">
                    {FILE_TYPE_LABELS[att.mime_type] ?? att.mime_type.split("/").pop()?.toUpperCase() ?? "FILE"}
                  </Badge>
                  <a
                    href={att.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    {att.original_file_name}
                  </a>
                  <span className="text-xs text-muted-foreground">
                    {att.file_size < 1024 * 1024
                      ? `${(att.file_size / 1024).toFixed(1)} KB`
                      : `${(att.file_size / (1024 * 1024)).toFixed(0)} MB`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleExistingAttachmentRemoved(index)}
                    aria-label={`Remove ${att.original_file_name}`}
                    disabled={loading}
                  >
                    ×
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* File attachments */}
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
            disabled={loading || savingDraft}
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
    </div>
  );
}
