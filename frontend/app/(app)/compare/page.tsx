"use client";

import { useEffect, useState } from "react";
import { Loader2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { compare, getDocuments } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { translate } from "@/lib/i18n";
import type { CompareResponse, DocumentOut } from "@/lib/types";

export default function ComparePage() {
  const { language } = useAuth();
  const [docs, setDocs] = useState<DocumentOut[]>([]);
  const [docA, setDocA] = useState<string>("");
  const [docB, setDocB] = useState<string>("");
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocuments().then((d) => {
      setDocs(d);
      if (d.length >= 2) {
        setDocA(String(d[0].id));
        setDocB(String(d[1].id));
      }
    });
  }, []);

  async function runCompare() {
    if (!docA || !docB || docA === docB) {
      setError("Select two different documents to compare.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await compare(Number(docA), Number(docB));
      setResult(res);
    } catch {
      setError("Something went wrong while comparing. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div>
        <h1 className="font-editorial text-2xl font-semibold tracking-tight">
          {translate("compare.title", language)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {translate("compare.subtitle", language)}
        </p>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document A</label>
              <Select value={docA} onValueChange={setDocA}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  {docs.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden items-center pt-8 md:flex">
              <Scale className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Document B</label>
              <Select value={docB} onValueChange={setDocB}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  {docs.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <Button className="mt-6" onClick={runCompare} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Compare"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-medium">What changed?</h2>
            <span className="text-sm text-muted-foreground">
              {result.document_a_name} → {result.document_b_name}
            </span>
          </div>
          <div className="space-y-3">
            {result.changes.map((c) => (
              <div
                key={c.field}
                className="rounded-xl border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.label}</p>
                  <span
                    className={
                      c.changed
                        ? "rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700"
                        : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {c.changed ? "Changed" : "No change"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground line-through">
                    {formatValue(c.before)}
                  </span>
                  {c.changed && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold">{formatValue(c.after)}</span>
                    </>
                  )}
                </div>
                {c.source_pages.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Source pages: {c.source_pages.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
          {result.summary && (
            <p className="mt-6 text-sm text-muted-foreground">{result.summary}</p>
          )}
        </div>
      )}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return `€${v.toLocaleString("en-DE")}`;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}
