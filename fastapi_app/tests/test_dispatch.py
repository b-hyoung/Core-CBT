"""dispatch_tool 보안 로직 테스트.

핵심 체크:
1. user_email 서버 강제 주입 (LLM이 다른 값 넣어도 덮어씀)
2. output tools 는 ui_actions 에 반영되고 서버 세션에 저장
3. 알 수 없는 툴 이름은 {error: ...} 반환
4. 일반 예외는 {error: ...} 로 잡아 루프 유지
"""
from types import SimpleNamespace
import pytest
from fastapi_app.tools.dispatch import dispatch_tool


class FakeSession:
    def __init__(self):
        self.generated_problems = []
        self.user_evaluations = []


def make_tool_call(name: str, arguments_json: str):
    return SimpleNamespace(
        id=f"call_{name}",
        function=SimpleNamespace(name=name, arguments=arguments_json),
    )


@pytest.mark.asyncio
async def test_user_email_is_forcibly_overridden(monkeypatch):
    """LLM 이 get_user_wrong_history 에 다른 email 넘겨도 서버 email 로 덮어쓴다."""
    captured = {}

    async def fake_wrong_history(user_email, source_session_id, problem_number):
        captured["email"] = user_email
        return {"total_attempts": 0, "wrong_count": 0, "recent_submissions": []}

    monkeypatch.setattr("fastapi_app.tools.dispatch.get_user_wrong_history", fake_wrong_history)

    tc = make_tool_call(
        "get_user_wrong_history",
        '{"user_email":"attacker@evil.com","source_session_id":"2024-first","problem_number":1}',
    )
    session = FakeSession()
    await dispatch_tool(tc, user_email="real@user.com", session=session, ui_actions=[])

    assert captured["email"] == "real@user.com"


@pytest.mark.asyncio
async def test_present_similar_problem_masks_expected_answer(monkeypatch):
    tc = make_tool_call("present_similar_problem", (
        '{"question_text":"q","examples":"e","expected_answer":"42",'
        '"answer_explanation":"why","category":"Code","language":"Java",'
        '"input_type":"single","confidence":5}'
    ))
    session = FakeSession()
    ui_actions = []
    result = await dispatch_tool(tc, user_email="u@x.com", session=session, ui_actions=ui_actions)

    assert "problem_id" in result
    # 서버 세션에는 expected_answer 있음
    assert session.generated_problems[0]["expected_answer"] == "42"
    # UI 페이로드에는 없음
    assert "expected_answer" not in ui_actions[0]["data"]


@pytest.mark.asyncio
async def test_unknown_tool_returns_error():
    tc = make_tool_call("nonexistent_tool", "{}")
    result = await dispatch_tool(tc, user_email="u@x.com", session=FakeSession(), ui_actions=[])
    assert "error" in result


@pytest.mark.asyncio
async def test_invalid_json_arguments_return_error():
    tc = make_tool_call("get_question_detail", "{not valid json")
    result = await dispatch_tool(tc, user_email="u@x.com", session=FakeSession(), ui_actions=[])
    assert "error" in result
    assert "invalid" in result["error"].lower() or "json" in result["error"].lower()


@pytest.mark.asyncio
async def test_tool_exception_is_caught_as_error(monkeypatch):
    async def fake_question(source_session_id, problem_number):
        raise FileNotFoundError("missing")

    monkeypatch.setattr("fastapi_app.tools.dispatch.get_question_detail", fake_question)

    tc = make_tool_call("get_question_detail", '{"source_session_id":"x","problem_number":1}')
    result = await dispatch_tool(tc, user_email="u@x.com", session=FakeSession(), ui_actions=[])
    assert "error" in result
