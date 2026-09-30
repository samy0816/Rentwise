"""Document access-control and endpoint tests."""
from sqlalchemy import select

from app.models import Document, DocumentStatus, DocumentType, User


def _create_user(db, email: str):
    from app.core.security import hash_password

    user = User(email=email, password_hash=hash_password("password123"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_document(db, user_id: int) -> Document:
    doc = Document(
        user_id=user_id,
        name="Test Contract.pdf",
        document_type=DocumentType.RENTAL_CONTRACT,
        status=DocumentStatus.READY,
        page_count=2,
        summary={"monthly_rent": 900},
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def test_user_cannot_access_another_users_document(client, register, db):
    user_a = _create_user(db, "owner@example.com")
    doc = _create_document(db, user_a.id)

    # Register a second user (B) and attempt to access A's document.
    headers_b = register("intruder@example.com")

    r = client.get(f"/documents/{doc.id}", headers=headers_b)
    assert r.status_code == 404

    r = client.get(f"/documents/{doc.id}/overview", headers=headers_b)
    assert r.status_code == 404

    r = client.get(f"/documents/{doc.id}/insights", headers=headers_b)
    assert r.status_code == 404

    r = client.get(f"/documents/{doc.id}/content", headers=headers_b)
    assert r.status_code == 404

    r = client.delete(f"/documents/{doc.id}", headers=headers_b)
    assert r.status_code == 404


def test_owner_can_access_document(client, register, db):
    headers = register("realowner@example.com")
    user = db.execute(
        select(User).where(User.email == "realowner@example.com")
    ).scalar_one()
    doc = _create_document(db, user.id)

    r = client.get(f"/documents/{doc.id}", headers=headers)
    assert r.status_code == 200
    assert r.json()["name"] == "Test Contract.pdf"

    r = client.get(f"/documents/{doc.id}/overview", headers=headers)
    assert r.status_code == 200


def test_documents_require_auth(client):
    r = client.get("/documents")
    assert r.status_code == 401
