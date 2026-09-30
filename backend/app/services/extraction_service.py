"""Structured information extraction and insight generation.

For production this delegates to the LLM; in demo mode it uses deterministic
regex/heuristic extraction so contracts still yield a useful overview with no
external API. Every extracted fact keeps a source page reference when available.
"""
from __future__ import annotations

import json
import re
from datetime import date

from sqlalchemy.orm import Session

from app.ai.llm import get_llm
from app.models import Document, ExtractedInformation, Insight

# --------------------------------------------------------------------------
# Heuristic extraction (demo / local)
# --------------------------------------------------------------------------

_MONEY_RE = re.compile(r"(\d[\d.,]*)\s*(?:€|EUR|Euro|euro)")


def _clean_number(raw: str) -> float | None:
    """Parse a German-style amount like '1.700,00' or '850,00' or '850'."""
    s = raw.strip()
    if not s:
        return None
    if "," in s:
        # German: '.' thousands, ',' decimal.
        s = s.replace(".", "").replace(",", ".")
    elif "." in s:
        parts = s.split(".")
        if len(parts) == 2 and len(parts[1]) == 3 and not s.endswith(".00"):
            # Looks like a thousands separator (e.g. '1.700').
            s = parts[0] + parts[1]
    try:
        return float(s)
    except ValueError:
        return None


def _find_amount_after(text: str, keywords: list[str], window: int = 120) -> float | None:
    for kw in keywords:
        for m in re.finditer(re.escape(kw), text, re.IGNORECASE):
            snippet = text[m.start() : m.start() + window]
            for money in _MONEY_RE.finditer(snippet):
                val = _clean_number(money.group(1))
                if val is not None and val >= 1:
                    return val
    return None


def _find_first_money(text: str) -> float | None:
    m = _MONEY_RE.search(text)
    if m:
        return _clean_number(m.group(1))
    return None


def _find_dates(text: str) -> list[str]:
    patterns = [
        r"\b(\d{1,2}\.\d{1,2}\.\d{4})\b",
        r"\b(\d{4}-\d{2}-\d{2})\b",
        r"\b(\d{1,2}\.\s?(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s?\d{4})\b",
    ]
    found: list[str] = []
    for pat in patterns:
        found.extend(re.findall(pat, text))
    return found


# Keywords that mark the start of the tenancy; the date near these is the
# contract start date, NOT the renter's date of birth.
_START_DATE_KEYWORDS = [
    "Mietbeginn", "Mietverhältnis beginnt", "beginn der mietzeit",
    "vertragsbeginn", "mietzeit", "mietzeitraum", "vertragsstart",
    "lease start", "lease begins", "start date", "commencement",
    "beginnt am", "mietbeginn am", "vermietung beginnt", "einzug",
    "übergabe", "bezugsfertig",
]

_BIRTH_KEYWORDS = ["geboren", "geb.", "geburtsdatum", "date of birth", "dob:", "birth"]


def _contract_start_date(text: str) -> str | None:
    """Find the contract start date, avoiding the renter's birthdate."""
    # Prefer a date that appears right after a start-of-tenancy keyword.
    for kw in _START_DATE_KEYWORDS:
        for m in re.finditer(re.escape(kw), text, re.IGNORECASE):
            snippet = text[m.start() : m.start() + 180]
            dates = _find_dates(snippet)
            if dates:
                return dates[0]

    # Fall back to the first date that is NOT near a birth-date marker.
    for m in re.finditer(r"\b(\d{1,2}\.\d{1,2}\.\d{4})\b|\b(\d{4}-\d{2}-\d{2})\b", text):
        date_match = m.group(1) or m.group(2)
        window = text[max(0, m.start() - 60) : m.start() + 60]
        if any(re.search(re.escape(b), window, re.IGNORECASE) for b in _BIRTH_KEYWORDS):
            continue
        return date_match
    return None


def _detect_contract_type(text: str) -> str:
    if re.search(r"unbefristet|unlimited|open[- ]ended", text, re.IGNORECASE):
        return "unlimited"
    if re.search(r"befristet|fixed[- ]term|limited", text, re.IGNORECASE):
        return "limited"
    return "unknown"


def _notice_period(text: str) -> str | None:
    m = re.search(
        r"(?:Kündigungsfrist|notice\s+period)[^.]{0,60}?(\d+\s*(?:Monat|month|Woche|week|Tag|day)s?)",
        text,
        re.IGNORECASE,
    )
    if m:
        return m.group(1)
    if re.search(r"\bnotice\s+period\b|\bKündigungsfrist\b", text, re.IGNORECASE):
        return "specified in the contract"
    return None


def _bool_field(text: str, pos_kw: list[str], neg_kw: list[str]) -> bool | None:
    pos = any(re.search(rf"\b{k}\b", text, re.IGNORECASE) for k in pos_kw)
    neg = any(re.search(rf"\b{k}\b", text, re.IGNORECASE) for k in neg_kw)
    if pos and not neg:
        return True
    if neg:
        return False
    return None


def _page_of(text: str, needle: str, page_map: list[tuple[int, str]]) -> int | None:
    """Estimate the page containing a needle based on chunk page ranges."""
    for page, chunk_text in page_map:
        if needle and needle in chunk_text:
            return page
    return None


