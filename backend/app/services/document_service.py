"""Document processing pipeline orchestration.

The pipeline is:

    upload -> save file -> extract text -> classify -> chunk
        -> embed -> extract contract info -> insights -> ready

Chunking intentionally uses a LangChain text splitter (demonstrating the
library) while keeping page-number metadata accurate by splitting per page.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.orm import Session

from app.ai.llm import get_llm
from app.config import settings
from app.models import Document, DocumentChunk, DocumentStatus, DocumentType
from app.services import embedding_service, extraction_service
from app.services.pdf_utils import ScannedPdfError, extract_pdf_pages, extract_pdf_text

UPLOADED_STATUS = DocumentStatus.UPLOADED

# Chunking parameters
_CHUNK_SIZE = 900
_CHUNK_OVERLAP = 120


def save_upload(file_bytes: bytes, original_name: str, user_id: int) -> Path:
    """Persist the uploaded PDF into the user's uploads folder."""
    safe_name = Path(original_name).name or "upload.pdf"
    upload_dir = settings.UPLOAD_DIR / str(user_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / safe_name
    with open(dest, "wb") as fh:
        fh.write(file_bytes)
    return dest


def create_document(
    db: Session, user_id: int, name: str, file_path: str
) -> Document:
    doc = Document(
        user_id=user_id,
        name=name,
        file_path=file_path,
        status=UPLOADED_STATUS,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def process_document(db: Session, doc: Document) -> Document:
    """Run the full processing pipeline for a document."""
    doc.status = DocumentStatus.PROCESSING
    db.commit()

    try:
        full_text, page_count = extract_pdf_text(Path(doc.file_path))
        doc.page_count = page_count

        # Classify the document type.
        llm = get_llm()
        doc.document_type = llm.classify(full_text[:4000])

        # Split by page so page numbers stay accurate in chunk metadata.
        pages_text = extract_pdf_pages(Path(doc.file_path))
        chunks = _chunk_pages(pages_text, doc.id)

        # Clear any previous chunks (re-processing) and insert fresh ones.
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
        db.commit()
        for c in chunks:
            db.add(c)
        db.commit()

        # Generate embeddings for the new chunks.
        embedding_service.populate_embeddings(db, doc.id)

        # Extract structured contract information + insights for contracts.
        if doc.document_type in {
            DocumentType.RENTAL_CONTRACT,
            DocumentType.LEASE_AMENDMENT,
        }:
            summary = extraction_service.extract_contract_info(db, doc, pages_text)
            doc.summary = summary
        else:
            doc.summary = None

        doc.status = DocumentStatus.READY
        doc.processing_error = None
        db.commit()
        db.refresh(doc)
        return doc

    except ScannedPdfError as exc:
        doc.status = DocumentStatus.FAILED
        doc.processing_error = str(exc)
        db.commit()
        return doc
    except Exception as exc:  # noqa: BLE001 - generic pipeline guard
        doc.status = DocumentStatus.FAILED
        doc.processing_error = f"Something went wrong: {exc}"
        db.commit()
        return doc


def _chunk_pages(
    pages_text: list[tuple[int, str]], document_id: int
) -> list[DocumentChunk]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=_CHUNK_SIZE,
        chunk_overlap=_CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks: list[DocumentChunk] = []
    for page_num, page_text in pages_text:
        if not page_text.strip():
            continue
        for piece in splitter.split_text(page_text):
            chunk = DocumentChunk(
                document_id=document_id,
                content=piece,
                page_number=page_num,
            )
            chunks.append(chunk)
    return chunks
