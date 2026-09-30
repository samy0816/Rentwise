"""Chat / RAG schemas."""
from __future__ import annotations

from pydantic import BaseModel, Field


class SourceRef(BaseModel):
    document_id: int
    document_name: str
    document_type: str | None = None
    page_number: int | None = None
    section: str | None = None
    snippet: str | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    document_id: int | None = None
    history: list[ChatMessage] = []
    language: str = "en"


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceRef] = []
    grounded: bool = True


class ExplainRequest(BaseModel):
    text: str | None = None
    query: str | None = None
    document_id: int | None = None
    context_title: str | None = None
    language: str = "en"


class ExplainResponse(BaseModel):
    explanation: str
    source: SourceRef | None = None
