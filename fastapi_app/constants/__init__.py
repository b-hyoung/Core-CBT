"""
상수 중앙 관리 패키지.

prompts.py: LLM 시스템/역할 프롬프트
errors.py:  유저용 에러 메시지 (구현 시 추가)
limits.py:  MAX_ITER, MAX_TOKENS 등 (구현 시 추가)
"""

from .prompts import (
    PROMPT_VERSION,
    MAIN_TUTOR_SYSTEM_PROMPT,
    CRITIC_SYSTEM_PROMPT,
    SELF_REFLECTION_PROMPT,
    ERROR_MESSAGES,
    build_main_system_prompt,
)

__all__ = [
    "PROMPT_VERSION",
    "MAIN_TUTOR_SYSTEM_PROMPT",
    "CRITIC_SYSTEM_PROMPT",
    "SELF_REFLECTION_PROMPT",
    "ERROR_MESSAGES",
    "build_main_system_prompt",
]
