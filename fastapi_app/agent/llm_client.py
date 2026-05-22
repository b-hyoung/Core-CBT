"""LLM 클라이언트 팩토리.

OpenAI SDK의 AsyncOpenAI 는 base_url 만 교체하면
Ollama/vLLM/LMStudio 같은 로컬 서버에도 그대로 붙는다
(모두 OpenAI chat completions API 호환).

V1에서 OpenAI, V2 실험에서 gpt-oss-20b 로 쉽게 전환.
"""
from functools import lru_cache
from openai import AsyncOpenAI
from ..config import get_settings


@lru_cache
def get_llm_client() -> AsyncOpenAI:
    settings = get_settings()
    return AsyncOpenAI(
        api_key=settings.openai_api_key or "unused-for-local",
        base_url=settings.llm_base_url,
    )


def get_llm_model() -> str:
    return get_settings().llm_model
