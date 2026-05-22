"""AgentSession dataclass shape 테스트.

실제 Supabase CRUD는 integration 레이어에서. 여기서는 직렬화만.
"""
from fastapi_app.db.session_store import AgentSession, serialize_for_upsert


def test_new_session_defaults():
    s = AgentSession(
        user_email="u@x.com",
        source_session_id="2024-first",
        problem_number=1,
    )
    assert s.messages == []
    assert s.tools_called == []
    assert s.turn_count == 0
    assert s.generated_problems == []
    assert s.user_evaluations == []
    assert s.prompt_version == "v1.0"


def test_serialize_for_upsert_shape():
    s = AgentSession(
        user_email="u@x.com",
        source_session_id="2024-first",
        problem_number=1,
        category="Code",
        subcategory="Java",
    )
    s.messages.append({"role": "user", "content": "hi"})
    s.tools_called.append("get_question_detail")
    s.turn_count = 1

    payload = serialize_for_upsert(s)
    assert payload["user_email"] == "u@x.com"
    assert payload["source_session_id"] == "2024-first"
    assert payload["problem_number"] == 1
    assert payload["category"] == "Code"
    assert payload["subcategory"] == "Java"
    assert payload["messages"] == [{"role": "user", "content": "hi"}]
    assert payload["tools_called"] == ["get_question_detail"]
    assert payload["turn_count"] == 1
