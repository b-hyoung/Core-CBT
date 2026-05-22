"""get_user_wrong_history 유닛 테스트.

lib/userProblemsStore.js 의 2-pass latest-wins 로직을 파이썬 포팅.
이벤트 정렬은 최신이 먼저 (timestamp desc) — 그 상태에서 첫 등장이 '최신'.
"""
import pytest
from fastapi_app.tools.user_history import (
    reduce_wrong_history_from_events,
)


def _event(timestamp: str, outcomes: list[dict]) -> dict:
    return {
        "type": "finish_exam",
        "timestamp": timestamp,
        "payload": {"problemOutcomes": outcomes},
    }


def test_returns_empty_when_no_events():
    result = reduce_wrong_history_from_events([], source_session_id="2024-first", problem_number=1)
    assert result == {"total_attempts": 0, "wrong_count": 0, "recent_submissions": []}


def test_counts_all_attempts_but_only_wrong_latest():
    # 이벤트는 timestamp desc 순 (최신이 먼저)
    events = [
        _event("2026-04-10", [
            {"sessionId": "2024-first", "problemNumber": 1, "isCorrect": True, "submitted": "1"},
        ]),
        _event("2026-04-05", [
            {"sessionId": "2024-first", "problemNumber": 1, "isCorrect": False, "submitted": "3"},
        ]),
    ]
    result = reduce_wrong_history_from_events(events, "2024-first", 1)
    # 최신이 정답이면 wrong 리스트에서 제외
    assert result["total_attempts"] == 2
    assert result["wrong_count"] == 0


def test_wrong_latest_is_included():
    events = [
        _event("2026-04-10", [
            {"sessionId": "2024-first", "problemNumber": 1, "isCorrect": False, "submitted": "3"},
        ]),
        _event("2026-04-05", [
            {"sessionId": "2024-first", "problemNumber": 1, "isCorrect": False, "submitted": "2"},
        ]),
    ]
    result = reduce_wrong_history_from_events(events, "2024-first", 1)
    assert result["total_attempts"] == 2
    assert result["wrong_count"] == 1
    # 최신 제출이 먼저 (모든 attempts, 최신부터 정렬)
    assert result["recent_submissions"][0]["submitted"] == "3"
    assert result["recent_submissions"][1]["submitted"] == "2"


def test_other_problems_ignored():
    events = [
        _event("2026-04-10", [
            {"sessionId": "2024-first", "problemNumber": 2, "isCorrect": False, "submitted": "x"},
            {"sessionId": "2024-second", "problemNumber": 1, "isCorrect": False, "submitted": "y"},
        ]),
    ]
    result = reduce_wrong_history_from_events(events, "2024-first", 1)
    assert result["total_attempts"] == 0


def test_unknown_is_not_counted_as_wrong():
    events = [
        _event("2026-04-10", [
            {"sessionId": "2024-first", "problemNumber": 1, "isUnknown": True, "submitted": ""},
        ]),
    ]
    result = reduce_wrong_history_from_events(events, "2024-first", 1)
    assert result["total_attempts"] == 1
    assert result["wrong_count"] == 0
