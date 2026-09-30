"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DocumentOut } from "@/lib/types";

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  onError?: (message: string) => void;
  accept?: string;
}

const STAGES = [
  "Reading your document…",
  "Finding important information…",
  "Building your rental overview…",
  "Ready",
];

export function UploadZone({ onUpload, onError, accept = ".pdf" }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileList = Array.from(files);
      if (fileList.length === 0 || uploading) return;
      const file = fileList[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        onError?.("Only PDF files are supported.");
        return;
      }
      setUploading(true);
      setStage(0);
      // Animate through the processing stages while the request runs.
      const timer = setInterval(() => {
        setStage((s) => Math.min(s + 1, STAGES.length - 1));
      }, 800);
      try {
        await onUpload(file);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        clearInterval(timer);
        setStage(STAGES.length - 1);
        setTimeout(() => {
          setUploading(false);
          setStage(0);
        }, 600);
      }
    },
    [onUpload, onError, uploading],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
        dragging ? "border-primary bg-accent" : "border-border bg-muted/20",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">{STAGES[stage]}</p>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <UploadCloud className="h-7 w-7" />
          </div>
          <p className="text-base font-medium">Drag & drop your PDF</p>
          <p className="mt-1 text-sm text-muted-foreground">
            or browse files from your computer
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-5"
            onClick={() => inputRef.current?.click()}
          >
            <FileUp className="h-4 w-4" />
            Browse files
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Supporting PDF rental contracts, house rules, utility statements & more.
          </p>
        </>
      )}
    </div>
  );
}
