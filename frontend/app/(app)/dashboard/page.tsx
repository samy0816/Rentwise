"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeEuro,
  CalendarClock,
  FileText,
  Home,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDocuments, getInsights, getReminders } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { translate } from "@/lib/i18n";
import { formatDateShort, formatMoney } from "@/lib/utils";
import type { DocumentOut, Insight, Reminder } from "@/lib/types";

function severityColor(severity: string) {
  if (severity === "high") return "bg-red-500";
  if (severity === "medium") return "bg-amber-500";
  return "bg-emerald-500";
}

export default function DashboardPage() {
  const router = useRouter();
  const { language } = useAuth();
  const [docs, setDocs] = useState<DocumentOut[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const docs = await getDocuments();
      setDocs(docs);
      const contract = docs.find((d) => d.document_type === "rental_contract") ?? docs[0];
      if (contract) setSelectedId(contract.id);
      setReminders(await getReminders());
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    getInsights(selectedId).then(setInsights);
  }, [selectedId]);

  const selectedDoc =
    docs.find((d) => d.id === selectedId) ??
    docs.find((d) => d.document_type === "rental_contract") ??
    docs[0];
  const summary = (selectedDoc?.summary ?? {}) as Record<string, unknown>;
  const monthlyRent = summary.monthly_rent as number;
  const utilities = summary.utilities as number;
  const deposit = summary.deposit as number;
  const startDate = summary.start_date as string;
  const noticePeriod = summary.notice_period as string;

  const importantItems = insights.slice(0, 3);

  const dates = buildDates(startDate, reminders);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-[#0369A1]/8" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-editorial text-2xl font-semibold tracking-tight">
              {translate("dashboard.title", language)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {translate("dashboard.subtitle", language)}
            </p>
          </div>
          <Button onClick={() => router.push("/documents")}>
            <FileText className="h-4 w-4" />
            Upload document
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Property overview */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-4 w-4 text-primary" />
              Property overview
            </CardTitle>
            <Select
              value={selectedId != null ? String(selectedId) : ""}
              onValueChange={(v) => setSelectedId(Number(v))}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
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
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-semibold">
              {selectedDoc?.name ?? "My Apartment"}
            </p>
            <p className="text-sm text-muted-foreground">Rental property</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Monthly rent" value={formatMoney(monthlyRent)} />
              <Field label="Deposit" value={formatMoney(deposit)} />
              <Field label="Contract" value={contractTypeLabel(summary.contract_type)} />
              <Field label="Start date" value={formatDateShort(startDate)} />
            </div>
          </CardContent>
        </Card>

        {/* Important dates */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" />
              Important dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dates.map((d) => (
                <div
                  key={d.label}
                  className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border bg-card">
                    <span className="text-lg font-semibold leading-none">
                      {d.day}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {d.month}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{d.label}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {d.detail}
                    </p>
                  </div>
                  {d.action && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(d.action!)}
                    >
                      View
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Money overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeEuro className="h-4 w-4 text-primary" />
              Money overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MoneyRow label="Monthly rent" value={formatMoney(monthlyRent)} />
            <MoneyRow label="Utilities" value={formatMoney(utilities)} />
            <MoneyRow label="Deposit" value={formatMoney(deposit)} />
            <div className="mt-2 border-t pt-2">
              <MoneyRow
                label="Total monthly"
                value={formatMoney((monthlyRent || 0) + (utilities || 0))}
                strong
              />
            </div>
          </CardContent>
        </Card>

        {/* Important items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Things worth knowing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {importantItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No important items detected yet. Upload a contract to see insights.
              </p>
            )}
            {importantItems.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  selectedDoc &&
                  router.push(
                    `/documents/${selectedDoc.id}?page=${item.source_page ?? 1}`,
                  )
                }
                className="flex w-full items-start gap-3 rounded-xl border bg-muted/30 p-4 text-left transition hover:bg-muted"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityColor(item.severity)}`}
                />
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent documents */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent documents</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/documents">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents yet. Upload your first rental document to get started.
            </p>
          ) : (
            <div className="divide-y">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.document_type?.replace(/_/g, " ") ?? "Document"} ·{" "}
                      {formatDateShort(doc.uploaded_at)}
                    </p>
                  </div>
                  <StatusBadge status={doc.status} />
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                  >
                    <Link href={`/documents/${doc.id}`}>Open</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-3 transition-colors hover:border-primary/40">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function contractTypeLabel(value: unknown): string {
  const v = String(value ?? "—");
  if (v === "unlimited") return "Unlimited";
  if (v === "limited") return "Fixed-term";
  if (v === "unknown") return "Unknown";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function MoneyRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge variant="success">Ready</Badge>;
  if (status === "processing") return <Badge variant="warning">Processing</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="neutral">Uploaded</Badge>;
}

function buildDates(startDate: string | undefined, reminders: Reminder[]) {
  const items: {
    label: string;
    detail: string;
    day: string;
    month: string;
    action?: string;
  }[] = [];

  if (startDate) {
    const d = new Date(startDate);
    if (!Number.isNaN(d.getTime())) {
      items.push({
        label: "Contract begins",
        detail: "Your tenancy starts on this date.",
        day: String(d.getDate()).padStart(2, "0"),
        month: d.toLocaleString("en", { month: "short" }),
      });
    }
  }

  for (const r of reminders) {
    const d = new Date(r.date);
    if (Number.isNaN(d.getTime())) continue;
    items.push({
      label: r.title,
      detail: r.related_clause
        ? `Related to: ${r.related_clause}`
        : "Reminder from your documents.",
      day: String(d.getDate()).padStart(2, "0"),
      month: d.toLocaleString("en", { month: "short" }),
    });
  }

  if (items.length === 0) {
    items.push({
      label: "Notice period",
      detail: "Check your contract for the exact notice period.",
      day: "—",
      month: "—",
    });
  }

  return items.slice(0, 4);
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Skeleton className="h-8 w-48" />
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64 lg:col-span-2" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48 lg:col-span-2" />
      </div>
    </div>
  );
}
