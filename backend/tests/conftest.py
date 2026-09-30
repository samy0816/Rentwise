"""Pytest fixtures: isolated in-memory SQLite database + test client."""
import os
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configure a dedicated test database BEFORE the app is imported so the
# engine in `app.db.session` points at an isolated, throwaway DB.
_TMP_DIR = tempfile.mkdtemp(prefix="rentwise_test_")
_DB_PATH = Path(_TMP_DIR) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_PATH}"
os.environ["DEMO_MODE"] = "true"
os.environ["SEED_DEMO_DATA"] = "false"
os.environ["OPENAI_API_KEY"] = ""

# Make `backend/` importable.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402

engine = create_engine(
    os.environ["DATABASE_URL"], connect_args={"check_same_thread": False}
)
Base.metadata.create_all(bind=engine)
TestingSessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def register_user(client: TestClient, email: str, password: str = "password123"):
    """Register a user and return bearer auth headers."""
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def register(client):
    return lambda email, password="password123": register_user(client, email, password)


@pytest.fixture()
def auth_headers(client):
    return register_user(client, "user@example.com")


def make_pdf_bytes(text: str = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"):
    return text
