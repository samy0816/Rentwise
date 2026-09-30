"""Document endpoints."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_user_document
from app.config import settings
from app.db.session import get_db
from app.models import Document, User
from app.schemas.document import (
    ContractOverview,
    DocumentContent,
    DocumentDetail,
    DocumentOut,
    ExtractedInfoOut,
    InsightOut,
    PageContent,
    ProcessingStatus,
)
from app.schemas.reminder import SearchResponse, SearchResult
from app.services import comparison_service, document_service
from app.services.pdf_utils import ScannedPdfError

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut, status_code=201)
def upload_document(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentOut:
    """Upload a PDF and process it. Returns the document with its status."""
    original_name = file.filename or "document.pdf"
    if not original_name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )
    if not file.content_type == "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    data = file.file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    path = document_service.save_upload(data, original_name, user.id)
    doc = document_service.create_document(db, user.id, original_name, str(path))
    try:
        document_service.process_document(db, doc)
    except ScannedPdfError:
        pass  # surfaced via doc.status == failed
    return DocumentOut.model_validate(doc)


@router.get("", response_model=list[DocumentOut])
def list_documents(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DocumentOut]:
    docs = (
        db.query(Document)
        .filter(Document.user_id == user.id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )
    return [DocumentOut.model_validate(d) for d in docs]


@router.get("/{document_id}", response_model=DocumentDetail)
def get_document(
    document: Document = Depends(get_user_document),
) -> DocumentDetail:
    return DocumentDetail.model_validate(document)


@router.get("/{document_id}/status", response_model=ProcessingStatus)
def document_status(
    document: Document = Depends(get_user_document),
) -> ProcessingStatus:
    return ProcessingStatus(
        document_id=document.id,
        status=document.status,
        error=document.processing_error,
    )


@router.post("/{document_id}/process", response_model=ProcessingStatus)
def process(
    document: Document = Depends(get_user_document),
    db: Session = Depends(get_db),
) -> ProcessingStatus:
    document_service.process_document(db, document)
    db.refresh(document)
    return ProcessingStatus(
        document_id=document.id,
        status=document.status,
        error=document.processing_error,
    )


@router.delete("/{document_id}", status_code=204, response_model=None)
def delete_document(
    document: Document = Depends(get_user_document),
    db: Session = Depends(get_db),
) -> None:
    # Delete the stored file if present.
    if document.file_path:
        p = Path(document.file_path)
        if p.exists():
            p.unlink(missing_ok=True)
    db.delete(document)
    db.commit()


@router.get("/{document_id}/overview", response_model=ContractOverview)
def contract_overview(
    document: Document = Depends(get_user_document),
) -> ContractOverview:
    """Group extracted fields + insights into the contract overview sections."""
    financial, contract, living_rules, responsibilities = [], [], [], []
    for item in document.extracted:
        if item.category == "financial":
            financial.append(ExtractedInfoOut.model_validate(item))
        elif item.category == "contract":
            contract.append(ExtractedInfoOut.model_validate(item))
        elif item.category == "living_rules":
            living_rules.append(ExtractedInfoOut.model_validate(item))
        else:
            responsibilities.append(ExtractedInfoOut.model_validate(item))

    important = [InsightOut.model_validate(i) for i in document.insights]
    return ContractOverview(
        document_id=document.id,
        document_name=document.name,
        financial=financial,
        contract=contract,
        living_rules=living_rules,
        responsibilities=responsibilities,
        important_clauses=important,
    )


@router.get("/{document_id}/insights", response_model=list[InsightOut])
def document_insights(
    document: Document = Depends(get_user_document),
) -> list[InsightOut]:
    return [InsightOut.model_validate(i) for i in document.insights]


@router.get("/{document_id}/content", response_model=DocumentContent)
def document_content(
    document: Document = Depends(get_user_document),
) -> DocumentContent:
    """Return the document's text grouped by page for the viewer."""
    pages: dict[int, list[str]] = {}
    for chunk in document.chunks:
        page = chunk.page_number or 1
        pages.setdefault(page, []).append(chunk.content)

    ordered = [
        PageContent(page_number=p, text="\n\n".join(txt))
        for p, txt in sorted(pages.items())
    ]
    # Ensure all page numbers from page_count are represented.
    if document.page_count:
        existing = {p.page_number for p in ordered}
        for p in range(1, document.page_count + 1):
            if p not in existing:
                ordered.append(PageContent(page_number=p, text=""))
        ordered.sort(key=lambda x: x.page_number)

    return DocumentContent(
        document_id=document.id,
        document_name=document.name,
        pages=ordered,
    )