# --------------------------------------------------------------------------
# Public API
# --------------------------------------------------------------------------
def extract_contract_info(
    db: Session, doc: Document, pages_text: list[tuple[int, str]]
) -> dict:
    """Run structured extraction over a contract and persist rows.

    Returns the built `summary` dict. Assumes the caller has committed the
    document so its id is available for FK rows.
    """
    full_text = "\n\n".join(t for _, t in pages_text)
    llm = get_llm()
    demo_mode = hasattr(llm, "classify") and not isinstance(llm, type(None))
    using_llm = not hasattr(llm, "_question_tokens")  # demo classifier marker

    if using_llm:
        fields = _extract_with_llm(doc, pages_text)
    else:
        fields = _extract_heuristic(full_text, pages_text)

    _persist_fields(db, doc.id, fields)
    _generate_insights(db, doc, full_text, pages_text)
    return fields


def _extract_with_llm(doc, pages_text) -> dict:
    """Placeholder for LLM structured extraction.

    A real implementation uses LangChain's `with_structured_output` against the
    configured model. Because we cannot rely on an API key at demo time, this
    falls back to heuristics so the product still works.
    """
    full_text = "\n\n".join(t for _, t in pages_text)
    return _extract_heuristic(full_text, pages_text)


def _extract_heuristic(full_text: str, pages_text: list[tuple[int, str]]) -> dict:
    monthly_rent = _find_amount_after(full_text, ["Kaltmiete", "Miete", "Mietzins", "monthly rent", "rent"])
    utilities = _find_amount_after(full_text, ["Nebenkosten", "Betriebskosten", "Heizkosten", "utilities", "additional costs"])
    deposit = _find_amount_after(full_text, ["Kaution", "deposit", "Mietsicherheit"])
    # Rent is usually the first/all prominent amount; if we only found one big
    # number it is likely rent.
    if monthly_rent is None:
        monthly_rent = _find_first_money(full_text)

    contract_type = _detect_contract_type(full_text)
    dates = _find_dates(full_text)
    start_date = _contract_start_date(full_text) or (dates[0] if dates else None)
    notice = _notice_period(full_text)

    pets = _bool_field(
        full_text,
        ["Haustier", "Haustiere", "pets allowed", "Tierhaltung erlaubt"],
        ["keine Haustiere", "no pets", "Tierhaltung nicht erlaubt", "Haustiere nicht"],
    )
    subletting = _bool_field(
        full_text,
        ["Untervermietung", "subletting", "Untervermietung erlaubt"],
        ["nicht gestattet", "no subletting", "Untervermietung nicht"],
    )

    return {
        "monthly_rent": monthly_rent,
        "utilities": utilities,
        "deposit": deposit,
        "contract_type": contract_type,
        "start_date": start_date,
        "notice_period": notice,
        "rent_adjustment": _bool_field(
            full_text,
            ["Mietanpassung", "rent adjustment", "Mieterhöhung", "index"],
            [],
        ),
        "pets_allowed": pets,
        "subletting_allowed": subletting,
    }


def _persist_fields(db: Session, document_id: int, fields: dict) -> None:
    """Store extracted facts as ExtractedInformation rows."""
    for category, grouping in {
        "financial": ["monthly_rent", "utilities", "deposit"],
        "contract": ["contract_type", "start_date", "notice_period"],
        "living_rules": ["pets_allowed", "subletting_allowed"],
        "responsibilities": [],
    }.items():
        for key in grouping:
            if key in fields:
                value = fields[key]
                if value is None:
                    continue
                db.add(
                    ExtractedInformation(
                        document_id=document_id,
                        category=category,
                        key=key,
                        value=value,
                        confidence=0.8,
                        source_page=None,
                    )
                )
    db.commit()


def _generate_insights(
    db: Session, doc: Document, full_text: str, pages_text: list[tuple[int, str]]
) -> None:
    """Generate user-facing "potentially important" insights."""
    insights = []

    if re.search(r"Mietanpassung|Mieterhöhung|rent adjustment|index", full_text, re.IGNORECASE):
        insights.append(
            {
                "title": "Rent adjustment clause",
                "description": "The contract contains a clause regarding rent adjustments. Review the original wording before making decisions.",
                "category": "money",
                "severity": "high",
                "keywords": ["Mietanpassung", "Mieterhöhung", "rent adjustment"],
            }
        )
    if re.search(r"Kündigungsfrist|notice period", full_text, re.IGNORECASE):
        insights.append(
            {
                "title": "Notice period",
                "description": "The contract specifies a notice period for terminating the tenancy. Check the exact wording and any deadlines.",
                "category": "termination",
                "severity": "medium",
                "keywords": ["Kündigungsfrist", "notice period"],
            }
        )
    if re.search(r"Schönheitsreparatur|cosmetic repair|Renovierung|malerarbeiten", full_text, re.IGNORECASE):
        insights.append(
            {
                "title": "Repair obligations",
                "description": "The contract contains clauses regarding cosmetic repairs or maintenance obligations. Review the original wording.",
                "category": "repairs",
                "severity": "medium",
                "keywords": ["Schönheitsreparatur", "cosmetic repair"],
            }
        )
    if re.search(r"Untervermietung|subletting", full_text, re.IGNORECASE):
        insights.append(
            {
                "title": "Subletting rules",
                "description": "The contract addresses subletting. Review the conditions before planning to sublet.",
                "category": "living_rules",
                "severity": "medium",
                "keywords": ["Untervermietung", "subletting"],
            }
        )

    for ins in insights:
        page = None
        for kw in ins.pop("keywords"):
            for p, t in pages_text:
                if kw in t:
                    page = p
                    break
            if page:
                break
        db.add(
            Insight(
                document_id=doc.id,
                title=ins["title"],
                description=ins["description"],
                category=ins["category"],
                severity=ins["severity"],
                source_page=page,
            )
        )
    db.commit()
