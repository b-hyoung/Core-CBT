"""llm_client 유닛 테스트: 환경변수 기반 공급자 교체."""
from fastapi_app.agent.llm_client import get_llm_client, get_llm_model


def test_default_uses_openai(monkeypatch):
    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    monkeypatch.delenv("LLM_MODEL", raising=False)
    from fastapi_app.config import get_settings
    get_settings.cache_clear()
    get_llm_client.cache_clear()

    client = get_llm_client()
    assert "openai.com" in str(client.base_url)
    assert get_llm_model() == "gpt-4o-mini"


def test_custom_base_url_honored(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://localhost:11434/v1")
    monkeypatch.setenv("LLM_MODEL", "gpt-oss:20b")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()
    get_llm_client.cache_clear()

    client = get_llm_client()
    assert "localhost:11434" in str(client.base_url)
    assert get_llm_model() == "gpt-oss:20b"
