"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeEuro,
  CalendarClock,
  FileText,
  Home,
  Loader2,
  Scale,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExplainDialog } from "@/components/explain-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getContent, getInsights, getOverview } from "@/lib/data";
import { documentsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatMoney, cn } from "@/lib/utils";
import type {
  ContractOverview,
  DocumentContent,
  ExtractedField,
  Insight,
} from "@/lib/types";

export default function DocumentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DocumentView />
    </Suspense>
  );
}

function DocumentView() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useAuth();
  const id = Number(params.id);

  const [overview, setOverview] = useState<ContractOverview>(getOverviewSafe);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<number>(1);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const [ov, ins, c] = await Promise.all([
        getOverview(id),
        getInsights(id),
        getContent(id),
      ]);
      setOverview(ov);
      setInsights(ins);
      setContent(c);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    const page = searchParams.get("page");
    if (page) setActivePage(Number(page));
  }, [searchParams]);

  const grouped = useMemo(() => groupExtracted(overview), [overview]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await documentsApi.remove(id);
      router.push("/documents");
    } catch {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Skeleton className="h-full flex-1" />
        <Skeleton className="h-full w-[420px]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex h-14 items-center gap-3 border-b px-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" />
            Documents
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{overview.document_name}</p>
          <p className="text-xs text-muted-foreground">My Apartment</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="success">Ready</Badge>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setShowDelete(true)}
            aria-label="Delete document"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Document viewer */}
        <div className="flex-1 overflow-y-auto bg-muted/30 p-8 scrollbar-thin">
          <div className="mx-auto max-w-2xl">
            {content?.pages.map((page) => (
              <div
                key={page.page_number}
                id={`page-${page.page_number}`}
                className={cn(
                  "mx-auto mb-6 rounded-xl border bg-white p-10 shadow-sm transition",
                  activePage === page.page_number && "ring-2 ring-primary",
                )}
              >
                <p className="mb-4 text-xs text-muted-foreground">
                  Page {page.page_number}
                </p>
                <div className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-foreground/90">
                  {page.text || <span className="text-muted-foreground/50">(no text)</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights panel */}
        <div className="w-full border-l bg-background md:w-[440px] md:shrink-0 md:overflow-y-auto scrollbar-thin">
          <Tabs defaultValue="overview" className="p-6">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">
                Overview
              </TabsTrigger>
              <TabsTrigger value="clauses" className="flex-1">
                Important clauses
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <OverviewSection
                icon={<BadgeEuro className="h-4 w-4" />}
                title="Financial"
                items={grouped.financial}
                docId={id}
                onPage={setActivePage}
                language={language}
              />
              <OverviewSection
                icon={<CalendarClock className="h-4 w-4" />}
                title="Contract"
                items={grouped.contract}
                docId={id}
                onPage={setActivePage}
                language={language}
              />
              <OverviewSection
                icon={<Home className="h-4 w-4" />}
                title="Living rules"
                items={grouped.living_rules}
                docId={id}
                onPage={setActivePage}
                language={language}
              />
              <OverviewSection
                icon={<Scale className="h-4 w-4" />}
                title="Responsibilities"
                items={grouped.responsibilities}
                docId={id}
                onPage={setActivePage}
                language={language}
              />
            </TabsContent>

            <TabsContent value="clauses" className="space-y-3">
              {insights.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No important clauses detected yet.
                </p>
              ) : (
                insights.map((ins) => (
                  <Card key={ins.id}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium">{ins.title}</p>
                        <SeverityDot severity={ins.severity} />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {ins.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <button
                          onClick={() => ins.source_page && setActivePage(ins.source_page)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {ins.source_page
                            ? `Page ${ins.source_page}`
                            : "View source"}
                        </button>
                        <ExplainDialog
                          query={ins.title}
                          contextTitle={overview.document_name}
                          documentId={id}
                          language={language}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete this document?"
        description="This will permanently remove the document and its extracted information. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function OverviewSection({
  icon,
  title,
  items,
  docId,
  onPage,
  language,
}: {
  icon: React.ReactNode;
  title: string;
  items: ExtractedField[];
  docId: number;
  onPage: (p: number) => void;
  language: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not detected</p>
        ) : (
          items.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{labelFor(f.key)}</p>
                {f.source_page && (
                  <button
                    onClick={() => onPage(f.source_page!)}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Page {f.source_page}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{displayValue(f)}</span>
                <ExplainDialog
                  query={labelFor(f.key)}
                  contextTitle="Document"
                  documentId={docId}
                  language={language}
                  triggerLabel="✨"
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === "high" ? "bg-red-500" : severity === "medium" ? "bg-amber-500" : "bg-emerald-500";
  return <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", color)} />;
}

function groupExtracted(overview: ContractOverview) {
  return {
    financial: overview.financial,
    contract: overview.contract,
    living_rules: overview.living_rules,
    responsibilities: overview.responsibilities,
  };
}

function getOverviewSafe(): ContractOverview {
  return {
    document_id: 0,
    document_name: "Document",
    financial: [],
    contract: [],
    living_rules: [],
    responsibilities: [],
    important_clauses: [],
  };
}

function labelFor(key: string): string {
  const map: Record<string, string> = {
    monthly_rent: "Monthly rent",
    utilities: "Utilities",
    deposit: "Deposit",
    additional_costs: "Additional costs",
    contract_type: "Contract type",
    start_date: "Start date",
    notice_period: "Notice period",
    pets_allowed: "Pets",
    subletting_allowed: "Subletting",
    monthly_rent_total: "Total rent",
  };
  return map[key] ?? key.replace(/_/g, " ");
}

function displayValue(f: ExtractedField): string {
  if (typeof f.value === "number") {
    if (f.key.includes("rent") || f.key.includes("costs") || f.key.includes("deposit") || f.key.includes("utilities")) {
      return formatMoney(f.value);
    }
    return String(f.value);
  }
  if (typeof f.value === "boolean") return f.value ? "Yes" : "No";
  if (f.key === "contract_type") {
    return f.value === "unlimited" ? "Unlimited" : f.value === "limited" ? "Fixed-term" : String(f.value);
  }
  if (f.key === "notice_period") return String(f.value);
  if (f.key === "start_date") return String(f.value);
  return String(f.value ?? "—");
}
