"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Process Improvement", "Product Feature", "Cost Reduction", "Culture", "Other"];

export default function NewIdeaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          Title *
          <input
            name="title"
            required
            style={{ width: "100%", padding: 8 }}
            placeholder="Short title for your idea"
          />
        </label>

        <label>
          Description *
          <textarea
            name="description"
            required
            rows={5}
            style={{ width: "100%", padding: 8 }}
            placeholder="Describe your innovation idea in detail"
          />
        </label>

        <label>
          Category *
          <select name="category" required style={{ width: "100%", padding: 8 }}>
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label>
          Attachment (optional)
          <input name="file" type="file" style={{ width: "100%" }} />
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
