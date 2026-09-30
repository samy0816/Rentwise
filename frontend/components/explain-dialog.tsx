"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { explain } from "@/lib/data";
import { cleanMarkdown } from "@/lib/utils";

interface ExplainDialogProps {
  query: string;
  contextTitle?: string;
  documentId?: number;
  triggerLabel?: string;
  language?: string;
}

export function ExplainDialog({
  query,
  contextTitle,
  documentId,
  triggerLabel = "Explain this",
  language = "en",
}: ExplainDialogProps) {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onOpen() {
    setOpen(true);
    setExplanation(null);
    setLoading(true);
    try {
      const result = await explain(query, documentId, contextTitle, language);
      setExplanation(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground transition hover:bg-accent/70"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            In simple terms
          </DialogTitle>
          <DialogDescription>
            {contextTitle ? `From ${contextTitle}` : "A plain-language explanation."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Explaining this passage…
            </div>
          ) : explanation ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {cleanMarkdown(explanation)}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
