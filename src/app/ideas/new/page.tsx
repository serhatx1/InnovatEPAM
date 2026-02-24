"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IDEA_CATEGORIES,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  CATEGORY_FIELD_DEFINITIONS,
  type IdeaCategory,
} from "@/lib/constants";
import { validateCategoryFieldsForCategory } from "@/lib/validation/category-fields";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const ACCEPT_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.docx";

export default function NewIdeaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<IdeaCategory | "">("");
  const [categoryFieldValues, setCategoryFieldValues] = useState<Record<string, string>>({});
  const [categoryFieldErrors, setCategoryFieldErrors] = useState<Record<string, string[]>>({});

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategoryFieldErrors({});
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const category = ((formData.get("category") as string) || selectedCategory).trim();

    const dynamicValidation = validateCategoryFieldsForCategory(category, categoryFieldValues);
    if (!dynamicValidation.success) {
      setCategoryFieldErrors(dynamicValidation.errors);
      setLoading(false);
      return;
    }

    formData.set("category_fields", JSON.stringify(dynamicValidation.data));

    // Client-side file validation (EC3, EC4)
    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File must not exceed 5 MB");
        setLoading(false);
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
        toast.error("Accepted formats: PDF, PNG, JPG, DOCX");
        setLoading(false);
        return;
      }
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
    <main className="mx-auto max-w-2xl p-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/ideas">← Back to Ideas</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Submit a New Idea</CardTitle>
          <CardDescription>Share your innovation proposal with the team</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-5">
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
                  <h3 className="text-sm font-medium">Category Details</h3>
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

            {/* File attachment */}
            <div className="grid gap-2">
              <Label htmlFor="file">Attachment (optional)</Label>
              <Input id="file" name="file" type="file" accept={ACCEPT_EXTENSIONS} />
              <p className="text-xs text-muted-foreground">Max 5 MB — PDF, PNG, JPG, DOCX</p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Submitting..." : "Submit Idea"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
