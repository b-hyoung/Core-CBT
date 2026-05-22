"""get_user_wrong_history / get_user_topic_stats 툴.

analytics_events 테이블을 스캔해 특정 유저의 오답 이력을 재구성한다.
lib/userProblemsStore.js 의 "2-pass latest-wins" 규칙을 파이썬 포팅:
  1) 키(sessionId, problemNumber)별 최신 outcome 만 선택
  2) 최신이 정답이거나 '모름'이면 wrong_count 에서 제외
"""
from typing import Any
from urllib.parse import quote
from ..config import get_settings
from ..db.supabase_client import build_rest_url, get_json


async def fetch_user_finish_events(user_email: str) -> list[dict]:
    """analytics_events 에서 이 유저의 finish_exam 이벤트 전부 timestamp desc."""
    settings = get_settings()
    url = build_rest_url(settings.supabase_url, settings.supabase_events_table)
    contains_filter = f'{{"__meta":{{"userEmail":"{user_email}"}}}}'
    params = {
        "select": "payload,timestamp",
        "type": "eq.finish_exam",
        "payload": f"cs.{contains_filter}",
        "order": "timestamp.desc",
    }
    # Supabase Range 헤더 페이지네이션 (최대 1000/batch)
    all_events: list[dict] = []
    page_size = 1000
    start = 0
    while True:
        end = start + page_size - 1
        headers = {"Range": f"{start}-{end}", "Range-Unit": "items"}
        batch = await get_json(url, params=params, extra_headers=headers)
        if not batch:
            break
        all_events.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size
    return all_events


def reduce_wrong_history_from_events(
    events: list[dict],
    source_session_id: str,
    problem_number: int,
) -> dict:
    """events는 timestamp desc 순이어야 함 (최신이 먼저)."""
    all_for_problem: list[dict] = []
    latest_outcome_for_key: dict[tuple[str, int], dict] = {}

    for ev in events:
        outcomes = (ev.get("payload") or {}).get("problemOutcomes") or []
        for o in outcomes:
            sid = str(o.get("sessionId") or "").strip()
            pnum = o.get("problemNumber")
            if not isinstance(pnum, (int, float)):
                continue
            pnum = int(pnum)
            if sid != source_session_id or pnum != problem_number:
                continue
            key = (sid, pnum)
            all_for_problem.append({
                "submitted": str(o.get("submitted") or o.get("selected") or ""),
                "timestamp": ev.get("timestamp"),
                "isCorrect": bool(o.get("isCorrect")),
                "isUnknown": bool(o.get("isUnknown")),
            })
            if key not in latest_outcome_for_key:
                latest_outcome_for_key[key] = o

    latest = latest_outcome_for_key.get((source_session_id, problem_number))
    is_wrong_latest = bool(latest) and not latest.get("isCorrect") and not latest.get("isUnknown")

    return {
        "total_attempts": len(all_for_problem),
        "wrong_count": 1 if is_wrong_latest else 0,
        "recent_submissions": all_for_problem[:5],  # 최근 5개
    }


async def get_user_wrong_history(
    user_email: str,
    source_session_id: str,
    problem_number: int,
) -> dict:
    events = await fetch_user_finish_events(user_email)
    return reduce_wrong_history_from_events(events, source_session_id, problem_number)


# ---------------------------------------------------------------------------
# get_user_topic_stats
# ---------------------------------------------------------------------------
import json as _json
from pathlib import Path as _Path


def _empty_slot() -> dict:
    return {"total": 0, "correct": 0, "accuracy": 0.0}


def _finalize_slot(slot: dict) -> dict:
    total = slot["total"]
    correct = slot["correct"]
    return {
        "total": total,
        "correct": correct,
        "accuracy": (correct / total) if total else 0.0,
    }


def aggregate_topic_stats(
    events: list[dict],
    tags_by_key: dict[tuple[str, int], tuple[str, str | None]],
) -> dict:
    """(events, tags) → 카테고리·서브카테고리별 정답률 집계.

    tags_by_key: 문제별 (category, subcategory) 정보.
    events 는 timestamp desc 순이어야 최신 우선 적용됨.
    """
    latest_for_key: dict[tuple[str, int], dict] = {}
    for ev in events:
        outcomes = (ev.get("payload") or {}).get("problemOutcomes") or []
        for o in outcomes:
            sid = str(o.get("sessionId") or "").strip()
            pnum = o.get("problemNumber")
            if not sid or not isinstance(pnum, (int, float)):
                continue
            key = (sid, int(pnum))
            if key in latest_for_key:
                continue  # events desc → 먼저 본 게 최신
            latest_for_key[key] = o

    # 초기 슬롯
    code_subs = {lang: _empty_slot() for lang in ("Java", "C", "Python")}
    theory_subs = {sub: _empty_slot() for sub in ("네트워크", "보안", "소프트웨어공학")}
    result: dict[str, dict] = {
        "SQL": _empty_slot(),
        "Code": {"_total": _empty_slot(), **code_subs},
        "이론": {"_total": _empty_slot(), **theory_subs},
    }

    for key, o in latest_for_key.items():
        tags = tags_by_key.get(key)
        if not tags:
            continue
        category, subcategory = tags
        is_correct = bool(o.get("isCorrect"))

        if category == "SQL":
            slot = result["SQL"]
            slot["total"] += 1
            slot["correct"] += int(is_correct)
        elif category == "Code":
            result["Code"]["_total"]["total"] += 1
            result["Code"]["_total"]["correct"] += int(is_correct)
            if subcategory in result["Code"]:
                result["Code"][subcategory]["total"] += 1
                result["Code"][subcategory]["correct"] += int(is_correct)
        elif category == "이론":
            result["이론"]["_total"]["total"] += 1
            result["이론"]["_total"]["correct"] += int(is_correct)
            if subcategory in result["이론"]:
                result["이론"][subcategory]["total"] += 1
                result["이론"][subcategory]["correct"] += int(is_correct)

    # accuracy 계산
    result["SQL"] = _finalize_slot(result["SQL"])
    for parent in ("Code", "이론"):
        result[parent] = {k: _finalize_slot(v) for k, v in result[parent].items()}
    return result


def _load_all_tags() -> dict[tuple[str, int], tuple[str, str | None]]:
    """datasets/practicalIndustrial/*/problem1.json 에서 태그 수집."""
    settings = get_settings()
    root = _Path(settings.datasets_root)
    if not root.exists():
        return {}
    tags: dict[tuple[str, int], tuple[str, str | None]] = {}
    for session_dir in root.iterdir():
        if not session_dir.is_dir():
            continue
        problem_file = session_dir / "problem1.json"
        if not problem_file.exists():
            continue
        try:
            data = _json.loads(problem_file.read_text(encoding="utf-8"))
        except (_json.JSONDecodeError, OSError):
            continue
        problems = data[0]["problems"] if data else []
        for p in problems:
            pnum = p.get("problem_number")
            category = p.get("category")
            subcategory = p.get("subcategory")
            if isinstance(pnum, int) and category:
                tags[(session_dir.name, pnum)] = (category, subcategory)
    return tags


async def get_user_topic_stats(user_email: str, category: str | None = None) -> dict:
    events = await fetch_user_finish_events(user_email)
    tags = _load_all_tags()
    full = aggregate_topic_stats(events, tags)
    if category:
        return {category: full.get(category, {})}
    return full
