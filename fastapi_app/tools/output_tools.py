"""UI 액션 트리거 툴 처리기.

present_similar_problem:
  - 서버 세션의 generated_problems 에 전체 args 저장 (expected_answer 포함)
  - UI 페이로드에서는 expected_answer 제거 (유출 방지)
  - ui_actions 리스트에 렌더링 이벤트 append

submit_evaluation:
  - session.user_evaluations 에 결과 저장
  - ui_actions 리스트에 피드백 이벤트 append
"""
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def handle_present_similar_problem(args: dict[str, Any], session, ui_actions: list) -> dict:
    problem_id = f"gen-{uuid4().hex[:8]}"

    # 서버 세션 저장 (expected_answer 포함)
    stored = {"problem_id": problem_id, "created_at": _utc_now_iso(), **args}
    session.generated_problems.append(stored)

    # UI 페이로드: expected_answer 제거
    ui_payload = {k: v for k, v in args.items() if k != "expected_answer"}
    ui_actions.append({
        "type": "present_problem",
        "problem_id": problem_id,
        "data": ui_payload,
    })

    return {"problem_id": problem_id, "rendered": True}


def handle_submit_evaluation(args: dict[str, Any], session, ui_actions: list) -> dict:
    entry = {**args, "timestamp": _utc_now_iso()}
    session.user_evaluations.append(entry)
    ui_actions.append({"type": "evaluation", **args})
    return {"ack": True}
