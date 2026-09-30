"""Chat / RAG and "Explain this" endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_user_document
from app.db.session import get_db
from app.models import Document, User
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ExplainRequest,
    ExplainResponse,
    SourceRef,
)
from app.services import rag_service

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    """Answer a question across all of the user's documents."""
    return rag_service.answer_question(db, user.id, payload)


@router.post("/documents/{document_id}/chat", response_model=ChatResponse)
def chat_document(
    document_id: int,
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    """Answer a question scoped to a single document."""
    # Enforce ownership.
    doc = db.get(Document, document_id)
    if doc is None or doc.user_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    scoped = ChatRequest(
        message=payload.message,
        document_id=document_id,
        history=payload.history,
        language=payload.language,
    )
    return rag_service.answer_question(db, user.id, scoped)


@router.post("/ai/explain", response_model=ExplainResponse)
def explain(
    payload: ExplainRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExplainResponse:
    """Plain-language explanation of a selected passage or clause."""
    if not payload.text and not payload.query:
        raise HTTPException(
            status_code=400, detail="Provide either 'text' or 'query' to explain."
        )
    if payload.document_id:
        doc = db.get(Document, payload.document_id)
        if doc is None or doc.user_id != user.id:
            raise HTTPException(status_code=404, detail="Document not found")

    explanation, source = rag_service.explain_text(
        db,
        user.id,
        text=payload.text,
        query=payload.query,
        document_id=payload.document_id,
        context_title=payload.context_title,
        language=payload.language,
    )
    return ExplainResponse(explanation=explanation, source=source)
