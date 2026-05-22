"""agent_sessions 테이블 CRUD.

메모리 상 AgentSession 데이터클래스 <-> Postgres 레코드 매핑.
"""
from dataclasses import dataclass, field
from typing import Any
from ..config import get_settings
from .supabase_client import build_rest_url, get_json, upsert


@dataclass
class AgentSession:
    user_email: str
    source_session_id: str
    problem_number: int
    category: str | None = None
    subcategory: str | None = None
    messages: list[dict] = field(default_factory=list)
    tools_called: list[str] = field(default_factory=list)
    turn_count: int = 0
    generated_problems: list[dict] = field(default_factory=list)
    user_evaluations: list[dict] = field(default_factory=list)
    prompt_version: str = "v1.0"


def serialize_for_upsert(s: AgentSession) -> dict[str, Any]:
    return {
        "user_email": s.user_email,
        "source_session_id": s.source_session_id,
        "problem_number": s.problem_number,
        "category": s.category,
        "subcategory": s.subcategory,
        "messages": s.messages,
        "tools_called": s.tools_called,
        "turn_count": s.turn_count,
        "generated_problems": s.generated_problems,
        "user_evaluations": s.user_evaluations,
        "prompt_version": s.prompt_version,
    }


def deserialize(row: dict[str, Any]) -> AgentSession:
    return AgentSession(
        user_email=row["user_email"],
        source_session_id=row["source_session_id"],
        problem_number=row["problem_number"],
        category=row.get("category"),
        subcategory=row.get("subcategory"),
        messages=row.get("messages") or [],
        tools_called=row.get("tools_called") or [],
        turn_count=row.get("turn_count") or 0,
        generated_problems=row.get("generated_problems") or [],
        user_evaluations=row.get("user_evaluations") or [],
        prompt_version=row.get("prompt_version") or "v1.0",
    )


async def load_session(user_email: str, source_session_id: str, problem_number: int) -> AgentSession | None:
    settings = get_settings()
    url = build_rest_url(settings.supabase_url, settings.supabase_agent_sessions_table)
    params = {
        "select": "*",
        "user_email": f"eq.{user_email}",
        "source_session_id": f"eq.{source_session_id}",
        "problem_number": f"eq.{problem_number}",
        "limit": "1",
    }
    rows = await get_json(url, params=params)
    if not rows:
        return None
    return deserialize(rows[0])


async def save_session(session: AgentSession) -> None:
    settings = get_settings()
    url = build_rest_url(settings.supabase_url, settings.supabase_agent_sessions_table)
    payload = serialize_for_upsert(session)
    await upsert(
        url,
        rows=[payload],
        on_conflict="user_email,source_session_id,problem_number",
    )


async def delete_session(user_email: str, source_session_id: str, problem_number: int) -> None:
    from .supabase_client import delete
    settings = get_settings()
    url = build_rest_url(settings.supabase_url, settings.supabase_agent_sessions_table)
    params = {
        "user_email": f"eq.{user_email}",
        "source_session_id": f"eq.{source_session_id}",
        "problem_number": f"eq.{problem_number}",
    }
    await delete(url, params=params)
