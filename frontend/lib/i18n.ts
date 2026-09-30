// Minimal i18n for RentWise (English / German).
//
// The interface supports language switching. The source document language is
// always preserved; explanations can be requested in either language.

export type Language = "en" | "de";

const translations = {
  en: {
    "landing.hero.title": "Understand your rental contract. Without the legal headache.",
    "landing.hero.subtitle":
      "RentWise turns complicated rental documents into clear information, important dates, potential obligations, and answers grounded in your own documents.",
    "landing.cta.primary": "Upload your contract",
    "landing.cta.secondary": "See how it works",
    "landing.disclaimer":
      "RentWise provides informational assistance and is not a substitute for professional legal advice.",
    "common.upload": "Upload",
    "common.analyze": "Analyze",
    "common.search": "Search",
    "common.signOut": "Sign out",
    "common.viewAll": "View all",
    "nav.dashboard": "Dashboard",
    "nav.documents": "Documents",
    "nav.ask": "Ask RentWise",
    "nav.compare": "Compare",
    "nav.settings": "Settings",
    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Your rental at a glance.",
    "documents.title": "Documents",
    "documents.subtitle": "Upload and manage your rental documents.",
    "ask.title": "Ask RentWise",
    "ask.subtitle": "Ask questions about your documents. Answers are grounded in your own files.",
    "compare.title": "Compare documents",
    "compare.subtitle": "Compare an old contract with a new one or amendment to see what changed.",
    "settings.title": "Settings",
    "settings.subtitle": "Manage your account and preferences.",
  },
  de: {
    "landing.hero.title": "Verstehen Sie Ihren Mietvertrag. Ohne den rechtlichen Kopfschmerz.",
    "landing.hero.subtitle":
      "RentWise macht aus komplizierten Mietunterlagen klare Informationen, wichtige Termine, mögliche Pflichten und Antworten, die auf Ihren eigenen Dokumenten basieren.",
    "landing.cta.primary": "Vertrag hochladen",
    "landing.cta.secondary": "So funktioniert es",
    "landing.disclaimer":
      "RentWise bietet informative Unterstützung und ersetzt keine professionelle Rechtsberatung.",
    "common.upload": "Hochladen",
    "common.analyze": "Analysieren",
    "common.search": "Suchen",
    "common.signOut": "Abmelden",
    "common.viewAll": "Alle anzeigen",
    "nav.dashboard": "Übersicht",
    "nav.documents": "Dokumente",
    "nav.ask": "Fragen Sie RentWise",
    "nav.compare": "Vergleichen",
    "nav.settings": "Einstellungen",
    "dashboard.title": "Übersicht",
    "dashboard.subtitle": "Ihre Miete auf einen Blick.",
    "documents.title": "Dokumente",
    "documents.subtitle": "Laden Sie Ihre Mietunterlagen hoch und verwalten Sie sie.",
    "ask.title": "Fragen Sie RentWise",
    "ask.subtitle": "Stellen Sie Fragen zu Ihren Dokumenten. Antworten basieren auf Ihren eigenen Dateien.",
    "compare.title": "Dokumente vergleichen",
    "compare.subtitle": "Vergleichen Sie einen alten Vertrag mit einem neuen oder einer Änderung.",
    "settings.title": "Einstellungen",
    "settings.subtitle": "Verwalten Sie Ihr Konto und Ihre Präferenzen.",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function translate(key: TranslationKey, lang: Language): string {
  const table = translations[lang] ?? translations.en;
  return table[key] ?? key;
}

export function formatNumber(value: number, lang: Language): string {
  return new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB").format(value);
}
