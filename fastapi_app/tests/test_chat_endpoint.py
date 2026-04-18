"""/chat 엔드포인트 echo 버전 테스트."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()
    from fastapi_app.main import app
    return TestClient(app)


def test_chat_echoes_message(client):
    resp = client.post(
        "/chat",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@example.com"},
        json={"source_session_id": "2024-first", "problem_number": 3, "message": "왜 틀렸어?"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"].startswith("[echo]")
    assert "왜 틀렸어?" in body["reply"]
    assert body["turn_count"] == 0
    assert body["ui_actions"] == []


def test_chat_rejects_without_secret(client):
    resp = client.post(
        "/chat",
        headers={"x-user-email": "u@example.com"},
        json={"source_session_id": "2024-first", "problem_number": 3, "message": "x"},
    )
    assert resp.status_code == 401


def test_chat_rejects_without_email(client):
    resp = client.post(
        "/chat",
        headers={"x-internal-auth": "test-secret"},
        json={"source_session_id": "2024-first", "problem_number": 3, "message": "x"},
    )
    assert resp.status_code == 400
