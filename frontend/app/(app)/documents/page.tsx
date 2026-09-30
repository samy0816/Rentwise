"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, FolderOpen, Search, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadZone } from "@/components/upload-zone";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getDocuments, search } from "@/lib/data";
import { documentsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { translate } from "@/lib/i18n";
import { formatDateShort } from "@/lib/utils";
import type { DocumentOut, SearchResult } from "@/lib/types";

export default function DocumentsPage() {
  const { language } = useAuth();
  const [docs, setDocs] = useState<DocumentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setDocs(await getDocuments());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      setResults(await search(query.trim()));
      setSearching(false);
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  async function handleUpload(file: File) {
    setError(null);
    try {
      await documentsApi.upload(file);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while analyzing this document. Please try again.",
      );
      throw err;
    }
  }

  async function confirmDelete() {
    if (deleteId == null) return;
    setDeleting(true);
    setError(null);
    try {
      await documentsApi.remove(deleteId);
      setDocs((prev) => prev.filter((d) => d.id !== deleteId));
    } catch {
      setError("Something went wrong while deleting the document.");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div>
        <h1 className="font-editorial text-2xl font-semibold tracking-tight">
          {translate("documents.title", language)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {translate("documents.subtitle", language)}
        </p>
      </div>

      {/* Smart search */}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your documents — deposit, rent increase, repairs…"
          className="pl-9 pr-9"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query.trim() ? (
        <div className="mt-6">
          <h2 className="mb-4 text-base font-medium">
            Search results
            {searching && <span className="text-muted-foreground">…</span>}
          </h2>
          {searching && results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <Search className="mr-1 inline h-3.5 w-3.5 animate-pulse" />
              Searching your documents…
            </p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No results found in your documents.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => (
                <Link
                  key={`${r.document_id}-${i}`}
                  href={`/documents/${r.document_id}?page=${r.page_number ?? 1}`}
                  className="block"
                >
                  <Card className="transition hover:border-primary/50 hover:shadow-md">
                    <CardContent className="flex items-start gap-3 pt-5">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{r.document_name}</p>
                          {r.page_number && (
                            <Badge variant="outline">Page {r.page_number}</Badge>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {r.snippet}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-6">
            <UploadZone onUpload={handleUpload} onError={setError} />
            {error && (
              <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-base font-medium">
              <FolderOpen className="h-4 w-4" />
              Your documents
              <span className="text-muted-foreground">({docs.length})</span>
            </h2>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : docs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-4 font-medium">No documents yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload a rental contract, house rules, utility statement or
                    landlord letter to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {docs.map((doc) => (
                  <Link key={doc.id} href={`/documents/${doc.id}`}>
                    <Card className="h-full transition hover:border-primary/50 hover:shadow-md">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <StatusBadge status={doc.status} />
                        </div>
                        <p className="mt-4 font-medium line-clamp-1">{doc.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {doc.document_type?.replace(/_/g, " ") ?? "Document"} ·{" "}
                          {doc.page_count ? `${doc.page_count} pages` : formatDateShort(doc.uploaded_at)}
                        </p>
                        <div className="mt-4 flex items-center justify-between border-t pt-3">
                          <span className="text-xs text-muted-foreground">
                            {formatDateShort(doc.uploaded_at)}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button asChild variant="ghost" size="sm">
                              <span>Open</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.preventDefault();
                                setDeleteId(doc.id);
                              }}
                              aria-label="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this document?"
        description="This will permanently remove the document and its extracted information. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge variant="success">Ready</Badge>;
  if (status === "processing") return <Badge variant="warning">Processing</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="neutral">Uploaded</Badge>;
}
