"use client";

interface UploadProgressProps {
  current: number;
  total: number;
}

export function UploadProgress({ current, total }: UploadProgressProps) {
  if (total === 0) return null;

  return (
    <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span>Uploading {current} of {total} files...</span>
    </div>
  );
}
