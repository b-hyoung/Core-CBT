"""get_user_topic_stats 순수 집계 로직 테스트."""
from fastapi_app.tools.user_history import aggregate_topic_stats


def _outcome(sid: str, pnum: int, correct: bool, unknown: bool = False) -> dict:
    return {
        "sessionId": sid,
        "problemNumber": pnum,
        "isCorrect": correct,
        "isUnknown": unknown,
    }


def _tags(mapping: dict) -> dict:
    """{ (sid, pnum): (category, subcategory) } 형식."""
    return mapping


def test_returns_zero_when_no_data():
    result = aggregate_topic_stats([], {})
    assert result["SQL"]["total"] == 0
    assert result["Code"]["_total"]["total"] == 0
    assert result["이론"]["_total"]["total"] == 0


def test_aggregates_by_category():
    events = [
        {"payload": {"problemOutcomes": [
            _outcome("2024-first", 1, True),   # Code/C 정답
            _outcome("2024-first", 2, False),  # SQL 오답
        ]}, "timestamp": "2026-04-10"},
    ]
    tags = _tags({
        ("2024-first", 1): ("Code", "C"),
        ("2024-first", 2): ("SQL", None),
    })
    result = aggregate_topic_stats(events, tags)

    assert result["Code"]["_total"] == {"total": 1, "correct": 1, "accuracy": 1.0}
    assert result["Code"]["C"] == {"total": 1, "correct": 1, "accuracy": 1.0}
    assert result["SQL"] == {"total": 1, "correct": 0, "accuracy": 0.0}


def test_latest_wins_for_duplicate_problem():
    # 같은 문제 두 번 풀었고 최신이 정답이면 correct 1
    events = [
        {"payload": {"problemOutcomes": [_outcome("2024-first", 1, True)]},  "timestamp": "2026-04-10"},
        {"payload": {"problemOutcomes": [_outcome("2024-first", 1, False)]}, "timestamp": "2026-04-01"},
    ]
    tags = _tags({("2024-first", 1): ("Code", "Java")})
    result = aggregate_topic_stats(events, tags)
    assert result["Code"]["_total"]["total"] == 1
    assert result["Code"]["_total"]["correct"] == 1
    assert result["Code"]["Java"]["accuracy"] == 1.0


def test_unknown_counted_as_attempt_but_not_correct():
    events = [{"payload": {"problemOutcomes": [
        _outcome("2024-first", 1, False, unknown=True),
    ]}, "timestamp": "2026-04-10"}]
    tags = _tags({("2024-first", 1): ("이론", "네트워크")})
    result = aggregate_topic_stats(events, tags)
    assert result["이론"]["_total"]["total"] == 1
    assert result["이론"]["_total"]["correct"] == 0
    assert result["이론"]["네트워크"]["accuracy"] == 0.0
