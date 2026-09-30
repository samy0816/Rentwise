"""Demo data seeding.

Creates a demo account with a sample property ("My Apartment") and several
realistic German rental documents, complete with extracted structure, insights
and embedded chunks so the whole product is explorable without uploading a PDF.
"""
from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.ai.embeddings import embed_texts
from app.core.security import hash_password
from app.models import (
    Document,
    DocumentChunk,
    DocumentStatus,
    DocumentType,
    ExtractedInformation,
    Insight,
    Reminder,
    User,
)

DEMO_EMAIL = "demo@rentwise.app"
DEMO_PASSWORD = "demo1234"


# A realistic German rental contract (condensed but meaningful).
RENTAL_CONTRACT = """Mietvertrag

Zwischen
[Vermieter] und [Mieter] wird folgender Mietvertrag geschlossen.

§1 Mietobjekt
Vermietet wird die 3-Zimmer-Wohnung in Hamburg, Deutschland.

§2 Mietzeit
Das Mietverhältnis beginnt am 01.10.2026. Das Mietverhältnis ist unbefristet.

§3 Miete
Die monatliche Kaltmiete beträgt 850,00 €. Die monatlichen Nebenkosten
betragen 180,00 €. Die Gesamtmiete beträgt 1.030,00 € monatlich.

§4 Kaution
Der Mieter leistet eine Kaution in Höhe von 1.700,00 €.

§5 Nebenkosten
Die Nebenkosten umfassen Heizkosten, Betriebskosten und Hausnebenkosten.

§6 Kündigung
Das Mietverhältnis kann mit einer Frist von drei Monaten gekündigt werden.
Die Kündigung bedarf der Schriftform.

§7 Untervermietung
Eine Untervermietung bedarf der Zustimmung des Vermieters.

§8 Mieterhöhung
Die Miete kann im Rahmen der gesetzlichen Bestimmungen angepasst werden.
Eine Mieterhöhung nach §558 BGB ist möglich.

§9 Schönheitsreparaturen
Der Mieter trägt die Kosten für Schönheitsreparaturen in den Mieträumen.

§10 Haustiere
Die Haltung von Haustieren ist nach Zustimmung des Vermieters erlaubt.

§11 Übergabe
Die Wohnung wird im ordnungsgemäßen Zustand übergeben.

Unterschriften
"""

UTILITY_STATEMENT = """Nebenkostenabrechnung für den Zeitraum 01.01.2025 bis 31.12.2025.
Verbrauch Heizkosten: 190,00 €. Die Heizkosten sind gegenüber dem Vorjahr
von 160,00 € auf 190,00 € gestiegen. Die erhöhten Kosten ergeben sich aus
gestiegenen Energiepreisen.

Die Nachzahlung beträgt 45,00 € und ist bis zum 14.11.2026 zu zahlen.
"""

LANDLORD_LETTER = """Sehr geehrte Mieterin, sehr geehrter Mieter,

hiermit teilen wir Ihnen mit, dass die Betriebskosten ab dem 01.01.2027
steigen. Die monatliche Vorauszahlung wird von 180,00 € auf 200,00 € erhöht.

Die neue Miete beträgt ab dem 01.01.2027 insgesamt 1.050,00 € monatlich.

Mit freundlichen Grüßen
Ihr Vermieter
"""


