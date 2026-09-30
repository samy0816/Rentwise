"""Global semantic search endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.ai import retriever
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.reminder import SearchResponse, SearchResult

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=1, max_length=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SearchResponse:
    chunks = retriever.retrieve(db, user_id=user.id, query=q, top_k=8)
    results = [
        SearchResult(
            document_id=c.document_id,
            document_name=c.document_name,
            document_type=c.document_type,
            page_number=c.page_number,
            section=c.section,
            snippet=c.content,
            score=c.score,
        )
        for c in chunks
    ]
    return SearchResponse(query=q, results=results)
