"""/submit: 유저가 생성 문제에 답 제출 → run_agent 재진입."""
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


def test_submit_calls_run_agent_with_synthesized_message(client, monkeypatch):
    captured_message = {}

    async def fake_run(user_email, source_session_id, problem_number, user_message):
        captured_message["value"] = user_message
        return {"reply": "정답!", "ui_actions": [], "turn_count": 2}

    monkeypatch.setattr("fastapi_app.main.run_agent", fake_run)

    resp = client.post(
        "/submit",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@x.com"},
        json={
            "source_session_id": "2024-first",
            "problem_number": 3,
            "problem_id": "gen-abc",
            "user_answer": "6",
        },
    )
    assert resp.status_code == 200
    # 서버가 "[유저가 gen-abc 문제에 답: '6']" 형태 메시지로 합성해서 LLM에게 보냈는지 확인
    assert "gen-abc" in captured_message["value"]
    assert "6" in captured_message["value"]
