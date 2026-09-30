"""Embedding service: generate and persist chunk embeddings."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.ai.embeddings import embed_texts
from app.models import DocumentChunk


def populate_embeddings(db: Session, document_id: int) -> int:
    """Generate embeddings for all chunks of a document that lack one.

    Returns the number of embeddings written.
    """
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .all()
    )
    to_fill = [c for c in chunks if not c.embedding]
    if not to_fill:
        return 0

    texts = [c.content for c in to_fill]
    vectors = embed_texts(texts)
    for chunk, vec in zip(to_fill, vectors):
        chunk.embedding = vec

    db.commit()
    return len(to_fill)
