"""Reminder + search + comparison schemas."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ReminderCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    date: date
    document_id: int | None = None
    related_clause: str | None = None


class ReminderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    date: date
    document_id: int | None
    related_clause: str | None
    created_at: datetime


# --- Search ---
class SearchResult(BaseModel):
    document_id: int
    document_name: str
    document_type: str | None
    page_number: int | None
    section: str | None
    snippet: str
    score: float
    category: str | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]


# --- Comparison ---
class CompareRequest(BaseModel):
    document_a_id: int
    document_b_id: int


class CompareDiff(BaseModel):
    field: str
    label: str
    before: Any
    after: Any
    changed: bool
    note: str | None = None
    source_pages: list[int] = []


class CompareResponse(BaseModel):
    document_a_name: str
    document_b_name: str
    changes: list[CompareDiff]
    summary: str | None = None
