"""Document-related models.

These cover the document store, the searchable chunks, the structured
information extracted from a document and the user-facing "insights".
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONVector

if TYPE_CHECKING:
    from app.models.reminder import Reminder
    from app.models.user import User


# Enum-like string constants -------------------------------------------------
class DocumentStatus:
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class DocumentType:
    RENTAL_CONTRACT = "rental_contract"
    LEASE_AMENDMENT = "lease_amendment"
    UTILITY = "utility"
    HANDOVER_PROTOCOL = "handover_protocol"
    HOUSE_RULES = "house_rules"
    LANDLORD_LETTER = "landlord_letter"
    INVOICE = "invoice"
    OTHER = "other"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    document_type: Mapped[str | None] = mapped_column(
        String(40), nullable=True, index=True
    )
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=DocumentStatus.UPLOADED)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Optional structured summary for rental contracts etc. (JSON)
    summary: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    owner: Mapped["User"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    extracted: Mapped[list["ExtractedInformation"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    insights: Mapped[list["Insight"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    reminders: Mapped[list["Reminder"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Document {self.name} ({self.status})>"


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    content: Mapped[str] = mapped_column(Text)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Embedding stored as JSON text (portable). Vector store computes similarity.
    embedding: Mapped[list[float] | None] = mapped_column(JSONVector, nullable=True)
    meta: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)

    document: Mapped["Document"] = relationship(back_populates="chunks")


class ExtractedInformation(Base):
    """A single structured fact extracted from a document."""

    __tablename__ = "extracted_information"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    category: Mapped[str] = mapped_column(String(60), index=True)
    key: Mapped[str] = mapped_column(String(120))
    value: Mapped[Any] = mapped_column(JSON)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    source_page: Mapped[int | None] = mapped_column(Integer, nullable=True)

    document: Mapped["Document"] = relationship(back_populates="extracted")


class Insight(Base):
    """A user-facing, potentially-important observation about a document."""

    __tablename__ = "insights"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(60), index=True)
    severity: Mapped[str] = mapped_column(String(20), default="info")
    source_page: Mapped[int | None] = mapped_column(Integer, nullable=True)

    document: Mapped["Document"] = relationship(back_populates="insights")
