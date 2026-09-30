"""LLM providers.

Production uses LangChain `ChatOpenAI`. Local demo mode uses a deterministic
answer builder that grounds every response in the retrieved document chunks.
Both expose the same small interface so the RAG chain doesn't care which one
is active.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from app.config import settings


@dataclass
class RetrievedChunk:
    content: str
    document_id: int
    document_name: str
    document_type: str | None = None
    page_number: int | None = None
    section: str | None = None
    score: float = 0.0


@dataclass
class LLMAnswer:
    answer: str
    grounded: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)


# --------------------------------------------------------------------------
# Demo (local, deterministic, ground-answer builder)
# --------------------------------------------------------------------------
class DemoLLM:
    """A local, rule-based grounding answer builder.

    It is deliberately conservative: it quotes the most relevant retrieved
    passage(s) and guards against inventing information. It is not as rich as a
    real LLM, but it is honest and fully functional with no external services.
    """

    _STOPWORDS = {
        "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "is",
        "are", "was", "were", "be", "been", "can", "could", "may", "my", "me",
        "i", "am", "do", "does", "did", "how", "what", "when", "where", "who",
        "which", "why", "that", "this", "it", "for", "with", "as", "by", "from",
        "if", "not", "no", "yes", "would", "should", "will", "shall",
        "der", "die", "das", "und", "oder", "ein", "eine", "zu", "im", "am",
        "ist", "sind", "ich", "mich", "mein", "meine", "meiner", "kann", "wann",
        "was", "wie", "wer", "wo", "warum", "nicht", "ja", "nein", "für", "mit",
        "von", "auf", "an", "bei", "aus", "den", "dem", "des", "einen",
    }

    _SYNONYMS = {
        "rent": ["miete", "mietzins", "kaltmiete", "mietpreis"],
        "deposit": ["kaution", "mietsicherheit"],
        "sublet": ["untervermietung", "untermiete", "vermietung"],
        "subletting": ["untervermietung", "untermiete"],
        "notice": ["kündigung", "kündigungsfrist", "frist"],
        "terminate": ["kündigung", "kündigen", "kündigungsfrist"],
        "repair": ["reparatur", "schönheitsreparatur", "instandhaltung"],
        "repairs": ["reparatur", "schönheitsreparatur", "instandhaltung"],
        "pet": ["haustier", "haustiere", "tierhaltung"],
        "pets": ["haustier", "haustiere", "tierhaltung"],
        "increase": ["erhöhung", "erhöhen", "anpassung", "mieterhöhung"],
        "landlord": ["vermieter", "vermieters"],
        "tenant": ["mieter", "mieters"],
        "rental": ["mietvertrag", "miete"],
        "clause": ["§", "absatz", "paragraph"],
        "cost": ["kosten", "nebenkosten", "betriebskosten"],
        "costs": ["kosten", "nebenkosten", "betriebskosten"],
        "deadline": ["frist", "termin", "stichtag"],
        "break": ["defekt", "schaden", "beschädigung", "reparatur"],
        "broke": ["defekt", "schaden", "beschädigung"],
    }

    def _expand_synonyms(self, tokens: set[str]) -> set[str]:
        expanded = set(tokens)
        for t in tokens:
            for syn in self._SYNONYMS.get(t, []):
                expanded.add(syn)
        return expanded

    def _question_tokens(self, question: str) -> set[str]:
        tokens = re.findall(r"\w+", question.lower())
        return {
            t for t in tokens if len(t) > 2 and t not in self._STOPWORDS
        }

    def _sentence_score(self, sentence: str, q_tokens: set[str]) -> int:
        words = set(re.findall(r"\w+", sentence.lower()))
        return len(words & q_tokens)

    def _sentences(self, text: str) -> list[str]:
        text = re.sub(r"\s+", " ", text)
        parts = re.split(r"(?<=[.!?])\s+", text)
        return [p.strip() for p in parts if len(p.strip()) > 5]

    def answer(
        self,
        question: str,
        chunks: list[RetrievedChunk],
        history: list[Any] | None = None,
        language: str = "en",
    ) -> LLMAnswer:
        q_tokens = self._expand_synonyms(self._question_tokens(question))
        if not chunks:
            return LLMAnswer(
                answer=(
                    "I couldn't find this information in your uploaded documents."
                ),
                grounded=False,
            )

        # Pick the best (chunk, sentence) pair that matches the question,
        # considering both the retrieval score and lexical/synonym overlap.
        best_chunk: RetrievedChunk | None = None
        best_evidence: str | None = None
        best_score = 0.0
        for c in chunks:
            for s in self._sentences(c.content):
                score = self._sentence_score(s, q_tokens) + c.score
                if score > best_score:
                    best_score = score
                    best_chunk = c
                    best_evidence = s

        # Fall back to the top chunk's opening sentence otherwise.
        if best_evidence is None:
            best_chunk = max(chunks, key=lambda c: c.score)
            sentences = self._sentences(best_chunk.content)
            best_evidence = sentences[0] if sentences else best_chunk.content

        source = self._format_source(best_chunk)
        evidence = best_evidence
        if len(evidence) > 320:
            evidence = evidence[:320].rsplit(" ", 1)[0] + "…"

        answer = (
            f"Based on your {best_chunk.document_name}, here is what it says:\n\n"
            f"“{evidence}”\n\n"
            f"Source: {source}"
        )
        return LLMAnswer(answer=answer, grounded=True)

    def explain(
        self,
        text: str,
        context_title: str | None = None,
        language: str = "en",
    ) -> str:
        """Produce a simple-terms explanation of a passage (demo, English-only)."""
        snippets = self._sentences(text)[:2]
        joined = " ".join(snippets) if snippets else text.strip()
        if len(joined) > 280:
            joined = joined[:280].rsplit(" ", 1)[0] + "…"
        lead = "In simple terms"
        return (
            f"{lead}, this passage describes the tenant's obligations or rights "
            f"relevant to the document. Here is the original wording, kept faithful "
            f"to the source:\n\n“{joined}”\n\n"
            f"The exact meaning depends on the full wording and the rest of your "
            f"contract, so review it in context before acting."
        )

    def explain_query(
        self,
        query: str,
        context: str,
        language: str = "en",
    ) -> str:
        """Demo fallback: quote the most relevant snippet for the query."""
        chunks = [c for c in context.split("\n\n") if c.strip()]
        if not chunks:
            return "I couldn't find this information in your uploaded documents."
        snippet = chunks[0][:280]
        return (
            f"In simple terms, the clause related to “{query}” is described here. "
            f"Here is the relevant wording from your document:\n\n“{snippet}”"
        )

    def classify(self, text: str) -> str:
        """Best-effort document type classification using keywords."""
        t = text.lower()
        rules = [
            ("rental_contract", ["mietvertrag", "rental agreement", "vermietung", "mieter", "vermieter", "kaltmiete"]),
            ("lease_amendment", ["nachträgliche", "amendment", "änderung", "ergänzungsvereinbarung"]),
            ("house_rules", ["hausordnung", "house rules", "hausordnung", "ordnung"]),
            ("utility", ["nebenkostenabrechnung", "utilities", "betriebskosten", "heizkosten"]),
            ("handover_protocol", ["übergabeprotokoll", "handover", "übergabe", "wohnungsübergabe"]),
            ("landlord_letter", ["anrede", "sehr geehrte", "vermieter schreibt", "landlord"]),
            ("invoice", ["rechnung", "invoice", "gutschrift"]),
        ]
        counts = {name: 0 for name, _ in rules}
        for name, keywords in rules:
            for kw in keywords:
                if kw in t:
                    counts[name] += 1
        best = max(counts, key=counts.get)
        return "other" if counts[best] == 0 else best

    @staticmethod
    def _format_source(c: RetrievedChunk) -> str:
        pieces = [c.document_name]
        if c.page_number:
            pieces.append(f"Page {c.page_number}")
        if c.section:
            pieces.append(c.section)
        return " · ".join(pieces)


# --------------------------------------------------------------------------
# Production provider
# --------------------------------------------------------------------------
class LangChainLLM:
    """Thin wrapper around a LangChain chat model for the RAG + Explain flows.

    The underlying model is chosen from the configured AI provider: Google
    Gemini (`ChatGoogleGenerativeAI`) or OpenAI (`ChatOpenAI`).
    """

    def __init__(self) -> None:
        provider = settings.ai_provider
        if provider == "google":
            from langchain_google_genai import ChatGoogleGenerativeAI

            self.model = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.1,
            )
        else:
            from langchain_openai import ChatOpenAI

            self.model = ChatOpenAI(
                model=settings.OPENAI_MODEL,
                temperature=0.1,
                api_key=settings.OPENAI_API_KEY,
            )

    def answer(
        self,
        question: str,
        chunks: list[RetrievedChunk],
        history: list[Any] | None = None,
        language: str = "en",
    ) -> LLMAnswer:
        from app.ai.prompts.rag import RAG_PROMPT

        context = "\n\n".join(
            f"[{c.document_name}"
            + (f", page {c.page_number}" if c.page_number else "")
            + (f", {c.section}" if c.section else "")
            + "]\n" + c.content
            for c in chunks
        )
        chain = RAG_PROMPT | self.model
        result = chain.invoke(
            {"context": context, "question": question, "language": language}
        )
        return LLMAnswer(answer=result.content, grounded=True)

    def explain(
        self,
        text: str,
        context_title: str | None = None,
        language: str = "en",
    ) -> str:
        from app.ai.prompts.rag import EXPLAIN_PROMPT

        chain = EXPLAIN_PROMPT | self.model
        result = chain.invoke(
            {
                "text": text,
                "context_title": context_title or "Document",
                "language": language,
            }
        )
        return result.content

    def explain_query(
        self,
        query: str,
        context: str,
        language: str = "en",
    ) -> str:
        from app.ai.prompts.rag import EXPLAIN_QUERY_PROMPT

        chain = EXPLAIN_QUERY_PROMPT | self.model
        result = chain.invoke({"query": query, "context": context, "language": language})
        return result.content

    def classify(self, text: str) -> str:
        from app.ai.prompts.rag import CLASSIFY_PROMPT

        chain = CLASSIFY_PROMPT | self.model
        result = chain.invoke({"text": text[:4000]})
        return result.content.strip().lower()


@lru_cache
def get_llm() -> DemoLLM | LangChainLLM:
    if not settings.is_demo:
        return LangChainLLM()
    return DemoLLM()
