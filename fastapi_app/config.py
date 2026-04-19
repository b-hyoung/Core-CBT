"""환경변수 기반 전역 설정."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # LLM
    openai_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_events_table: str = "analytics_events"
    supabase_problem_outcomes_table: str = "problem_outcomes"
    supabase_agent_sessions_table: str = "agent_sessions"

    # Internal auth
    internal_shared_secret: str = ""

    # Datasets (FastAPI가 읽을 문제 JSON 루트)
    datasets_root: str = "../datasets/practicalIndustrial"

    # Agent
    agent_max_iterations: int = 5
    agent_rate_limit_per_hour: int = 20

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
