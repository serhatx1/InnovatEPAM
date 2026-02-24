"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { IDEA_CATEGORIES, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/constants";

const ACCEPT_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.docx";

export default function NewIdeaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

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
          <select name="category" required style={{ width: "100%", padding: 8 }}>
            <option value="">Select a category</option>
            {IDEA_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

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
