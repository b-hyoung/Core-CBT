"""/chat 엔드포인트 테스트."""
import pytest
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()
    from fastapi_app.main import app
    return TestClient(app)


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


@pytest.mark.asyncio
async def test_chat_calls_run_agent(client, monkeypatch):
    fake_run = AsyncMock(return_value={"reply": "mock reply", "ui_actions": [], "turn_count": 1})
    monkeypatch.setattr("fastapi_app.main.run_agent", fake_run)

    resp = client.post(
        "/chat",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@example.com"},
        json={"source_session_id": "2024-first", "problem_number": 3, "message": "x"},
    )
    assert resp.status_code == 200
    assert resp.json()["reply"] == "mock reply"
    fake_run.assert_awaited_once()
