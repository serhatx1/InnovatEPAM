"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IDEA_CATEGORIES, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/constants";

export default function NewIdeaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleLen, setTitleLen] = useState(0);
  const [descLen, setDescLen] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File must not exceed 5 MB");
      e.target.value = "";
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
      setFileError("Accepted formats: PDF, PNG, JPG, DOCX");
      e.target.value = "";
      return;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

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
          Title * <small>({titleLen}/100, min 5)</small>
          <input
            name="title"
            required
            minLength={5}
            maxLength={100}
            onChange={(e) => setTitleLen(e.target.value.length)}
            style={{ width: "100%", padding: 8 }}
            placeholder="Short title for your idea"
          />
        </label>

        <label>
          Description * <small>({descLen}/1000, min 20)</small>
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={1000}
            rows={5}
            onChange={(e) => setDescLen(e.target.value.length)}
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
          Attachment (optional — PDF, PNG, JPG, or DOCX, max 5 MB)
          <input
            name="file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            onChange={handleFileChange}
            style={{ width: "100%" }}
          />
          {fileError && <p style={{ color: "red", margin: "4px 0 0" }}>{fileError}</p>}
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
        <Link href="/ideas">← Back to Ideas</Link>
      </p>
    </main>
  );
}
