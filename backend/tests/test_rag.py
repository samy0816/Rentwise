"""RAG retriever + chat endpoint tests."""
import uuid

from app.ai import retriever
from app.ai.embeddings import embed_texts
from app.core.security import hash_password
from app.models import (
    Document,
    DocumentChunk,
    DocumentStatus,
    DocumentType,
    User,
)


def _seed_user_and_docs(db):
    email = f"rag-{uuid.uuid4().hex[:8]}@example.com"
    user = User(email=email, password_hash=hash_password("password123"))
    db.add(user)
    db.commit()
    db.refresh(user)

    doc = Document(
        user_id=user.id,
        name="Rental Contract",
        document_type=DocumentType.RENTAL_CONTRACT,
        status=DocumentStatus.READY,
        page_count=1,
        summary={"deposit": 1700},
    )
    db.add(doc)
    db.flush()

    texts = [
        "Die monatliche Kaltmiete beträgt 850,00 €.",
        "Der Mieter leistet eine Kaution in Höhe von 1.700,00 €.",
        "Das Mietverhältnis kann mit einer Frist von drei Monaten gekündigt werden.",
    ]
    vectors = embed_texts(texts)
    for i, (text, vec) in enumerate(zip(texts, vectors), start=1):
        db.add(
            DocumentChunk(
                document_id=doc.id,
                content=text,
                page_number=1,
                embedding=vec,
            )
        )
    db.commit()
    return user, doc


def test_retriever_returns_relevant_chunk(db):
    user, doc = _seed_user_and_docs(db)
    chunks = retriever.retrieve(db, user.id, "deposit kaution", top_k=3)
    assert len(chunks) > 0
    # The deposit clause should rank at/near the top.
    top = chunks[0].content.lower()
    assert ("kaution" in top) or ("1.700" in top)


def test_chat_grounded_answer(client, register, db):
    user_obj, doc = _seed_user_and_docs(db)
    register("chatuser@example.com")

    # Log in and ask.
    r = client.post(
        "/auth/login", json={"email": "chatuser@example.com", "password": "password123"}
    )
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # The seed user and the registered user differ, so /chat returns no content
    # for the registered user (no documents). Assert graceful "no info" answer.
    chat = client.post("/chat", headers=headers, json={"message": "How much is my deposit?"})
    assert chat.status_code == 200
    assert "couldn't find" in chat.json()["answer"] or "documents" in chat.json()["answer"]


def test_chat_as_doc_owner(db, client, register):
    user_obj, doc = _seed_user_and_docs(db)
    # The seeded user id is what owns the doc; register via API creates another.
    # Simulate by directly querying for the user and generating a token.
    from app.core.security import create_access_token

    token = create_access_token(user_obj.id)
    headers = {"Authorization": f"Bearer {token}"}

    chat = client.post("/chat", headers=headers, json={"message": "How much is my deposit?"})
    assert chat.status_code == 200
    assert chat.json()["sources"]  # sources present
