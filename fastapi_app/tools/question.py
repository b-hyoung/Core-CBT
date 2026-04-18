"""get_question_detail 툴: datasets/practicalIndustrial JSON 파일 로드."""
import json
from pathlib import Path
from ..config import get_settings


async def get_question_detail(source_session_id: str, problem_number: int) -> dict:
    """문제 원문·정답·해설·분류를 한 번에 반환.

    파일 구조:
      {DATASETS_ROOT}/{source_session_id}/problem1.json
      {DATASETS_ROOT}/{source_session_id}/answer1.json
      {DATASETS_ROOT}/{source_session_id}/comment1.json
    """
    settings = get_settings()
    base = Path(settings.datasets_root) / source_session_id

    problem_path = base / "problem1.json"
    answer_path = base / "answer1.json"
    comment_path = base / "comment1.json"

    if not problem_path.exists():
        raise FileNotFoundError(f"session not found: {source_session_id}")

    problems_wrapper = _load_json(problem_path)
    problems = problems_wrapper[0]["problems"] if problems_wrapper else []
    problem = next((p for p in problems if p.get("problem_number") == problem_number), None)
    if problem is None:
        raise KeyError(f"problem {problem_number} not found in {source_session_id}")

    answers = _load_json(answer_path) if answer_path.exists() else []
    comments = _load_json(comment_path) if comment_path.exists() else []

    answer = _find(answers, "problem_number", problem_number, "answer")
    comment = _find(comments, "problem_number", problem_number, "comment")

    return {
        "problem_number": problem.get("problem_number"),
        "question_text": problem.get("question_text", ""),
        "examples": problem.get("examples", ""),
        "input_type": problem.get("input_type", "single"),
        "answer": answer or "",
        "explanation": comment or "",
        "category": problem.get("category"),
        "subcategory": problem.get("subcategory"),
    }


def _load_json(path: Path) -> list:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def _find(items: list, key: str, value, target_key: str):
    for item in items:
        if item.get(key) == value:
            return item.get(target_key)
    return None
