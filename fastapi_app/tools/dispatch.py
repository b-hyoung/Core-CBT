"""툴 호출 디스패치 — 보안 로직 중앙집중.

모든 툴 호출은 여기를 거침. 책임:
1. JSON 인자 파싱 실패 방어
2. 유저 스코프 툴에 user_email 강제 주입 (서버 세션 값으로 덮어씀)
3. 출력 툴은 UI 이벤트 생성 + 세션 상태 업데이트
4. Code 유사 문제는 실제 컴파일/실행으로 정답 검증 후 통과/거부
5. 예외를 {"error": ...} 로 변환하여 에이전트 루프가 복구할 수 있게
"""
import json
import logging
from typing import Any

from ..agent.schemas import USER_SCOPED_TOOLS, OUTPUT_TOOLS
from ..agent.llm_client import get_llm_client, get_llm_model
from ..constants.prompts import CRITIC_SYSTEM_PROMPT
from .question import get_question_detail
from .user_history import get_user_wrong_history, get_user_topic_stats
from .output_tools import handle_present_similar_problem, handle_submit_evaluation
from .code_executor import verify_answer

logger = logging.getLogger(__name__)


async def _critic_fallback(code: str, claimed_answer: str, language: str) -> dict:
    """컴파일러 실패 시 Critic AI로 정답 검증 (폴백).

    Returns:
        {"verified": True, "answer": "..."} 또는
        {"verified": False, "answer": "...", "reason": "..."}
    """
    user_msg = (
        f"[언어] {language}\n"
        f"[코드]\n{code}\n\n"
        f"[주장된 정답] {claimed_answer}\n\n"
        "위 코드를 한 줄씩 추적하여 실제 출력이 주장된 정답과 일치하는지 판단해."
    )
    try:
        client = get_llm_client()
        model = get_llm_model()
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": CRITIC_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0,
            max_tokens=200,
        )
        reply = (resp.choices[0].message.content or "").strip()
        logger.info("critic fallback reply: %s", reply)

        if reply.startswith("확인"):
            return {"verified": True, "answer": claimed_answer}
        if reply.startswith("틀림"):
            parts = reply.split(",", 1)
            correct = parts[0].replace("틀림:", "").replace("틀림", "").strip()
            reason = parts[1].replace("이유:", "").strip() if len(parts) > 1 else ""
            return {"verified": False, "answer": correct, "reason": reason}
        # 파싱 실패 → 원래 답 그대로 통과
        return {"verified": True, "answer": claimed_answer}
    except Exception as e:  # noqa: BLE001
        logger.warning("critic fallback failed: %s", e)
        return {"verified": True, "answer": claimed_answer}


def _normalize(text: str) -> str:
    """정답 비교용 정규화: 소문자·공백·구두점 제거."""
    import re
    return re.sub(r'[\s,/|().:：\-]+', '', str(text or '')).lower()


def _get_original_answer(session) -> str:
    """세션의 get_question_detail 결과에서 원래 정답 추출."""
    for msg in session.messages:
        if isinstance(msg, dict) and msg.get("role") == "tool":
            try:
                content = json.loads(msg.get("content", "{}"))
                if "answer" in content:
                    return _normalize(content["answer"])
            except (json.JSONDecodeError, TypeError):
                pass
    return ""


def _check_answer_duplicate(new_answer: str, session) -> str | None:
    """새 유사 문제 정답이 원래 문제 또는 이전 유사 문제와 겹치면 거부 메시지 반환."""
    if not new_answer:
        return None

    # 1. 원래 문제 정답과 완전 일치
    original = _get_original_answer(session)
    if original and new_answer == original:
        return ("REJECTED: 유사 문제의 정답이 원래 문제와 동일합니다. "
                "완전히 다른 SQL 키워드/값이 정답이 되도록 새로 설계해서 다시 호출하세요.")

    # 2. 이전 유사 문제 정답과 유사도 체크 (개별 답 항목 50% 이상 겹치면 거부)
    for prev in session.generated_problems:
        prev_answer = _normalize(prev.get("expected_answer", ""))
        if not prev_answer:
            continue
        if new_answer == prev_answer:
            return ("REJECTED: 이전에 낸 유사 문제와 정답이 동일합니다. "
                    "각 빈칸의 키워드를 모두 다르게 바꿔서 다시 만들어주세요.")
        # 개별 키워드 비교
        new_parts = set(new_answer.replace(":", "").split())
        prev_parts = set(prev_answer.replace(":", "").split())
        if new_parts and prev_parts:
            overlap = len(new_parts & prev_parts) / max(len(new_parts), len(prev_parts))
            if overlap >= 0.5:
                diff_needed = prev_parts - new_parts
                return (f"REJECTED: 이전 유사 문제와 정답이 너무 비슷합니다 (겹침: {new_parts & prev_parts}). "
                        f"각 빈칸마다 완전히 다른 SQL 키워드를 사용하세요.")

    return None


