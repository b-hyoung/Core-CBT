"""GET/DELETE /session 엔드포인트."""
import pytest
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from fastapi_app.db.session_store import AgentSession


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()
    from fastapi_app.main import app
    return TestClient(app)


def test_get_session_returns_messages_when_exists(client, monkeypatch):
    session = AgentSession(
        user_email="u@x.com", source_session_id="2024-first", problem_number=1,
    )
    session.messages = [
        {"role": "system", "content": "s"},
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
    ]
    session.turn_count = 1
    session.generated_problems = [{"problem_id": "gen-1", "question_text": "q", "expected_answer": "hidden"}]

    async def fake_load(user_email, sid, pnum):
        return session

    monkeypatch.setattr("fastapi_app.main.load_session", fake_load)

    resp = client.get(
        "/session/2024-first/1",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@x.com"},
    )
    assert resp.status_code == 200
    body = resp.json()
    # system 메시지는 응답에서 제외 (프론트가 볼 필요 없음)
    roles = [m["role"] for m in body["messages"]]
    assert "system" not in roles
    assert body["turn_count"] == 1
    # 생성 문제 리스트에서 expected_answer 마스킹
    assert body["generated_problems"][0]["problem_id"] == "gen-1"
    assert "expected_answer" not in body["generated_problems"][0]


def test_get_session_returns_empty_when_missing(client, monkeypatch):
    monkeypatch.setattr("fastapi_app.main.load_session", AsyncMock(return_value=None))
    resp = client.get(
        "/session/2024-first/99",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@x.com"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["messages"] == []
    assert body["turn_count"] == 0


def test_delete_session_returns_ok(client, monkeypatch):
    monkeypatch.setattr("fastapi_app.main.delete_session", AsyncMock())
    resp = client.delete(
        "/session/2024-first/1",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@x.com"},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
