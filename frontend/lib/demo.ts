// Demo / fallback data.
//
// When the RentWise backend is not reachable (e.g. during preview), the
// frontend falls back to this realistic demo dataset so the whole product
// can still be explored. It mirrors what `seed_service.py` produces in the
// backend, but lives client-side as a resilient fallback.

import type {
  CompareResponse,
  ContractOverview,
  DocumentDetail,
  DocumentOut,
  Insight,
  Reminder,
  SearchResult,
} from "@/lib/types";

export const DEMO_EMAIL = "demo@rentwise.app";
export const DEMO_PASSWORD = "demo1234";

export const demoUser = {
  id: 1,
  email: DEMO_EMAIL,
  full_name: "Demo User",
  created_at: "2026-08-01T00:00:00Z",
};

export const demoDocuments: DocumentOut[] = [
  {
    id: 2,
    name: "Rental Contract",
    document_type: "rental_contract",
    status: "ready",
    uploaded_at: "2026-08-20T10:00:00Z",
    page_count: 4,
    summary: {
      monthly_rent: 850,
      utilities: 180,
      deposit: 1700,
      contract_type: "unlimited",
      start_date: "2026-10-01",
      notice_period: "3 months",
    },
  },
  {
    id: 3,
    name: "Nebenkostenabrechnung",
    document_type: "utility",
    status: "ready",
    uploaded_at: "2026-08-21T09:30:00Z",
    page_count: 2,
    summary: { additional_costs: 190, previous_additional_costs: 160 },
  },
  {
    id: 4,
    name: "Landlord Letter",
    document_type: "landlord_letter",
    status: "ready",
    uploaded_at: "2026-08-22T14:15:00Z",
    page_count: 1,
    summary: { utilities: 200, monthly_rent_total: 1050 },
  },
];

export const demoInsights: Insight[] = [
  {
    id: 1,
    title: "Rent adjustment clause",
    description:
      "The contract contains a clause regarding rent adjustments. The clause does not allow a simple increase at any time, but refers to the statutory conditions. Review the original wording before making decisions.",
    category: "money",
    severity: "high",
    source_page: 3,
  },
  {
    id: 2,
    title: "Notice period",
    description:
      "Your contract requires 3 months' notice for termination. Check the exact wording before acting.",
    category: "termination",
    severity: "medium",
    source_page: 2,
  },
  {
    id: 3,
    title: "Repair obligations",
    description:
      "The contract assigns cosmetic repair costs to the tenant. Review the original wording before making decisions.",
    category: "repairs",
    severity: "medium",
    source_page: 4,
  },
];

export const demoOverview: ContractOverview = {
  document_id: 2,
  document_name: "Rental Contract",
  financial: [
    { id: 1, category: "financial", key: "monthly_rent", value: 850, confidence: 0.9, source_page: 1 },
    { id: 2, category: "financial", key: "utilities", value: 180, confidence: 0.9, source_page: 1 },
    { id: 3, category: "financial", key: "deposit", value: 1700, confidence: 0.9, source_page: 1 },
  ],
  contract: [
    { id: 4, category: "contract", key: "contract_type", value: "unlimited", confidence: 0.9, source_page: 1 },
    { id: 5, category: "contract", key: "start_date", value: "2026-10-01", confidence: 0.9, source_page: 1 },
    { id: 6, category: "contract", key: "notice_period", value: "3 months", confidence: 0.85, source_page: 2 },
  ],
  living_rules: [
    { id: 7, category: "living_rules", key: "pets_allowed", value: true, confidence: 0.8, source_page: 4 },
    { id: 8, category: "living_rules", key: "subletting_allowed", value: true, confidence: 0.8, source_page: 3 },
  ],
  responsibilities: [],
  important_clauses: demoInsights,
};

export const demoReminders: Reminder[] = [
  {
    id: 1,
    title: "Pay utility settlement by November 14",
    date: "2026-11-14",
    document_id: 3,
    related_clause: "Nachzahlung",
    created_at: "2026-08-22T10:00:00Z",
  },
];

export const demoCompare: CompareResponse = {
  document_a_name: "Rental Contract",
  document_b_name: "Landlord Letter",
  changes: [
    {
      field: "utilities",
      label: "Utilities",
      before: 180,
      after: 200,
      changed: true,
      note: "Changed",
      source_pages: [1],
    },
    {
      field: "monthly_rent",
      label: "Monthly rent",
      before: 850,
      after: 850,
      changed: false,
      note: "No change",
      source_pages: [],
    },
  ],
  summary: "1 difference detected across the compared fields.",
};

