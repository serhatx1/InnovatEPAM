"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FILE_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export interface FileUploadZoneProps {
  files: File[];
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (index: number) => void;
  maxFiles: number;
  maxTotalSize: number;
  acceptedTypes: string[];
  error?: string | null;
  disabled?: boolean;
}

export function FileUploadZone({
  files,
  onFilesAdded,
  onFileRemoved,
  maxFiles,
  maxTotalSize,
  acceptedTypes,
  error,
  disabled = false,
}: FileUploadZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      onFilesAdded(Array.from(selected));
    }
    // Reset so same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const dropped = e.dataTransfer.files;
    if (dropped && dropped.length > 0) {
      onFilesAdded(Array.from(dropped));
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        data-testid="drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <p className="text-sm text-muted-foreground">
          Drag &amp; drop files here, or
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          Choose files
        </Button>
        <p className="text-xs text-muted-foreground">
          Up to {maxFiles} files, {formatFileSize(maxTotalSize)} total
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <ul className="space-y-1">
            {files.map((file, index) => {
              const label = FILE_TYPE_LABELS[file.type] ?? file.type.split("/").pop()?.toUpperCase() ?? "FILE";
              return (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Badge variant="secondary" className="text-xs font-mono">
                    {label}
                  </Badge>
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onFileRemoved(index)}
                    aria-label={`Remove ${file.name}`}
                    disabled={disabled}
                  >
                    ×
                  </Button>
                </li>
              );
            })}
          </ul>

          {/* Size total */}
          <p className="text-xs text-muted-foreground text-right">
            {formatFileSize(totalSize)} / {formatFileSize(maxTotalSize)}
          </p>
        </div>
      )}
    </div>
  );
}
