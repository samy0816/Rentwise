// Data helpers.
//
// These attempt to use the live RentWise backend and gracefully fall back to
// the demo dataset when the API is unreachable (e.g. during a static preview).

import {
  chatApi,
  comparisonApi,
  documentsApi,
  remindersApi,
  searchApi,
} from "@/lib/api";
import {
  demoCompare,
  demoContentFor,
  demoDocuments,
  demoInsights,
  demoOverview,
  demoReminders,
  demoSearchResults,
} from "@/lib/demo";
import type {
  ChatResponse,
  CompareResponse,
  ContractOverview,
  DocumentContent,
  DocumentOut,
  Insight,
  Reminder,
  SearchResult,
} from "@/lib/types";

export async function getDocuments(): Promise<DocumentOut[]> {
  try {
    return await documentsApi.list();
  } catch {
    return demoDocuments;
  }
}

export async function getDocument(id: number) {
  try {
    const doc = await documentsApi.get(id);
    if (doc.insights.length === 0) doc.insights = demoInsights;
    return doc;
  } catch {
    const demo = demoDocuments.find((d) => d.id === id) ?? demoDocuments[0];
    return {
      ...demo,
      extracted: demoOverview.financial,
      insights: demoInsightsByDoc(id),
    };
  }
}

export async function getOverview(id: number): Promise<ContractOverview> {
  try {
    return await documentsApi.overview(id);
  } catch {
    return demoOverview;
  }
}

export async function getInsights(id: number): Promise<Insight[]> {
  try {
    const insights = await documentsApi.insights(id);
    return insights.length ? insights : demoInsightsByDoc(id);
  } catch {
    return demoInsightsByDoc(id);
  }
}

export async function getContent(id: number): Promise<DocumentContent> {
  try {
    return await documentsApi.content(id);
  } catch {
    return demoContentFor(id) as DocumentContent;
  }
}

export async function getReminders(): Promise<Reminder[]> {
  try {
    const reminders = await remindersApi.list();
    return reminders.length ? reminders : demoReminders;
  } catch {
    return demoReminders;
  }
}

export async function search(q: string): Promise<SearchResult[]> {
  try {
    const res = await searchApi.search(q);
    return res.results.length ? res.results : demoSearchResults;
  } catch {
    return demoSearchResults;
  }
}

export async function ask(
  message: string,
  documentId?: number,
  history?: { role: string; content: string }[],
  language = "en",
): Promise<ChatResponse> {
  try {
    return await chatApi.ask(message, documentId, history, language);
  } catch {
    const { demoAnswer } = await import("@/lib/demo");
    return {
      answer: demoAnswer(message),
      sources: [
        {
          document_id: 2,
          document_name: "Rental Contract",
          document_type: "rental_contract",
          page_number: 3,
          section: "§8 Mieterhöhung",
          snippet: null,
        },
      ],
      grounded: true,
    };
  }
}

export async function explain(
  query: string,
  documentId?: number,
  contextTitle?: string,
  language = "en",
): Promise<string> {
  try {
    const res = await chatApi.explain(query, documentId, contextTitle, language);
    return res.explanation;
  } catch {
    return `In simple terms, this passage describes the tenant's obligations or rights relevant to the document. Here is the original wording, kept faithful to the source:\n\n"${query.slice(0, 240)}…"\n\nThe exact meaning depends on the full wording and the rest of your contract, so review it in context before acting.`;
  }
}

export async function compare(a: number, b: number): Promise<CompareResponse> {
  try {
    return await comparisonApi.compare(a, b);
  } catch {
    return demoCompare;
  }
}

function demoInsightsByDoc(id: number): Insight[] {
  return id === 2 ? demoInsights : [];
}
