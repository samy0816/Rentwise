"""Document comparison endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.reminder import CompareRequest, CompareResponse
from app.services import comparison_service

router = APIRouter(prefix="/documents", tags=["comparison"])


@router.post("/compare", response_model=CompareResponse)
def compare(
    payload: CompareRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompareResponse:
    try:
        return comparison_service.compare_documents(
            db, user.id, payload.document_a_id, payload.document_b_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
