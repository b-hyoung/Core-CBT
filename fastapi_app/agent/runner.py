"""에이전트 메인 루프."""
import json
import logging
from ..config import get_settings
from ..constants.prompts import (
    ERROR_MESSAGES,
    PROMPT_VERSION,
    build_main_system_prompt,
)
from ..db.session_store import AgentSession, load_session, save_session
from ..tools.dispatch import dispatch_tool
from ..tools.question import get_question_detail, get_problem_tags
from .llm_client import get_llm_client, get_llm_model
from .schemas import TOOLS_SCHEMA

logger = logging.getLogger(__name__)


async def _create_fresh_session(user_email: str, source_session_id: str, problem_number: int) -> AgentSession:
    # 시스템 프롬프트에 문제 맥락 주입 — 카테고리 조회
    try:
        detail = await get_question_detail(source_session_id, problem_number)
        category = detail.get("category")
        subcategory = detail.get("subcategory")
    except Exception:  # noqa: BLE001
        category = None
        subcategory = None

    # 태그 데이터 로드 (유사 문제 생성 가이드용)
    problem_tags = get_problem_tags(source_session_id, problem_number)

    system_prompt = build_main_system_prompt(
        source_session_id=source_session_id,
        problem_number=problem_number,
        category=category or "unknown",
        subcategory=subcategory,
        problem_tags=problem_tags,
    )
    session = AgentSession(
        user_email=user_email,
        source_session_id=source_session_id,
        problem_number=problem_number,
        category=category,
        subcategory=subcategory,
        messages=[{"role": "system", "content": system_prompt}],
        prompt_version=PROMPT_VERSION,
    )
    return session


async def run_agent(
    user_email: str,
    source_session_id: str,
    problem_number: int,
    user_message: str,
) -> dict:
    settings = get_settings()
    client = get_llm_client()
    model = get_llm_model()
    max_iter = settings.agent_max_iterations

    # 1) 세션 로드 or 생성
    session = await load_session(user_email, source_session_id, problem_number)
    if session is None:
        session = await _create_fresh_session(user_email, source_session_id, problem_number)

    session.messages.append({"role": "user", "content": user_message})

    ui_actions: list = []
    final_reply: str = ""
    hit_max_iter = True

    for _ in range(max_iter):
        resp = await client.chat.completions.create(
            model=model,
            messages=session.messages,
            tools=TOOLS_SCHEMA,
            tool_choice="auto",
        )
        msg = resp.choices[0].message
        session.messages.append(msg.model_dump())

        if not msg.tool_calls:
            final_reply = msg.content or ""
            hit_max_iter = False
            break

        for tc in msg.tool_calls:
            result = await dispatch_tool(tc, user_email, session, ui_actions)
            session.messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result, ensure_ascii=False),
            })
            session.tools_called.append(tc.function.name)

    if hit_max_iter:
        final_reply = ERROR_MESSAGES["MAX_ITER_REACHED"]
        session.messages.append({"role": "assistant", "content": final_reply})

    session.turn_count += 1

    try:
        await save_session(session)
    except Exception as e:  # noqa: BLE001
        logger.error("save_session failed: %s", e, exc_info=True)

    return {
        "reply": final_reply,
        "ui_actions": ui_actions,
        "turn_count": session.turn_count,
    }
