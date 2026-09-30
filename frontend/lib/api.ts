"use client";

import type {
  AuthResponse,
  ChatResponse,
  CompareResponse,
  ContractOverview,
  DocumentContent,
  DocumentDetail,
  DocumentOut,
  Insight,
  Reminder,
  SearchResult,
  User,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("rentwise_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("rentwise_token", token);
  else window.localStorage.removeItem("rentwise_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Network error. Please try again.", 0);
  }

  if (!res.ok) {
    let detail = "Something went wrong.";
    try {
      const data = await res.json();
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Auth ---
export const authApi = {
  register: (payload: { email: string; password: string; full_name?: string }) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request<User>("/auth/me"),
};

// --- Documents ---
export const documentsApi = {
  list: () => request<DocumentOut[]>("/documents"),
  get: (id: number) => request<DocumentDetail>(`/documents/${id}`),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<DocumentOut>("/documents/upload", {
      method: "POST",
      body: form,
    });
  },
  remove: (id: number) => request<void>(`/documents/${id}`, { method: "DELETE" }),
  overview: (id: number) =>
    request<ContractOverview>(`/documents/${id}/overview`),
  insights: (id: number) => request<Insight[]>(`/documents/${id}/insights`),
  content: (id: number) => request<DocumentContent>(`/documents/${id}/content`),
};

// --- Chat ---
export const chatApi = {
  ask: (
    message: string,
    documentId?: number,
    history?: { role: string; content: string }[],
    language = "en",
  ) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        document_id: documentId ?? null,
        history: history ?? [],
        language,
      }),
    }),
  askDocument: (documentId: number, message: string, language = "en") =>
    request<ChatResponse>(`/documents/${documentId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message, document_id: documentId, history: [], language }),
    }),
  explain: (
    query: string,
    documentId?: number,
    contextTitle?: string,
    language = "en",
  ) =>
    request<{ explanation: string; source: unknown }>("/ai/explain", {
      method: "POST",
      body: JSON.stringify({
        query,
        document_id: documentId ?? null,
        context_title: contextTitle ?? null,
        language,
      }),
    }),
};

// --- Search ---
export const searchApi = {
  search: (q: string) =>
    request<{ query: string; results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`),
};

// --- Comparison ---
export const comparisonApi = {
  compare: (documentAId: number, documentBId: number) =>
    request<CompareResponse>("/documents/compare", {
      method: "POST",
      body: JSON.stringify({ document_a_id: documentAId, document_b_id: documentBId }),
    }),
};

// --- Reminders ---
export const remindersApi = {
  list: () => request<Reminder[]>("/reminders"),
  create: (payload: { title: string; date: string; document_id?: number; related_clause?: string }) =>
    request<Reminder>("/reminders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  remove: (id: number) => request<void>(`/reminders/${id}`, { method: "DELETE" }),
};

export { API_URL };
