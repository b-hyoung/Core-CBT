"""TOOLS_SCHEMA 구조 검증."""
from fastapi_app.agent.schemas import TOOLS_SCHEMA


def test_has_all_five_tools():
    names = [t["function"]["name"] for t in TOOLS_SCHEMA]
    assert set(names) == {
        "get_question_detail",
        "get_user_wrong_history",
        "get_user_topic_stats",
        "present_similar_problem",
        "submit_evaluation",
    }


def test_all_tools_use_function_type():
    for t in TOOLS_SCHEMA:
        assert t["type"] == "function"
        assert "name" in t["function"]
        assert "description" in t["function"]
        assert "parameters" in t["function"]


def test_user_scoped_tools_do_not_declare_user_email_param():
    for name in ("get_user_wrong_history", "get_user_topic_stats"):
        tool = next(t for t in TOOLS_SCHEMA if t["function"]["name"] == name)
        props = tool["function"]["parameters"].get("properties", {})
        assert "user_email" not in props


def test_present_similar_problem_has_expected_answer():
    tool = next(t for t in TOOLS_SCHEMA if t["function"]["name"] == "present_similar_problem")
    props = tool["function"]["parameters"]["properties"]
    assert "expected_answer" in props
    assert "confidence" in props
