// Shared TypeScript types mirroring the backend Pydantic schemas.

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}

export interface DocumentOut {
  id: number;
  name: string;
  document_type: string | null;
  status: DocumentStatus;
  uploaded_at: string;
  page_count: number | null;
  summary: Record<string, unknown> | null;
}

export interface ExtractedField {
  id: number;
  category: string;
  key: string;
  value: unknown;
  confidence: number;
  source_page: number | null;
}

export interface Insight {
  id: number;
  title: string;
  description: string;
  category: string;
  severity: string;
  source_page: number | null;
}

export interface DocumentDetail extends DocumentOut {
  extracted: ExtractedField[];
  insights: Insight[];
}

export interface PageContent {
  page_number: number;
  text: string;
}

export interface DocumentContent {
  document_id: number;
  document_name: string;
  pages: PageContent[];
}

export interface ContractOverview {
  document_id: number;
  document_name: string;
  financial: ExtractedField[];
  contract: ExtractedField[];
  living_rules: ExtractedField[];
  responsibilities: ExtractedField[];
  important_clauses: Insight[];
}

export interface SourceRef {
  document_id: number;
  document_name: string;
  document_type: string | null;
  page_number: number | null;
  section: string | null;
  snippet: string | null;
}

export interface ChatResponse {
  answer: string;
  sources: SourceRef[];
  grounded: boolean;
}

export interface SearchResult {
  document_id: number;
  document_name: string;
  document_type: string | null;
  page_number: number | null;
  section: string | null;
  snippet: string;
  score: number;
  category: string | null;
}

export interface CompareDiff {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
  changed: boolean;
  note: string | null;
  source_pages: number[];
}

export interface CompareResponse {
  document_a_name: string;
  document_b_name: string;
  changes: CompareDiff[];
  summary: string | null;
}

export interface Reminder {
  id: number;
  title: string;
  date: string;
  document_id: number | null;
  related_clause: string | null;
  created_at: string;
}
