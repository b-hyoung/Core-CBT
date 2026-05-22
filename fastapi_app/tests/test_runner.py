"""run_agent 루프 integration 테스트 (LLM 은 mock)."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import pytest
from fastapi_app.agent.runner import run_agent
from fastapi_app.db.session_store import AgentSession


def fake_message(content=None, tool_calls=None):
    return SimpleNamespace(
        content=content,
        tool_calls=tool_calls,
        model_dump=lambda: {
            "role": "assistant",
            "content": content,
            "tool_calls": [
                {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                for tc in (tool_calls or [])
            ] if tool_calls else None,
        },
    )


def fake_tool_call(name: str, args: str, call_id: str = "c1"):
    return SimpleNamespace(id=call_id, function=SimpleNamespace(name=name, arguments=args))


def fake_response(message):
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


@pytest.mark.asyncio
async def test_run_agent_returns_reply_when_no_tool_calls(monkeypatch):
    """LLM 이 툴 없이 바로 답변하면 그 답변 그대로 반환."""
    session = AgentSession(user_email="u@x.com", source_session_id="2024-first", problem_number=1)

    async def fake_create(**kwargs):
        return fake_response(fake_message(content="직접 답변입니다"))

    with patch("fastapi_app.agent.runner.get_llm_client") as mock_client, \
         patch("fastapi_app.agent.runner.load_session", AsyncMock(return_value=session)), \
         patch("fastapi_app.agent.runner.save_session", AsyncMock()):
        mock_client.return_value.chat.completions.create = fake_create

        result = await run_agent(
            user_email="u@x.com",
            source_session_id="2024-first",
            problem_number=1,
            user_message="질문",
        )

    assert result["reply"] == "직접 답변입니다"
    assert result["ui_actions"] == []
    assert result["turn_count"] >= 1


@pytest.mark.asyncio
async def test_run_agent_executes_tool_then_responds(monkeypatch):
    """툴 호출 → 결과 주입 → 최종 답변 플로우."""
    session = AgentSession(user_email="u@x.com", source_session_id="2024-first", problem_number=1)

    responses = [
        fake_response(fake_message(
            tool_calls=[fake_tool_call("get_question_detail", '{"source_session_id":"2024-first","problem_number":1}')],
        )),
        fake_response(fake_message(content="문제 해설")),
    ]
    call_counter = {"n": 0}

    async def fake_create(**kwargs):
        r = responses[call_counter["n"]]
        call_counter["n"] += 1
        return r

    async def fake_dispatch(tool_call, user_email, session, ui_actions):
        return {"question_text": "C 문제", "answer": "1"}

    with patch("fastapi_app.agent.runner.get_llm_client") as mock_client, \
         patch("fastapi_app.agent.runner.dispatch_tool", fake_dispatch), \
         patch("fastapi_app.agent.runner.load_session", AsyncMock(return_value=session)), \
         patch("fastapi_app.agent.runner.save_session", AsyncMock()):
        mock_client.return_value.chat.completions.create = fake_create

        result = await run_agent("u@x.com", "2024-first", 1, "왜 틀렸어?")

    assert result["reply"] == "문제 해설"
    assert "get_question_detail" in session.tools_called


@pytest.mark.asyncio
async def test_run_agent_respects_max_iterations(monkeypatch):
    """LLM 이 계속 툴만 부르면 MAX_ITER 에서 중단."""
    session = AgentSession(user_email="u@x.com", source_session_id="2024-first", problem_number=1)

    async def fake_create(**kwargs):
        return fake_response(fake_message(
            tool_calls=[fake_tool_call("get_question_detail", '{"source_session_id":"s","problem_number":1}')],
        ))

    async def fake_dispatch(tool_call, user_email, session, ui_actions):
        return {"ok": True}

    with patch("fastapi_app.agent.runner.get_llm_client") as mock_client, \
         patch("fastapi_app.agent.runner.dispatch_tool", fake_dispatch), \
         patch("fastapi_app.agent.runner.load_session", AsyncMock(return_value=session)), \
         patch("fastapi_app.agent.runner.save_session", AsyncMock()):
        mock_client.return_value.chat.completions.create = fake_create

        result = await run_agent("u@x.com", "2024-first", 1, "x")

    # ERROR_MESSAGES["MAX_ITER_REACHED"] 메시지가 답변에 포함
    from fastapi_app.constants.prompts import ERROR_MESSAGES
    assert ERROR_MESSAGES["MAX_ITER_REACHED"] in result["reply"]
