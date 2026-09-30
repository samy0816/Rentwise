"""RAG service: answer questions grounded in the user's documents."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.ai import retriever
from app.ai.llm import get_llm
from app.models import Document
from app.schemas.chat import ChatRequest, ChatResponse, SourceRef


def answer_question(
    db: Session,
    user_id: int,
    request: ChatRequest,
) -> ChatResponse:
    """Retrieve relevant chunks and produce a grounded answer with sources."""
    chunks = retriever.retrieve(
        db,
        user_id=user_id,
        query=request.message,
        document_id=request.document_id,
        top_k=5,
    )

    llm = get_llm()
    result = llm.answer(
        request.message,
        chunks,
        history=request.history,
        language=request.language,
    )

    sources = [
        SourceRef(
            document_id=c.document_id,
            document_name=c.document_name,
            document_type=c.document_type,
            page_number=c.page_number,
            section=c.section,
            snippet=c.content[:300],
        )
        for c in chunks[:4]
    ]

    return ChatResponse(
        answer=result.answer,
        sources=sources,
        grounded=result.grounded,
    )


def explain_text(
    db: Session,
    user_id: int,
    text: str | None = None,
    document_id: int | None = None,
    context_title: str | None = None,
    language: str = "en",
    query: str | None = None,
) -> tuple[str, SourceRef | None]:
    """Provide a plain-language explanation of a selected passage.

    If `query` + `document_id` are given, the most relevant clause is retrieved
    from the user's document and explained (this is how "Explain this" works —
    it never guesses a page). Otherwise the provided `text` is explained.
    """
    source: SourceRef | None = None
    resolved_text = text

    if query and document_id:
        from app.ai import retriever

        chunks = retriever.retrieve(
            db, user_id=user_id, query=query, document_id=document_id, top_k=3
        )
        if not chunks:
            raise ValueError("Couldn't find a relevant passage in the document.")
        context = "\n\n".join(
            f"[{c.document_name}"
            + (f", page {c.page_number}" if c.page_number else "")
            + (f", {c.section}" if c.section else "")
            + "]\n" + c.content
            for c in chunks
        )
        top = chunks[0]
        source = SourceRef(
            document_id=top.document_id,
            document_name=top.document_name,
            document_type=top.document_type,
            page_number=top.page_number,
            section=top.section,
        )
        llm = get_llm()
        explanation = llm.explain_query(query, context, language=language)
        return explanation, source

    if document_id:
        doc = db.get(Document, document_id)
        if doc and doc.user_id == user_id:
            source = SourceRef(
                document_id=doc.id,
                document_name=doc.name,
                document_type=doc.document_type,
            )

    if not resolved_text:
        raise ValueError("No passage provided to explain.")

    llm = get_llm()
    explanation = llm.explain(
        resolved_text, context_title=context_title, language=language
    )
    return explanation, source