export const demoSuggestedQuestions = [
  "Can my landlord increase my rent?",
  "How much is my deposit?",
  "When can I terminate my contract?",
  "Am I allowed to sublet?",
  "Who is responsible if something breaks?",
];

export const demoChatAnswers: Record<string, string> = {
  rent: "Your contract contains a clause describing when rent adjustments may occur. The clause does not indicate that the rent can simply be increased at any time; it refers to the statutory conditions. \n\nSource: Rental Contract · Page 3 · §8 Mieterhöhung",
  deposit: "Your contract requires a deposit of €1,700. \n\nSource: Rental Contract · Page 1 · §4 Kaution",
  terminate:
    "Your contract requires 3 months' notice for termination. \n\nSource: Rental Contract · Page 2 · §6 Kündigung",
  sublet:
    "Subletting requires the landlord's consent according to your contract. \n\nSource: Rental Contract · Page 3 · §7 Untervermietung",
};

export const demoSearchResults: SearchResult[] = [
  {
    document_id: 2,
    document_name: "Rental Contract",
    document_type: "rental_contract",
    page_number: 1,
    section: null,
    snippet:
      "Die monatliche Kaltmiete beträgt 850,00 €. Die monatlichen Nebenkosten betragen 180,00 €.",
    score: 0.72,
    category: "financial",
  },
  {
    document_id: 3,
    document_name: "Nebenkostenabrechnung",
    document_type: "utility",
    page_number: 1,
    section: null,
    snippet:
      "Die Heizkosten sind gegenüber dem Vorjahr von 160,00 € auf 190,00 € gestiegen.",
    score: 0.61,
    category: "money",
  },
];

// Returns a plausible demo answer for a question, else a default grounded
// answer pointing at the most relevant document.
export function demoAnswer(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("rent") || q.includes("miet")) return demoChatAnswers.rent;
  if (q.includes("deposit") || q.includes("kaution")) return demoChatAnswers.deposit;
  if (q.includes("terminate") || q.includes("cancel") || q.includes("künd")) return demoChatAnswers.terminate;
  if (q.includes("sublet") || q.includes("untervermiet")) return demoChatAnswers.sublet;
  return "Based on your Rental Contract, the relevant clause is described in §8 Mieterhöhung. The exact meaning depends on the full wording of the contract.\n\nSource: Rental Contract · Page 3 · §8";
}

export function demoInsightsByDocument(id: number): Insight[] {
  return id === 2 ? demoInsights : [];
}

const DEMO_CONTRACT_TEXT = [
  "Mietvertrag\n\nZwischen [Vermieter] und [Mieter] wird folgender Mietvertrag geschlossen.\n\n§1 Mietobjekt\nVermietet wird die 3-Zimmer-Wohnung in Hamburg, Deutschland.",
  "§2 Mietzeit\nDas Mietverhältnis beginnt am 01.10.2026. Das Mietverhältnis ist unbefristet.\n\n§3 Miete\nDie monatliche Kaltmiete beträgt 850,00 €. Die monatlichen Nebenkosten betragen 180,00 €.",
  "§4 Kaution\nDer Mieter leistet eine Kaution in Höhe von 1.700,00 €.\n\n§5 Nebenkosten\nDie Nebenkosten umfassen Heizkosten, Betriebskosten und Hausnebenkosten.\n\n§6 Kündigung\nDas Mietverhältnis kann mit einer Frist von drei Monaten gekündigt werden.",
  "§7 Untervermietung\nEine Untervermietung bedarf der Zustimmung des Vermieters.\n\n§8 Mieterhöhung\nDie Miete kann im Rahmen der gesetzlichen Bestimmungen angepasst werden.\n\n§9 Schönheitsreparaturen\nDer Mieter trägt die Kosten für Schönheitsreparaturen in den Mieträumen.\n\n§10 Haustiere\nDie Haltung von Haustieren ist nach Zustimmung des Vermieters erlaubt.",
];

export function demoContentFor(id: number) {
  const pages = id === 2 ? DEMO_CONTRACT_TEXT : ["Document preview"];
  return {
    document_id: id,
    document_name: id === 2 ? "Rental Contract" : "Document",
    pages: pages.map((text, i) => ({ page_number: i + 1, text })),
  };
}