async def dispatch_tool(tool_call, user_email: str, session, ui_actions: list) -> dict[str, Any]:
    name = tool_call.function.name
    raw_args = tool_call.function.arguments

    try:
        args = json.loads(raw_args) if raw_args else {}
    except json.JSONDecodeError as e:
        logger.warning("invalid JSON args for %s: %s", name, e)
        return {"error": f"invalid tool arguments JSON: {e}"}

    # 보안: 유저 스코프 툴은 user_email 덮어씀
    if name in USER_SCOPED_TOOLS:
        args["user_email"] = user_email

    try:
        if name == "get_question_detail":
            return await get_question_detail(
                source_session_id=args["source_session_id"],
                problem_number=int(args["problem_number"]),
            )
        if name == "get_user_wrong_history":
            return await get_user_wrong_history(
                user_email=args["user_email"],
                source_session_id=args["source_session_id"],
                problem_number=int(args["problem_number"]),
            )
        if name == "get_user_topic_stats":
            return await get_user_topic_stats(
                user_email=args["user_email"],
                category=args.get("category"),
            )
        if name == "present_similar_problem":
            # 1. 정답 중복 거부: 원래 문제 + 이전 유사 문제 정답과 비교
            new_answer = _normalize(args.get("expected_answer", ""))
            reject_reason = _check_answer_duplicate(new_answer, session)
            if reject_reason:
                return {"error": reject_reason}

            # 2. 정답 검증 체인
            #    Code/SQL: 1차 실행 검증 → 2차 Critic AI → 3차 원래 답 통과
            #    이론: 실행 불가 → 바로 Critic AI → 원래 답 통과
            category = args.get("category")
            if category in ("Code", "SQL") and args.get("examples"):
                code = args["examples"]
                language = args.get("language", "C") if category == "Code" else "SQL"
                original_answer = args.get("expected_answer", "")

                verify_result = verify_answer(code, language, original_answer)
                if verify_result["verified"]:
                    # 1차 통과: 컴파일러 확인 완료
                    pass
                elif not verify_result.get("error"):
                    # 1차: 실행은 됐지만 정답 불일치 → 실제 출력으로 자동 교체
                    actual = verify_result.get("actual_output", "")
                    logger.info(
                        "auto-corrected answer: '%s' -> '%s'",
                        original_answer, actual,
                    )
                    args["expected_answer"] = actual
                else:
                    # 1차 실패(컴파일/실행 에러) → 2차: Critic AI 폴백
                    logger.warning(
                        "compiler failed, falling back to critic: %s",
                        verify_result.get("error", ""),
                    )
                    critic_result = await _critic_fallback(code, original_answer, language)
                    if not critic_result["verified"]:
                        # Critic이 정답 수정
                        logger.info(
                            "critic corrected answer: '%s' -> '%s'",
                            original_answer, critic_result["answer"],
                        )
                        args["expected_answer"] = critic_result["answer"]
                    # Critic도 실패하면 원래 답 그대로 통과 (3차)
                    logger.info(
                        "verification chain: compiler=%s, critic=%s, final_answer='%s'",
                        "fail", "verified" if critic_result["verified"] else "corrected",
                        args["expected_answer"],
                    )

            # 이론 카테고리: 실행 검증 불가 → Critic AI로 정답 검증
            if category not in ("Code", "SQL") and args.get("expected_answer"):
                original_answer = args.get("expected_answer", "")
                critic_result = await _critic_fallback(
                    code=f"문제: {args.get('question_text', '')}\n보기/예시: {args.get('examples', '')}",
                    claimed_answer=original_answer,
                    language="이론",
                )
                if not critic_result["verified"]:
                    logger.info(
                        "theory critic corrected: '%s' -> '%s'",
                        original_answer, critic_result["answer"],
                    )
                    args["expected_answer"] = critic_result["answer"]

            return handle_present_similar_problem(args, session, ui_actions)
        if name == "submit_evaluation":
            return handle_submit_evaluation(args, session, ui_actions)

        return {"error": f"unknown tool: {name}"}

    except Exception as e:  # noqa: BLE001
        logger.warning("tool %s failed: %s", name, e, exc_info=True)
        return {"error": str(e)[:200]}
