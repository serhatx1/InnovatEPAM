"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IDEA_CATEGORIES,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  CATEGORY_FIELD_DEFINITIONS,
  type IdeaCategory,
} from "@/lib/constants";
import { validateCategoryFieldsForCategory } from "@/lib/validation/category-fields";

const ACCEPT_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.docx";

export default function NewIdeaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
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
        setError("File must not exceed 5 MB");
        setLoading(false);
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
        setError("Accepted formats: PDF, PNG, JPG, DOCX");
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

      router.push("/ideas");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 600 }}>
      <h1>Submit a New Idea</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <label>
          Title * <small>(5–100 characters)</small>
          <input
            name="title"
            required
            minLength={5}
            maxLength={100}
            style={{ width: "100%", padding: 8 }}
            placeholder="Short title for your idea"
          />
        </label>

        <label>
          Description * <small>(20–1000 characters)</small>
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={1000}
            rows={5}
            style={{ width: "100%", padding: 8 }}
            placeholder="Describe your innovation idea in detail"
          />
        </label>

        <label>
          Category *
          <select
            name="category"
            required
            value={selectedCategory}
            onChange={(event) => handleCategoryChange(event.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">Select a category</option>
            {IDEA_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        {activeCategoryFields.length > 0 && (
          <section aria-label="Category-specific fields" style={{ display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Category Details</h2>
            {activeCategoryFields.map((field) => {
              const errorMessages = categoryFieldErrors[field.field_key] ?? [];
              const commonProps = {
                id: `category-field-${field.field_key}`,
                value: categoryFieldValues[field.field_key] ?? "",
                onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                  handleCategoryFieldChange(field.field_key, event.target.value),
                style: { width: "100%", padding: 8 },
              };

              return (
                <label key={field.field_key}>
                  {field.field_label}
                  {field.is_required ? " *" : " (optional)"}

                  {field.field_type === "textarea" ? (
                    <textarea {...commonProps} rows={4} />
                  ) : field.field_type === "select" ? (
                    <select {...commonProps}>
                      <option value="">Select</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...commonProps}
                      type={field.field_type === "number" ? "number" : "text"}
                      min={field.field_type === "number" ? field.min : undefined}
                      max={field.field_type === "number" ? field.max : undefined}
                    />
                  )}

                  {errorMessages.map((message) => (
                    <p key={message} style={{ color: "red", margin: "4px 0 0" }}>
                      {message}
                    </p>
                  ))}
                </label>
              );
            })}
          </section>
        )}

        <label>
          Attachment (optional, max 5 MB — PDF, PNG, JPG, DOCX)
          <input name="file" type="file" accept={ACCEPT_EXTENSIONS} style={{ width: "100%" }} />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 12, cursor: "pointer" }}
        >
          {loading ? "Submitting..." : "Submit Idea"}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        <a href="/ideas">← Back to Ideas</a>
      </p>
    </main>
  );
}
