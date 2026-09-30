"""Authentication tests."""


def test_register_and_login(client):
    r = client.post(
        "/auth/register",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["user"]["email"] == "test@example.com"
    assert data["access_token"]

    # Login with the same credentials.
    r = client.post(
        "/auth/login", json={"email": "test@example.com", "password": "password123"}
    )
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_register_duplicate_email(client):
    client.post("/auth/register", json={"email": "dup@example.com", "password": "password123"})
    r = client.post(
        "/auth/register", json={"email": "dup@example.com", "password": "password123"}
    )
    assert r.status_code == 409


def test_login_wrong_password(client):
    client.post("/auth/register", json={"email": "pw@example.com", "password": "password123"})
    r = client.post("/auth/login", json={"email": "pw@example.com", "password": "wrongpass"})
    assert r.status_code == 401


def test_me_requires_token(client):
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_me_with_token(client, auth_headers):
    r = client.get("/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "user@example.com"
