"""get_question_detail 툴: datasets/practicalIndustrial JSON 파일 로드."""
import json
from pathlib import Path
from ..config import get_settings

# 태그 데이터 캐시 (서버 시작 시 1회 로드)
_TAGS_CACHE: dict[str, dict] = {}


def _load_tags() -> dict[str, dict]:
    """datasets/tags/*.json 파일들을 로드하여 캐시."""
    if _TAGS_CACHE:
        return _TAGS_CACHE
    tags_dir = Path(get_settings().datasets_root).parent / "tags"
    if tags_dir.exists():
        for tag_file in tags_dir.glob("*-tags.json"):
            with tag_file.open("r", encoding="utf-8") as f:
                data = json.load(f)
            _TAGS_CACHE.update(data)
    return _TAGS_CACHE


def get_problem_tags(source_session_id: str, problem_number: int) -> dict | None:
    """특정 문제의 태그 데이터를 반환. 없으면 None."""
    tags = _load_tags()
    # session_id 매핑: "2025-second" → "practical-industrial-2025-2"
    parts = source_session_id.split("-")
    if len(parts) == 2:
        round_map = {"first": "1", "second": "2", "third": "3"}
        tag_key = f"practical-industrial-{parts[0]}-{round_map.get(parts[1], parts[1])}:{problem_number}"
    else:
        tag_key = f"{source_session_id}:{problem_number}"
    return tags.get(tag_key)


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

    raw_answers = _load_json(answer_path) if answer_path.exists() else []
    raw_comments = _load_json(comment_path) if comment_path.exists() else []

    # answer1.json: [{answers: [...]}] 또는 flat [{problem_number, ...}]
    answers = raw_answers[0].get("answers", []) if raw_answers and isinstance(raw_answers[0], dict) and "answers" in raw_answers[0] else raw_answers
    comments = raw_comments[0].get("comments", []) if raw_comments and isinstance(raw_comments[0], dict) and "comments" in raw_comments[0] else raw_comments

    answer = _find(answers, "problem_number", problem_number, "correct_answer_text") or _find(answers, "problem_number", problem_number, "answer")
    comment = _find(comments, "problem_number", problem_number, "comment") or _find(comments, "problem_number", problem_number, "comment_text")

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
