"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { FILE_TYPE_LABELS, IMAGE_MIME_TYPES } from "@/lib/constants";
import { ImageLightbox } from "@/components/ui/image-lightbox";

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function isImageMime(mime: string | null): boolean {
  if (!mime) return false;
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export interface AttachmentDetail {
  id: string | null;
  idea_id: string;
  original_file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string;
  upload_order: number;
  download_url: string;
}

interface AttachmentListDetailProps {
  attachments: AttachmentDetail[];
}

export function AttachmentListDetail({ attachments }: AttachmentListDetailProps) {
  const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = React.useState("");

  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">No attachments</p>;
  }

  // Sort by upload_order
  const sorted = [...attachments].sort((a, b) => a.upload_order - b.upload_order);

  function openLightbox(src: string, alt: string) {
    setLightboxSrc(src);
    setLightboxAlt(alt);
  }

  return (
    <>
      <ul className="space-y-3">
        {sorted.map((att, i) => {
          const label = att.mime_type
            ? (FILE_TYPE_LABELS[att.mime_type] ?? att.mime_type.split("/").pop()?.toUpperCase() ?? "FILE")
            : "FILE";
          const isImage = isImageMime(att.mime_type);

          return (
            <li key={att.id ?? `legacy-${i}`} className="flex items-start gap-3 rounded-md border p-3">
              {/* Thumbnail or type badge */}
              {isImage ? (
                <button
                  type="button"
                  onClick={() => openLightbox(att.download_url, att.original_file_name)}
                  className="shrink-0 cursor-pointer rounded border hover:ring-2 hover:ring-primary"
                >
                  <img
                    src={att.download_url}
                    alt={att.original_file_name}
                    style={{ maxWidth: "120px", objectFit: "contain" }}
                    className="rounded"
                  />
                </button>
              ) : (
                <Badge variant="secondary" className="text-xs font-mono shrink-0 mt-1">
                  {label}
                </Badge>
              )}

              {/* File details */}
              <div className="flex-1 min-w-0">
                <p data-testid="attachment-name" className="text-sm font-medium truncate">
                  {att.original_file_name}
                </p>
                {att.file_size != null && (
                  <p className="text-xs text-muted-foreground">{formatFileSize(att.file_size)}</p>
                )}
              </div>

              {/* Download link */}
              <a
                href={att.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline underline-offset-2 hover:text-primary/80 shrink-0"
              >
                Download
              </a>
            </li>
          );
        })}
      </ul>

      <ImageLightbox
        src={lightboxSrc ?? ""}
        alt={lightboxAlt}
        open={lightboxSrc !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxSrc(null);
        }}
      />
    </>
  );
}
