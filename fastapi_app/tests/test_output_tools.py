"""output tools: present_similar_problem / submit_evaluation 처리 로직."""
from fastapi_app.tools.output_tools import (
    handle_present_similar_problem,
    handle_submit_evaluation,
)


class FakeSession:
    def __init__(self):
        self.generated_problems = []
        self.user_evaluations = []


def test_present_adds_to_session_and_returns_problem_id():
    session = FakeSession()
    ui_actions = []
    args = {
        "question_text": "Java 출력 결과",
        "examples": "int a=1; System.out.println(a);",
        "expected_answer": "1",
        "answer_explanation": "변수 a가 1이므로 1 출력",
        "category": "Code",
        "language": "Java",
        "input_type": "single",
        "confidence": 5,
    }
    result = handle_present_similar_problem(args, session, ui_actions)
    assert result["rendered"] is True
    assert result["problem_id"].startswith("gen-")

    # 서버 세션에는 expected_answer 포함
    assert len(session.generated_problems) == 1
    assert session.generated_problems[0]["expected_answer"] == "1"

    # UI 페이로드에는 expected_answer 제거
    assert len(ui_actions) == 1
    assert ui_actions[0]["type"] == "present_problem"
    assert "expected_answer" not in ui_actions[0]["data"]


def test_evaluation_records_result_and_ui_event():
    session = FakeSession()
    ui_actions = []
    args = {"problem_id": "gen-abc123", "correct": True, "reasoning": "답이 6 맞음"}
    result = handle_submit_evaluation(args, session, ui_actions)
    assert result == {"ack": True}
    assert len(session.user_evaluations) == 1
    assert session.user_evaluations[0]["correct"] is True
    assert session.user_evaluations[0]["problem_id"] == "gen-abc123"
    assert ui_actions[0]["type"] == "evaluation"
    assert ui_actions[0]["correct"] is True
