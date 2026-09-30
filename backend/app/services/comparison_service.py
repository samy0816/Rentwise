"""Document comparison service.

Compares two documents (typically an old vs. new contract / amendment). Where
possible it makes deterministic comparisons on the structured fields it has
extracted, and falls back to LLM-assisted notes for clauses. Every change links
to the source pages when known.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Document, ExtractedInformation
from app.schemas.reminder import CompareDiff, CompareResponse


def _field_map(doc: Document) -> dict[str, object]:
    """Map extracted keys -> values for one document."""
    out: dict[str, object] = {}
    if doc.summary:
        out.update(doc.summary)
    for row in db_row(doc):
        out[row.key] = row.value
    return out


def db_row(doc: Document) -> list:
    return doc.extracted if hasattr(doc, "extracted") else []


# Labels shown to the user for each comparable field.
FIELD_LABELS = {
    "monthly_rent": "Monthly rent",
    "utilities": "Utilities",
    "deposit": "Deposit",
    "contract_type": "Contract type",
    "start_date": "Start date",
    "notice_period": "Notice period",
    "rent_adjustment": "Rent adjustment",
    "pets_allowed": "Pets",
    "subletting_allowed": "Subletting",
}

COMPARE_FIELDS = list(FIELD_LABELS.keys())


def compare_documents(
    db: Session,
    user_id: int,
    doc_a_id: int,
    doc_b_id: int,
) -> CompareResponse:
    doc_a = db.get(Document, doc_a_id)
    doc_b = db.get(Document, doc_b_id)
    if doc_a is None or doc_b is None or doc_a.user_id != user_id or doc_b.user_id != user_id:
        raise ValueError("Document not found")

    map_a = _field_map(doc_a)
    map_b = _field_map(doc_b)

    changes: list[CompareDiff] = []
    for field in COMPARE_FIELDS:
        before = map_a.get(field)
        after = map_b.get(field)
        changed = _is_changed(before, after)
        # Only report fields that are present in at least one doc.
        if before is None and after is None:
            continue
        note = _make_note(field, before, after, changed)
        changes.append(
            CompareDiff(
                field=field,
                label=FIELD_LABELS[field],
                before=before,
                after=after,
                changed=changed,
                note=note,
                source_pages=_source_pages(doc_a, doc_b, field),
            )
        )

    summary = _summarise(changes)
    return CompareResponse(
        document_a_name=doc_a.name,
        document_b_name=doc_b.name,
        changes=changes,
        summary=summary,
    )


def _is_changed(before: object, after: object) -> bool:
    if before is None and after is None:
        return False
    if before is None or after is None:
        return True
    return before != after


def _make_note(field: str, before: object, after: object, changed: bool) -> str | None:
    if not changed:
        return "No change"
    if before is None:
        return "New information added"
    if after is None:
        return "Information removed"
    return "Changed"


def _source_pages(doc_a: Document, doc_b: Document, field: str) -> list[int]:
    pages: list[int] = []
    for doc in (doc_a, doc_b):
        for row in db_row(doc):
            if row.key == field and row.source_page:
                pages.append(row.source_page)
    return list(dict.fromkeys(pages))


def _summarise(changes: list[CompareDiff]) -> str:
    changed = [c for c in changes if c.changed]
    if not changed:
        return "The two documents appear consistent on the compared fields."
    if len(changed) == 1:
        return f"One difference detected across the compared fields."
    return f"{len(changed)} differences detected across the compared fields."
