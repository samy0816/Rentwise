"""Document-related schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


# --- Core document ---
class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    document_type: str | None
    status: str
    uploaded_at: datetime
    page_count: int | None
    summary: dict[str, Any] | None = None


class DocumentDetail(DocumentOut):
    extracted: list["ExtractedInfoOut"] = []
    insights: list["InsightOut"] = []


class ProcessingStatus(BaseModel):
    document_id: int
    status: str
    message: str | None = None
    error: str | None = None


# --- Structured extraction ---
class ExtractedInfoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    key: str
    value: Any
    confidence: float
    source_page: int | None


class InsightOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: str
    severity: str
    source_page: int | None


# --- Contract overview ---
class ContractOverview(BaseModel):
    document_id: int
    document_name: str
    financial: list[ExtractedInfoOut]
    contract: list[ExtractedInfoOut]
    living_rules: list[ExtractedInfoOut]
    responsibilities: list[ExtractedInfoOut]
    important_clauses: list[InsightOut]


class PageContent(BaseModel):
    page_number: int
    text: str


class DocumentContent(BaseModel):
    document_id: int
    document_name: str
    pages: list[PageContent]


DocumentDetail.model_rebuild()
