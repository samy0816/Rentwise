"""Retriever over the user's document chunks.

Performs cosine-similarity search. In production this could delegate to a
pgvector query, but to keep one code path that works in demo mode we load the
stored embeddings and compute similarity in Python. Results are filtered to the
current user and optionally to a single document, then ranked.
"""
from __future__ import annotations

import math
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.embeddings import embed_query
from app.ai.llm import RetrievedChunk
from app.models import Document, DocumentChunk


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _strip_markup(text: str) -> str:
    """Remove common markdown so searched snippets stay readable."""
    text = re.sub(r"#{1,6}\s*", "", text)
    text = re.sub(r"[*_`>~]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def retrieve(
    db: Session,
    user_id: int,
    query: str,
    document_id: int | None = None,
    top_k: int = 5,
    score_threshold: float = 0.05,
) -> list[RetrievedChunk]:
    """Return the top_k most relevant chunks for the query."""
    # Filter chunks by user + optional document.
    stmt = (
        select(DocumentChunk, Document)
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(Document.user_id == user_id)
    )
    if document_id is not None:
        stmt = stmt.where(DocumentChunk.document_id == document_id)
    rows = db.execute(stmt).all()

    query_vec = embed_query(query)
    results: list[RetrievedChunk] = []

    for chunk, doc in rows:
        if not chunk.embedding:
            continue
        score = _cosine(query_vec, chunk.embedding)
        # Add a small lexical boost for exact keyword overlap so the demo
        # retriever surfaces the right passage for concrete terms.
        lexical = _lexical_overlap(query, chunk.content)
        combined = score + lexical * 0.05
        results.append(
            RetrievedChunk(
                content=_strip_markup(chunk.content),
                document_id=doc.id,
                document_name=doc.name,
                document_type=doc.document_type,
                page_number=chunk.page_number,
                section=chunk.section,
                score=round(combined, 4),
            )
        )

    results.sort(key=lambda c: c.score, reverse=True)
    # Always return up to top_k so the demo surfaces useful results even when
    # exact embedding match is weak (e.g. cross-language queries).
    return results[:top_k]


def _lexical_overlap(query: str, content: str) -> float:
    q_words = set(re.findall(r"\w+", query.lower()))
    if not q_words:
        return 0.0
    content_words = set(re.findall(r"\w+", content.lower()))
    return len(q_words & content_words) / len(q_words)