def seed_demo_data(db: Session) -> None:
    """Create the demo user + documents if they don't already exist."""
    if db.query(User).filter(User.email == DEMO_EMAIL).first():
        return

    user = User(
        email=DEMO_EMAIL,
        password_hash=hash_password(DEMO_PASSWORD),
        full_name="Demo User",
    )
    db.add(user)
    db.flush()

    # --- 1. Rental contract ---
    contract = _create_document(
        db,
        user,
        name="Rental Contract",
        doc_type=DocumentType.RENTAL_CONTRACT,
        text=RENTAL_CONTRACT,
        page_count=4,
        summary={
            "monthly_rent": 850,
            "utilities": 180,
            "deposit": 1700,
            "contract_type": "unlimited",
            "start_date": "2026-10-01",
            "notice_period": "3 months",
            "rent_adjustment": True,
            "pets_allowed": True,
            "subletting_allowed": True,
        },
        extracted=[
            ("financial", "monthly_rent", 850, 1),
            ("financial", "utilities", 180, 1),
            ("financial", "deposit", 1700, 1),
            ("contract", "contract_type", "unlimited", 1),
            ("contract", "start_date", "2026-10-01", 1),
            ("contract", "notice_period", "3 months", 2),
            ("living_rules", "pets_allowed", True, 4),
            ("living_rules", "subletting_allowed", True, 3),
        ],
        insights=[
            (
                "Rent adjustment clause",
                "The contract contains a clause regarding rent adjustments. The clause does not allow a simple increase at any time, but refers to the statutory conditions. Review the original wording before making decisions.",
                "money",
                "high",
                3,
            ),
            (
                "Notice period",
                "Your contract requires 3 months' notice for termination. Check the exact wording before acting.",
                "termination",
                "medium",
                2,
            ),
            (
                "Repair obligations",
                "The contract assigns cosmetic repair costs to the tenant. Review the original wording before making decisions.",
                "repairs",
                "medium",
                4,
            ),
            (
                "Subletting rules",
                "Subletting requires the landlord's consent. Review the conditions before planning to sublet.",
                "living_rules",
                "medium",
                3,
            ),
        ],
    )

    # --- 2. Utility statement ---
    utility = _create_document(
        db,
        user,
        name="Nebenkostenabrechnung",
        doc_type=DocumentType.UTILITY,
        text=UTILITY_STATEMENT,
        page_count=2,
        summary={
            "additional_costs": 190,
            "previous_additional_costs": 160,
        },
        extracted=[
            ("financial", "additional_costs", 190, 1),
            ("financial", "previous_additional_costs", 160, 1),
        ],
        insights=[
            (
                "Utility costs increased",
                "Your additional costs increased from €160 to €190 according to your latest utility statement.",
                "money",
                "medium",
                1,
            ),
        ],
    )

    # --- 3. Landlord letter ---
    letter = _create_document(
        db,
        user,
        name="Landlord Letter",
        doc_type=DocumentType.LANDLORD_LETTER,
        text=LANDLORD_LETTER,
        page_count=1,
        summary={"utilities": 200, "monthly_rent_total": 1050},
        extracted=[
            ("financial", "utilities", 200, 1),
            ("financial", "monthly_rent_total", 1050, 1),
        ],
        insights=[
            (
                "Rent increase from January 2027",
                "Your landlord's letter announces a higher monthly payment from 01.01.2027. Review the original wording before acting.",
                "money",
                "medium",
                1,
            ),
        ],
    )

    # --- Reminder from a deadline in the utility statement ---
    db.add(
        Reminder(
            user_id=user.id,
            title="Pay utility settlement by November 14",
            date=date(2026, 11, 14),
            document_id=utility.id,
            related_clause="Nachzahlung",
        )
    )

    db.commit()


def _create_document(
    db: Session,
    user: User,
    name: str,
    doc_type: str,
    text: str,
    page_count: int,
    summary: dict[str, Any],
    extracted: list[tuple[str, str, Any, int | None]],
    insights: list[tuple[str, str, str, str, int | None]],
) -> Document:
    doc = Document(
        user_id=user.id,
        name=name,
        document_type=doc_type,
        status=DocumentStatus.READY,
        page_count=page_count,
        summary=summary,
    )
    db.add(doc)
    db.flush()

    # Chunk the demo text and embed it so retrieval + chat work.
    chunks = _chunk_text(text, doc.id, page_count)
    db.add_all(chunks)
    db.flush()
    for c in chunks:
        if not c.embedding:
            c.embedding = embed_texts([c.content])[0]
    db.flush()

    # Extracted fields (page numbers approximate to the chunk mapping).
    for category, key, value, page in extracted:
        db.add(
            ExtractedInformation(
                document_id=doc.id,
                category=category,
                key=key,
                value=value,
                confidence=0.85,
                source_page=page,
            )
        )

    for title, description, category, severity, page in insights:
        db.add(
            Insight(
                document_id=doc.id,
                title=title,
                description=description,
                category=category,
                severity=severity,
                source_page=page,
            )
        )

    db.flush()
    return doc


def _chunk_text(text: str, document_id: int, page_count: int) -> list[DocumentChunk]:
    """Split demo text into chunks preserving a rough page attribution."""
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=700, chunk_overlap=100, separators=["\n\n", "\n", ". ", " ", ""]
    )
    pieces = splitter.split_text(text)
    chunks: list[DocumentChunk] = []
    per_page = max(1, len(pieces) // max(1, page_count))
    for idx, piece in enumerate(pieces):
        page = (idx // per_page) + 1
        chunks.append(
            DocumentChunk(
                document_id=document_id,
                content=piece,
                page_number=min(page, page_count),
            )
        )
    return chunks
