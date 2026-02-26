"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ScoreSortToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sortBy");
  const currentDir = searchParams.get("sortDir") ?? "desc";

  const isActive = currentSort === "avgScore";

  function handleToggle() {
    const params = new URLSearchParams(searchParams.toString());

    if (!isActive) {
      // Activate sort: default desc
      params.set("sortBy", "avgScore");
      params.set("sortDir", "desc");
    } else if (currentDir === "desc") {
      // Switch to asc
      params.set("sortDir", "asc");
    } else {
      // Remove sort
      params.delete("sortBy");
      params.delete("sortDir");
    }

    router.push(`?${params.toString()}`);
  }

  const label = !isActive
    ? "Sort by Score"
    : currentDir === "desc"
      ? "Score ↓"
      : "Score ↑";

  return (
    <Button
      variant={isActive ? "secondary" : "outline"}
      size="sm"
      onClick={handleToggle}
      data-testid="score-sort-toggle"
    >
      {label}
    </Button>
  );
}
