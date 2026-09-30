"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, MessageSquareText, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ask, getDocuments } from "@/lib/data";
import { demoSuggestedQuestions } from "@/lib/demo";
import { useAuth } from "@/lib/auth-context";
import { translate } from "@/lib/i18n";
import { cleanMarkdown } from "@/lib/utils";
import type { DocumentOut, SourceRef } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  grounded?: boolean;
}

export default function AskPage() {
  const router = useRouter();
  const { language } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [docs, setDocs] = useState<DocumentOut[]>([]);
  const [docId, setDocId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDocuments().then(setDocs);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const scoped = docId ? Number(docId) : undefined;
      const res = await ask(question, scoped, undefined, language);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          grounded: res.grounded,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            language === "de"
              ? "Diese Information habe ich in Ihren hochgeladenen Dokumenten nicht gefunden."
              : "I couldn't find this information in your uploaded documents.",
          grounded: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function goToSource(source: SourceRef) {
    if (source.page_number) {
      router.push(`/documents/${source.document_id}?page=${source.page_number}`);
    } else {
      router.push(`/documents/${source.document_id}`);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-6">
      <div className="py-6">
        <h1 className="font-editorial text-2xl font-semibold tracking-tight">
          {translate("ask.title", language)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {translate("ask.subtitle", language)}
        </p>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Document</span>
        <Select value={docId} onValueChange={setDocId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All documents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All documents</SelectItem>
            {docs.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <h2 className="font-medium">What would you like to know?</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Try one of these, or ask your own question.
            </p>
            <div className="mt-6 flex max-w-md flex-wrap justify-center gap-2">
              {demoSuggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground"
                    : "max-w-[85%] rounded-2xl rounded-bl-md border bg-card px-4 py-2.5"
                }
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {m.role === "assistant" ? cleanMarkdown(m.content) : m.content}
                </p>

                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Source
                    </p>
                    <div className="space-y-1.5">
                      {m.sources.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => goToSource(s)}
                          className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate font-medium">
                            {s.document_name}
                            {s.page_number ? ` · Page ${s.page_number}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border bg-card px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t py-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about your documents…"
            className="min-h-[48px] flex-1 resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Informational assistance only — not legal advice.
        </p>
      </div>
    </div>
  );
}
