# AI Tutor Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core-CBT 실기 오답 복습용 AI 학습 튜터 에이전트를 구현한다. 유저는 `/practical` 회차 선택 화면에서 "코치 에이전트" 카드로 진입해 카테고리별 정답률 → 틀린 문제 리스트 → 문제별 챗봇 대화로 이어지는 4단계 위저드를 사용한다. 챗봇은 문제 해설·오답 이력 조회·유사 문제 생성·채점을 수행한다.

**Architecture:** Next.js(기존) + FastAPI(신규 별도 서버) + Supabase Postgres. Next.js가 next-auth로 인증 후 shared secret으로 FastAPI 호출. FastAPI는 OpenAI-compatible 클라이언트(`LLM_BASE_URL` 교체 가능)로 GPT-4o-mini를 부르고 raw Function Calling 루프(최대 5회)로 툴 5개를 조합. 세션은 Postgres `agent_sessions` 테이블에 영구 보관.

**Tech Stack:**
- Backend: FastAPI, pytest, httpx, openai (Python SDK), supabase-py or direct REST
- Frontend: Next.js 16 App Router (기존), React 19, lucide-react, recharts
- DB: Supabase Postgres (기존 `analytics_events`, `problem_outcomes` + 신규 `agent_sessions`)
- LLM: OpenAI GPT-4o-mini (V1), 환경변수로 로컬 gpt-oss-20b 교체 가능
- 참조 설계서: [docs/superpowers/specs/2026-04-19-ai-tutor-agent-design.md](../specs/2026-04-19-ai-tutor-agent-design.md)

**Phase 구조 (총 6 Phase, 약 40 tasks):**
1. Backend 스캐폴드 & 인증 (Task 1-7)
2. Agent 툴 & Runner (Task 8-19)
3. Next.js 코치 위저드 UI (Task 20-26)
4. AgentChat 컴포넌트 (Task 27-33)
5. Agent 프록시 라우트 & E2E (Task 34-37)
6. 폴리싱 (Task 38-40)

**Important conventions:**
- 모든 파일 경로는 프로젝트 루트 `c:\Users\ACE\Desktop\bobs_project\Core-CBT\` 기준
- 커밋 메시지: `<type>(<scope>): <한 줄 설명>` 형식. type은 `feat`/`fix`/`test`/`refactor`/`chore`/`docs` 중 하나
- 각 커밋은 Co-Authored-By 라인 포함
- TDD: 실패하는 테스트 먼저 → 최소 구현 → 통과 확인 → 커밋
- 브랜치: `feat/agent` (이미 생성됨)

---

## Phase 1: Backend 스캐폴드 & 인증

FastAPI 프로젝트 구조 잡고, Supabase 연결·shared secret 인증·LLM 클라이언트까지 준비. 아직 실제 에이전트 로직은 없고, `/chat` 은 echo 수준.

### Task 1: FastAPI 프로젝트 스캐폴드 & requirements

**Files:**
- Create: `fastapi_app/main.py`
- Create: `fastapi_app/config.py`
- Create: `fastapi_app/__init__.py`
- Create: `fastapi_app/requirements.txt`
- Create: `fastapi_app/.env.example`
- Create: `fastapi_app/README.md`

- [ ] **Step 1: Create requirements.txt**

Write `fastapi_app/requirements.txt`:
```
fastapi==0.115.0
uvicorn[standard]==0.30.6
openai==1.54.0
httpx==0.27.2
pydantic==2.9.2
pydantic-settings==2.6.0
python-dotenv==1.0.1
pytest==8.3.3
pytest-asyncio==0.24.0
```

- [ ] **Step 2: Create config.py**

Write `fastapi_app/config.py`:
```python
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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 3: Create main.py with /health endpoint**

Write `fastapi_app/main.py`:
```python
"""FastAPI 앱 엔트리포인트."""
from fastapi import FastAPI
from .config import get_settings

app = FastAPI(title="Core-CBT Agent API", version="0.1.0")


@app.get("/health")
async def health():
    settings = get_settings()
    return {
        "status": "ok",
        "llm_model": settings.llm_model,
        "llm_base_url": settings.llm_base_url,
    }
```

- [ ] **Step 4: Create __init__.py (empty)**

Write `fastapi_app/__init__.py`:
```python
```

- [ ] **Step 5: Create .env.example**

Write `fastapi_app/.env.example`:
```
# OpenAI
OPENAI_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Internal auth (Next.js↔FastAPI)
INTERNAL_SHARED_SECRET=generate-a-long-random-string-here

# Datasets path (상대/절대 모두 가능)
DATASETS_ROOT=../datasets/practicalIndustrial

# Agent limits
AGENT_MAX_ITERATIONS=5
AGENT_RATE_LIMIT_PER_HOUR=20
```

- [ ] **Step 6: Create README.md**

Write `fastapi_app/README.md`:
````markdown
# Core-CBT Agent API (FastAPI)

## 로컬 개발 실행

```bash
cd fastapi_app
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env  # 값 채우기
uvicorn main:app --reload --port 8001
```

헬스체크:
```bash
curl http://localhost:8001/health
```

## 테스트

```bash
pytest
```

## 환경변수 교체로 로컬 LLM 사용

```bash
LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=gpt-oss:20b uvicorn main:app --reload --port 8001
```
````

- [ ] **Step 7: Verify import works**

Run:
```bash
cd fastapi_app && python -c "from main import app; print(app.title)"
```
Expected output: `Core-CBT Agent API`

- [ ] **Step 8: Add fastapi_app to root .gitignore**

Read `.gitignore`. If it does not include a Python venv rule, append:
```
# FastAPI
fastapi_app/.venv/
fastapi_app/.env
fastapi_app/__pycache__/
fastapi_app/**/__pycache__/
fastapi_app/.pytest_cache/
```

- [ ] **Step 9: Commit**

```bash
git add fastapi_app/main.py fastapi_app/config.py fastapi_app/__init__.py fastapi_app/requirements.txt fastapi_app/.env.example fastapi_app/README.md .gitignore
git commit -m "$(cat <<'EOF'
feat(agent-api): FastAPI 스캐폴드 + config + /health

- config.py: pydantic-settings 기반 환경변수 로드
- main.py: /health 엔드포인트
- .env.example, README.md, requirements.txt

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Supabase 마이그레이션 — agent_sessions 테이블

**Files:**
- Create: `supabase/migrations/20260419000001_add_agent_sessions.sql`

- [ ] **Step 1: Write migration SQL**

Write `supabase/migrations/20260419000001_add_agent_sessions.sql`:
```sql
-- Core-CBT AI 학습 튜터 에이전트 세션 저장 테이블
-- 설계 참조: docs/superpowers/specs/2026-04-19-ai-tutor-agent-design.md §4.1

CREATE TABLE IF NOT EXISTS agent_sessions (
  id                  BIGSERIAL PRIMARY KEY,
  user_email          TEXT        NOT NULL,
  source_session_id   TEXT        NOT NULL,
  problem_number      INT         NOT NULL,
  category            TEXT,
  subcategory         TEXT,
  messages            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  tools_called        TEXT[]      NOT NULL DEFAULT '{}',
  turn_count          INT         NOT NULL DEFAULT 0,
  generated_problems  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  user_evaluations    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  prompt_version      TEXT        NOT NULL DEFAULT 'v1.0',
  quality_flag        TEXT,
  quality_note        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agent_sessions_unique UNIQUE (user_email, source_session_id, problem_number)
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user
  ON agent_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_problem
  ON agent_sessions(source_session_id, problem_number);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_category
  ON agent_sessions(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_updated
  ON agent_sessions(updated_at DESC);

-- RLS: 유저는 자신의 대화만 접근 가능
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_sessions_own ON agent_sessions;
CREATE POLICY agent_sessions_own ON agent_sessions
  FOR ALL
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

COMMENT ON TABLE agent_sessions IS 'AI 학습 튜터 에이전트 대화 세션 (per user × source_session × problem)';
COMMENT ON COLUMN agent_sessions.messages IS 'OpenAI chat completions 메시지 배열 (system/user/assistant/tool)';
COMMENT ON COLUMN agent_sessions.generated_problems IS 'present_similar_problem으로 생성한 문제들 (expected_answer 포함, 서버 전용)';
COMMENT ON COLUMN agent_sessions.user_evaluations IS 'submit_evaluation 결과 누적';
COMMENT ON COLUMN agent_sessions.quality_flag IS 'V2 파인튜닝용 수동 태그: good|bad|NULL';
```

- [ ] **Step 2: Apply migration to Supabase**

This is a manual step — the plan does not auto-apply. Options:
- Supabase Studio SQL 에디터에 위 SQL 복붙 후 실행
- 또는 `supabase db push` (Supabase CLI가 있다면)

검증 쿼리 (Studio에서 실행):
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'agent_sessions'
ORDER BY ordinal_position;
```
Expected: 16개 컬럼이 출력됨 (id, user_email, source_session_id, ..., updated_at)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260419000001_add_agent_sessions.sql
git commit -m "$(cat <<'EOF'
feat(db): agent_sessions 테이블 마이그레이션 추가

- 유저×문제별 UNIQUE, JSONB messages/generated_problems/user_evaluations
- RLS: 자신의 email 대화만 접근 가능
- V2 파인튜닝 대비 quality_flag/quality_note 필드

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Supabase REST 클라이언트 헬퍼

**Files:**
- Create: `fastapi_app/db/__init__.py`
- Create: `fastapi_app/db/supabase_client.py`
- Create: `fastapi_app/tests/__init__.py`
- Create: `fastapi_app/tests/test_supabase_client.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/__init__.py`:
```python
```

Write `fastapi_app/tests/test_supabase_client.py`:
```python
"""supabase_client 유닛 테스트 (실제 네트워크 X, URL·헤더 조립만 검증)."""
import pytest
from fastapi_app.db.supabase_client import build_headers, build_rest_url


def test_build_headers_contains_required_keys():
    headers = build_headers(service_role_key="test-key")
    assert headers["apikey"] == "test-key"
    assert headers["Authorization"] == "Bearer test-key"
    assert headers["Content-Type"] == "application/json"


def test_build_rest_url_joins_correctly():
    url = build_rest_url(base_url="https://xxx.supabase.co", table="analytics_events")
    assert url == "https://xxx.supabase.co/rest/v1/analytics_events"


def test_build_rest_url_strips_trailing_slash():
    url = build_rest_url(base_url="https://xxx.supabase.co/", table="foo")
    assert url == "https://xxx.supabase.co/rest/v1/foo"
```

- [ ] **Step 2: Run test (expect fail — module not found)**

```bash
cd fastapi_app && pytest tests/test_supabase_client.py -v
```
Expected: `ModuleNotFoundError: No module named 'fastapi_app.db'`

- [ ] **Step 3: Implement supabase_client.py**

Write `fastapi_app/db/__init__.py`:
```python
```

Write `fastapi_app/db/supabase_client.py`:
```python
"""Supabase PostgREST 호출 헬퍼.

설계: direct REST API 호출. supabase-py 대신 httpx로 얇게 감싸서
- 의존성 최소화
- URL·헤더 조립 로직 테스트 가능
- Range 헤더 페이지네이션 등 세밀 제어 가능
"""
from typing import Any
import httpx
from ..config import get_settings


def build_headers(service_role_key: str, *, prefer: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def build_rest_url(base_url: str, table: str) -> str:
    base = base_url.rstrip("/")
    return f"{base}/rest/v1/{table}"


async def get_json(url: str, *, params: dict[str, Any] | None = None, extra_headers: dict[str, str] | None = None) -> list[dict[str, Any]]:
    settings = get_settings()
    headers = build_headers(settings.supabase_service_role_key)
    if extra_headers:
        headers.update(extra_headers)
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=headers, params=params)
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []


async def upsert(url: str, *, rows: list[dict[str, Any]], on_conflict: str | None = None) -> list[dict[str, Any]]:
    settings = get_settings()
    headers = build_headers(settings.supabase_service_role_key, prefer="return=representation,resolution=merge-duplicates")
    params = {}
    if on_conflict:
        params["on_conflict"] = on_conflict
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, headers=headers, params=params, json=rows)
        resp.raise_for_status()
        return resp.json() or []


async def delete(url: str, *, params: dict[str, Any]) -> None:
    settings = get_settings()
    headers = build_headers(settings.supabase_service_role_key)
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(url, headers=headers, params=params)
        resp.raise_for_status()
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_supabase_client.py -v
```
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/db/ fastapi_app/tests/__init__.py fastapi_app/tests/test_supabase_client.py
git commit -m "$(cat <<'EOF'
feat(agent-api): Supabase REST 클라이언트 헬퍼 + URL/헤더 조립 테스트

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Shared secret 인증 미들웨어

**Files:**
- Create: `fastapi_app/auth/__init__.py`
- Create: `fastapi_app/auth/internal_auth.py`
- Create: `fastapi_app/tests/test_internal_auth.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_internal_auth.py`:
```python
"""internal_auth 유닛 테스트: shared secret 검증 + email 추출."""
import pytest
from fastapi import HTTPException
from fastapi_app.auth.internal_auth import verify_internal_request


class FakeRequest:
    def __init__(self, headers: dict[str, str]):
        self.headers = headers


def test_verify_internal_request_success(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "unit-test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()

    req = FakeRequest({
        "x-internal-auth": "unit-test-secret",
        "x-user-email": "user@example.com",
    })
    email = verify_internal_request(req)
    assert email == "user@example.com"


def test_verify_internal_request_missing_secret_raises_401(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "unit-test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()

    req = FakeRequest({"x-user-email": "user@example.com"})
    with pytest.raises(HTTPException) as excinfo:
        verify_internal_request(req)
    assert excinfo.value.status_code == 401


def test_verify_internal_request_wrong_secret_raises_401(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "unit-test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()

    req = FakeRequest({
        "x-internal-auth": "wrong",
        "x-user-email": "user@example.com",
    })
    with pytest.raises(HTTPException) as excinfo:
        verify_internal_request(req)
    assert excinfo.value.status_code == 401


def test_verify_internal_request_missing_email_raises_400(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "unit-test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()

    req = FakeRequest({"x-internal-auth": "unit-test-secret"})
    with pytest.raises(HTTPException) as excinfo:
        verify_internal_request(req)
    assert excinfo.value.status_code == 400
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_internal_auth.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement internal_auth.py**

Write `fastapi_app/auth/__init__.py`:
```python
```

Write `fastapi_app/auth/internal_auth.py`:
```python
"""Next.js ↔ FastAPI 서버간 인증.

경계 원칙:
- Next.js 서버만이 이 API를 호출해야 한다 (브라우저 직접 호출 X).
- Next.js는 next-auth 세션을 검증한 후 신뢰할 수 있는 email을
  X-User-Email 헤더에 실어 보낸다.
- X-Internal-Auth 헤더의 shared secret을 여기서 검증한다.
- FastAPI는 email을 "이미 검증된 신원"으로 신뢰한다.
"""
import secrets
from fastapi import HTTPException, Request
from ..config import get_settings


def verify_internal_request(request: Request) -> str:
    """shared secret 검증 + email 추출. 실패 시 HTTPException raise.

    Returns:
        검증된 user_email (소문자로 정규화).
    """
    settings = get_settings()

    provided_secret = request.headers.get("x-internal-auth", "")
    expected_secret = settings.internal_shared_secret
    if not expected_secret:
        raise HTTPException(status_code=500, detail="server misconfigured: INTERNAL_SHARED_SECRET unset")

    # 타이밍 공격 방지
    if not secrets.compare_digest(provided_secret, expected_secret):
        raise HTTPException(status_code=401, detail="invalid internal auth")

    email = (request.headers.get("x-user-email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="missing x-user-email header")

    return email
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_internal_auth.py -v
```
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/auth/ fastapi_app/tests/test_internal_auth.py
git commit -m "$(cat <<'EOF'
feat(agent-api): shared secret 인증 미들웨어 + 타이밍 공격 방지

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: LLM 클라이언트 팩토리 (OpenAI-compatible 추상화)

**Files:**
- Create: `fastapi_app/agent/__init__.py`
- Create: `fastapi_app/agent/llm_client.py`
- Create: `fastapi_app/tests/test_llm_client.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_llm_client.py`:
```python
"""llm_client 유닛 테스트: 환경변수 기반 공급자 교체."""
from fastapi_app.agent.llm_client import get_llm_client, get_llm_model


def test_default_uses_openai(monkeypatch):
    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    monkeypatch.delenv("LLM_MODEL", raising=False)
    from fastapi_app.config import get_settings
    get_settings.cache_clear()

    client = get_llm_client()
    assert "openai.com" in str(client.base_url)
    assert get_llm_model() == "gpt-4o-mini"


def test_custom_base_url_honored(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://localhost:11434/v1")
    monkeypatch.setenv("LLM_MODEL", "gpt-oss:20b")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()

    client = get_llm_client()
    assert "localhost:11434" in str(client.base_url)
    assert get_llm_model() == "gpt-oss:20b"
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_llm_client.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement llm_client.py**

Write `fastapi_app/agent/__init__.py`:
```python
```

Write `fastapi_app/agent/llm_client.py`:
```python
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
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_llm_client.py -v
```
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/agent/ fastapi_app/tests/test_llm_client.py
git commit -m "$(cat <<'EOF'
feat(agent-api): LLM 클라이언트 팩토리 (OpenAI/로컬 교체 가능)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: /chat echo 엔드포인트 (스켈레톤)

**Files:**
- Modify: `fastapi_app/main.py`
- Create: `fastapi_app/tests/test_chat_endpoint.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_chat_endpoint.py`:
```python
"""/chat 엔드포인트 echo 버전 테스트."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()
    from fastapi_app.main import app
    return TestClient(app)


def test_chat_echoes_message(client):
    resp = client.post(
        "/chat",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@example.com"},
        json={"source_session_id": "2024-first", "problem_number": 3, "message": "왜 틀렸어?"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"].startswith("[echo]")
    assert "왜 틀렸어?" in body["reply"]
    assert body["turn_count"] == 0
    assert body["ui_actions"] == []


def test_chat_rejects_without_secret(client):
    resp = client.post(
        "/chat",
        headers={"x-user-email": "u@example.com"},
        json={"source_session_id": "2024-first", "problem_number": 3, "message": "x"},
    )
    assert resp.status_code == 401


def test_chat_rejects_without_email(client):
    resp = client.post(
        "/chat",
        headers={"x-internal-auth": "test-secret"},
        json={"source_session_id": "2024-first", "problem_number": 3, "message": "x"},
    )
    assert resp.status_code == 400
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_chat_endpoint.py -v
```
Expected: 404 on first test (no /chat route yet)

- [ ] **Step 3: Add /chat echo to main.py**

Replace `fastapi_app/main.py` with:
```python
"""FastAPI 앱 엔트리포인트."""
from fastapi import Depends, FastAPI, Request
from pydantic import BaseModel, Field
from .config import get_settings
from .auth.internal_auth import verify_internal_request

app = FastAPI(title="Core-CBT Agent API", version="0.1.0")


class ChatRequest(BaseModel):
    source_session_id: str = Field(..., min_length=1)
    problem_number: int = Field(..., ge=1)
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    reply: str
    ui_actions: list[dict] = []
    turn_count: int = 0


@app.get("/health")
async def health():
    settings = get_settings()
    return {
        "status": "ok",
        "llm_model": settings.llm_model,
        "llm_base_url": settings.llm_base_url,
    }


def current_user_email(request: Request) -> str:
    return verify_internal_request(request)


@app.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user_email: str = Depends(current_user_email),
):
    # V1 Phase 1: echo only. Real implementation in Task 16.
    return ChatResponse(
        reply=f"[echo] {user_email} asked: {body.message}",
        ui_actions=[],
        turn_count=0,
    )
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_chat_endpoint.py -v
```
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/main.py fastapi_app/tests/test_chat_endpoint.py
git commit -m "$(cat <<'EOF'
feat(agent-api): /chat echo 엔드포인트 (스켈레톤)

- Pydantic 모델로 요청/응답 스키마 강제
- verify_internal_request 의존성으로 인증 + email 주입
- Phase 2에서 진짜 run_agent로 교체 예정

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 로컬 실행 스모크 테스트 (수동)

**Files:** 없음 (수동 검증)

- [ ] **Step 1: Local .env setup**

Copy and fill:
```bash
cp fastapi_app/.env.example fastapi_app/.env
```
Fill `INTERNAL_SHARED_SECRET=$(openssl rand -hex 32)` (or any random long string on Windows).

- [ ] **Step 2: Start server**

```bash
cd fastapi_app
uvicorn main:app --reload --port 8001
```

- [ ] **Step 3: Verify /health**

```bash
curl http://localhost:8001/health
```
Expected: `{"status":"ok","llm_model":"gpt-4o-mini","llm_base_url":"https://api.openai.com/v1"}`

- [ ] **Step 4: Verify /chat echo**

```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -H "x-internal-auth: <same secret as .env>" \
  -H "x-user-email: test@example.com" \
  -d '{"source_session_id":"2024-first","problem_number":3,"message":"hi"}'
```
Expected: `{"reply":"[echo] test@example.com asked: hi","ui_actions":[],"turn_count":0}`

- [ ] **Step 5: Stop server (Ctrl-C)**

No commit — this was manual verification only.

---

## Phase 2: Agent 툴 & Runner

5개 툴 구현, dispatch_tool 보안 로직, Postgres 세션 저장, run_agent 루프 완성, /chat 을 실제 에이전트로 연결.

Phase 2 의 세부 task 정의는 plan의 다음 파트로 이어집니다 — 파일 하나가 너무 커지지 않도록 분할 관리.

**Phase 2 예정 task 개요 (Task 8-19):**
- Task 8: TOOLS_SCHEMA 정의
- Task 9: get_question_detail 툴 구현 + 테스트
- Task 10: get_user_wrong_history 툴 (2-pass latest-wins)
- Task 11: get_user_topic_stats 툴
- Task 12: output tools (present/evaluate) 처리 + 테스트
- Task 13: dispatch_tool (user_email override, expected_answer 마스킹)
- Task 14: session_store CRUD (Postgres)
- Task 15: run_agent 루프 (LLM mocked)
- Task 16: /chat 실제 구현 (echo → run_agent)
- Task 17: /submit 엔드포인트
- Task 18: GET /session 엔드포인트
- Task 19: DELETE /session 엔드포인트

## Phase 3 예정 (Task 20-26): Next.js 코치 위저드 UI

- Task 20: lib/topicStatsStore.js (카테고리별 정답률 집계)
- Task 21: /api/user/topic-stats Next.js 라우트
- Task 22: lib/wrongProblemsStore.js (카테고리 필터 틀린 문제)
- Task 23: /api/user/wrong-problems Next.js 라우트
- Task 24: /practical/coach/page.js (카테고리 진단 화면)
- Task 25: /practical/coach/[category]/page.js (틀린 문제 리스트)
- Task 26: PracticalSelectionPageClient 코치 카드 추가

## Phase 4 예정 (Task 27-33): AgentChat 컴포넌트

- Task 27: AgentChat 상수 3종 (messages/config/index)
- Task 28: useAgentChat 훅
- Task 29: 기본 primitives (TextBubble, InputBox)
- Task 30: GeneratedProblemCard
- Task 31: EvaluationCard
- Task 32: MessageList + ChatWindow + FloatingButton
- Task 33: /practical/[sessionId] 에 AgentChat 마운트

## Phase 5 예정 (Task 34-37): Agent 프록시 라우트 & E2E

- Task 34: /api/agent/chat 프록시
- Task 35: /api/agent/submit 프록시
- Task 36: /api/agent/session/[sessionId]/[problemNumber] 프록시
- Task 37: 수동 E2E 검증 (회차 선택 → 코치 → 카테고리 → 문제 → 챗봇 → 생성 문제 풀이)

## Phase 6 예정 (Task 38-40): 폴리싱

- Task 38: 프롬프트 튜닝 (실사용 샘플 기반)
- Task 39: Rate limit + 구조화 로깅 + 토큰 사용량 기록
- Task 40: 보안 체크리스트 7항목 검증 및 문서화

---

---

## Phase 2: Agent 툴 & Runner

### Task 8: TOOLS_SCHEMA 정의

**Files:**
- Create: `fastapi_app/agent/schemas.py`
- Create: `fastapi_app/tests/test_schemas.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_schemas.py`:
```python
"""TOOLS_SCHEMA 구조 검증."""
from fastapi_app.agent.schemas import TOOLS_SCHEMA


def test_has_all_five_tools():
    names = [t["function"]["name"] for t in TOOLS_SCHEMA]
    assert set(names) == {
        "get_question_detail",
        "get_user_wrong_history",
        "get_user_topic_stats",
        "present_similar_problem",
        "submit_evaluation",
    }


def test_all_tools_use_function_type():
    for t in TOOLS_SCHEMA:
        assert t["type"] == "function"
        assert "name" in t["function"]
        assert "description" in t["function"]
        assert "parameters" in t["function"]


def test_user_scoped_tools_do_not_declare_user_email_param():
    # 보안: user_email은 LLM이 넘기지 못하게 스키마에서 빠져야 함
    for name in ("get_user_wrong_history", "get_user_topic_stats"):
        tool = next(t for t in TOOLS_SCHEMA if t["function"]["name"] == name)
        props = tool["function"]["parameters"].get("properties", {})
        assert "user_email" not in props


def test_present_similar_problem_has_expected_answer():
    tool = next(t for t in TOOLS_SCHEMA if t["function"]["name"] == "present_similar_problem")
    props = tool["function"]["parameters"]["properties"]
    assert "expected_answer" in props
    assert "confidence" in props
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_schemas.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement schemas.py**

Write `fastapi_app/agent/schemas.py`:
```python
"""OpenAI Function Calling 툴 스키마.

설계 §6 참조. 유저 스코프 툴은 user_email 을 스키마에서 배제하여
LLM 이 조작 시도 자체를 못 하게 한다 (서버가 dispatch_tool 에서 주입).
"""

_GET_QUESTION_DETAIL = {
    "type": "function",
    "function": {
        "name": "get_question_detail",
        "description": "정보처리산업기사 실기 특정 문제의 원문·예시 코드·정답·공식 해설·분류 태그 조회",
        "parameters": {
            "type": "object",
            "properties": {
                "source_session_id": {
                    "type": "string",
                    "description": "회차 키. 예: '2024-first', '2023-third'",
                },
                "problem_number": {
                    "type": "integer",
                    "description": "1-based 문제 번호",
                },
            },
            "required": ["source_session_id", "problem_number"],
        },
    },
}

_GET_USER_WRONG_HISTORY = {
    "type": "function",
    "function": {
        "name": "get_user_wrong_history",
        "description": "이 유저가 특정 문제를 몇 번 틀렸는지, 매번 뭘 제출했는지 조회",
        "parameters": {
            "type": "object",
            "properties": {
                "source_session_id": {"type": "string"},
                "problem_number": {"type": "integer"},
            },
            "required": ["source_session_id", "problem_number"],
        },
    },
}

_GET_USER_TOPIC_STATS = {
    "type": "function",
    "function": {
        "name": "get_user_topic_stats",
        "description": "이 유저의 카테고리/서브카테고리별 정답률. category 생략 시 전체 반환.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["SQL", "Code", "이론"],
                    "description": "필터할 카테고리. 생략하면 전체 반환.",
                }
            },
            "required": [],
        },
    },
}

_PRESENT_SIMILAR_PROBLEM = {
    "type": "function",
    "function": {
        "name": "present_similar_problem",
        "description": (
            "원 문제와 구조적으로 유사한 새 문제를 유저에게 제시한다. "
            "category 가 'SQL' 또는 'Code' 일 때만 호출 가능. '이론' 금지."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "question_text": {"type": "string", "description": "문제 설명문"},
                "examples": {"type": "string", "description": "코드 또는 SQL 스키마·데이터"},
                "expected_answer": {"type": "string", "description": "정답 (유저에겐 노출 X, 서버만 보관)"},
                "answer_explanation": {"type": "string", "description": "왜 그 답이 정답인지"},
                "category": {"type": "string", "enum": ["SQL", "Code"]},
                "language": {
                    "type": "string",
                    "enum": ["Java", "C", "Python"],
                    "description": "Code 카테고리일 때만 지정",
                },
                "input_type": {
                    "type": "string",
                    "enum": ["single", "multi_blank", "textarea"],
                },
                "confidence": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5,
                    "description": "정답 확신도 1(낮음)~5(높음). 계산 검증 후 평가.",
                },
            },
            "required": [
                "question_text",
                "examples",
                "expected_answer",
                "answer_explanation",
                "category",
                "input_type",
                "confidence",
            ],
        },
    },
}

_SUBMIT_EVALUATION = {
    "type": "function",
    "function": {
        "name": "submit_evaluation",
        "description": "유저가 제출한 답을 채점한 결과를 UI 에 표시",
        "parameters": {
            "type": "object",
            "properties": {
                "problem_id": {
                    "type": "string",
                    "description": "present_similar_problem 이 반환한 problem_id",
                },
                "correct": {"type": "boolean"},
                "reasoning": {"type": "string", "description": "정답/오답 이유 설명"},
            },
            "required": ["problem_id", "correct", "reasoning"],
        },
    },
}

TOOLS_SCHEMA = [
    _GET_QUESTION_DETAIL,
    _GET_USER_WRONG_HISTORY,
    _GET_USER_TOPIC_STATS,
    _PRESENT_SIMILAR_PROBLEM,
    _SUBMIT_EVALUATION,
]

TOOL_NAMES = {t["function"]["name"] for t in TOOLS_SCHEMA}
USER_SCOPED_TOOLS = {"get_user_wrong_history", "get_user_topic_stats"}
OUTPUT_TOOLS = {"present_similar_problem", "submit_evaluation"}
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_schemas.py -v
```
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/agent/schemas.py fastapi_app/tests/test_schemas.py
git commit -m "$(cat <<'EOF'
feat(agent-api): TOOLS_SCHEMA 5개 정의 + 스키마 구조 테스트

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: get_question_detail 툴 구현 + 테스트

**Files:**
- Create: `fastapi_app/tools/__init__.py`
- Create: `fastapi_app/tools/question.py`
- Create: `fastapi_app/tests/test_tool_question.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_tool_question.py`:
```python
"""get_question_detail 유닛 테스트."""
import json
import pytest
from fastapi_app.tools.question import get_question_detail


@pytest.fixture
def fake_datasets(tmp_path, monkeypatch):
    """datasets/practicalIndustrial/2024-first/{problem,answer,comment}.json 가짜 생성."""
    session_dir = tmp_path / "2024-first"
    session_dir.mkdir()
    (session_dir / "problem1.json").write_text(json.dumps([{
        "title": "정보처리산업기사 실기",
        "problems": [
            {
                "problem_number": 1,
                "question_text": "C언어 출력결과",
                "examples": "int main(){printf(\"%d\",1);}",
                "input_type": "single",
                "category": "Code",
                "subcategory": "C",
            },
            {
                "problem_number": 2,
                "question_text": "SQL 빈칸",
                "examples": "SELECT * FROM x",
                "input_type": "multi_blank",
                "category": "SQL",
            },
        ],
    }]), encoding="utf-8")
    (session_dir / "answer1.json").write_text(json.dumps([
        {"problem_number": 1, "answer": "1"},
        {"problem_number": 2, "answer": "FROM"},
    ]), encoding="utf-8")
    (session_dir / "comment1.json").write_text(json.dumps([
        {"problem_number": 1, "comment": "printf가 1 출력"},
        {"problem_number": 2, "comment": "FROM 키워드"},
    ]), encoding="utf-8")

    monkeypatch.setenv("DATASETS_ROOT", str(tmp_path))
    from fastapi_app.config import get_settings
    get_settings.cache_clear()
    return tmp_path


@pytest.mark.asyncio
async def test_get_question_detail_loads_code_problem(fake_datasets):
    result = await get_question_detail("2024-first", 1)
    assert result["problem_number"] == 1
    assert result["question_text"] == "C언어 출력결과"
    assert result["answer"] == "1"
    assert result["explanation"] == "printf가 1 출력"
    assert result["category"] == "Code"
    assert result["subcategory"] == "C"


@pytest.mark.asyncio
async def test_get_question_detail_loads_sql_problem_without_subcategory(fake_datasets):
    result = await get_question_detail("2024-first", 2)
    assert result["category"] == "SQL"
    assert result.get("subcategory") is None


@pytest.mark.asyncio
async def test_get_question_detail_raises_for_missing_session(fake_datasets):
    with pytest.raises(FileNotFoundError):
        await get_question_detail("9999-first", 1)


@pytest.mark.asyncio
async def test_get_question_detail_raises_for_missing_problem(fake_datasets):
    with pytest.raises(KeyError):
        await get_question_detail("2024-first", 999)
```

Also need pytest-asyncio mode. Create `fastapi_app/pytest.ini`:
```ini
[pytest]
asyncio_mode = auto
testpaths = tests
pythonpath = ..
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_tool_question.py -v
```
Expected: `ModuleNotFoundError: fastapi_app.tools`

- [ ] **Step 3: Implement question.py**

Write `fastapi_app/tools/__init__.py`:
```python
```

Write `fastapi_app/tools/question.py`:
```python
"""get_question_detail 툴: datasets/practicalIndustrial JSON 파일 로드."""
import json
from pathlib import Path
from ..config import get_settings


async def get_question_detail(source_session_id: str, problem_number: int) -> dict:
    """문제 원문·정답·해설·분류를 한 번에 반환.

    파일 구조:
      {DATASETS_ROOT}/{source_session_id}/problem1.json
      {DATASETS_ROOT}/{source_session_id}/answer1.json
      {DATASETS_ROOT}/{source_session_id}/comment1.json
    """
    settings = get_settings()
    base = Path(settings.datasets_root) / source_session_id

    problem_path = base / "problem1.json"
    answer_path = base / "answer1.json"
    comment_path = base / "comment1.json"

    if not problem_path.exists():
        raise FileNotFoundError(f"session not found: {source_session_id}")

    problems_wrapper = _load_json(problem_path)
    problems = problems_wrapper[0]["problems"] if problems_wrapper else []
    problem = next((p for p in problems if p.get("problem_number") == problem_number), None)
    if problem is None:
        raise KeyError(f"problem {problem_number} not found in {source_session_id}")

    answers = _load_json(answer_path) if answer_path.exists() else []
    comments = _load_json(comment_path) if comment_path.exists() else []

    answer = _find(answers, "problem_number", problem_number, "answer")
    comment = _find(comments, "problem_number", problem_number, "comment")

    return {
        "problem_number": problem.get("problem_number"),
        "question_text": problem.get("question_text", ""),
        "examples": problem.get("examples", ""),
        "input_type": problem.get("input_type", "single"),
        "answer": answer or "",
        "explanation": comment or "",
        "category": problem.get("category"),
        "subcategory": problem.get("subcategory"),
    }


def _load_json(path: Path) -> list:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def _find(items: list, key: str, value, target_key: str):
    for item in items:
        if item.get(key) == value:
            return item.get(target_key)
    return None
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_tool_question.py -v
```
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/tools/ fastapi_app/tests/test_tool_question.py fastapi_app/pytest.ini
git commit -m "$(cat <<'EOF'
feat(agent-api): get_question_detail 툴 + 데이터셋 로더 테스트

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: get_user_wrong_history 툴 (2-pass latest-wins)

**Files:**
- Create: `fastapi_app/tools/user_history.py`
- Create: `fastapi_app/tests/test_tool_user_history.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_tool_user_history.py`:
```python
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
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_tool_user_history.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement user_history.py**

Write `fastapi_app/tools/user_history.py`:
```python
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
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_tool_user_history.py -v
```
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/tools/user_history.py fastapi_app/tests/test_tool_user_history.py
git commit -m "$(cat <<'EOF'
feat(agent-api): get_user_wrong_history 툴 + 2-pass latest-wins 테스트

lib/userProblemsStore.js 의 최신 우선 규칙을 Python 으로 포팅.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: get_user_topic_stats 툴

**Files:**
- Modify: `fastapi_app/tools/user_history.py` (append)
- Create: `fastapi_app/tests/test_tool_topic_stats.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_tool_topic_stats.py`:
```python
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
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_tool_topic_stats.py -v
```
Expected: `ImportError: cannot import name 'aggregate_topic_stats'`

- [ ] **Step 3: Extend user_history.py**

Append to `fastapi_app/tools/user_history.py`:
```python


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
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_tool_topic_stats.py -v
```
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/tools/user_history.py fastapi_app/tests/test_tool_topic_stats.py
git commit -m "$(cat <<'EOF'
feat(agent-api): get_user_topic_stats 툴 + 카테고리/서브카테고리 집계

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: output tools — present_similar_problem / submit_evaluation

**Files:**
- Create: `fastapi_app/tools/output_tools.py`
- Create: `fastapi_app/tests/test_output_tools.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_output_tools.py`:
```python
"""output tools: present_similar_problem / submit_evaluation 처리 로직.

이 툴들은 외부 데이터 조회가 아니라 UI 이벤트 + 서버 상태 저장 역할.
"""
from fastapi_app.tools.output_tools import (
    handle_present_similar_problem,
    handle_submit_evaluation,
)


class FakeSession:
    def __init__(self):
        self.generated_problems = []
        self.user_evaluations = []


def test_present_adds_to_session_and_returns_problem_id():
    session = FakeSession()
    ui_actions = []
    args = {
        "question_text": "Java 출력 결과",
        "examples": "int a=1; System.out.println(a);",
        "expected_answer": "1",
        "answer_explanation": "변수 a가 1이므로 1 출력",
        "category": "Code",
        "language": "Java",
        "input_type": "single",
        "confidence": 5,
    }
    result = handle_present_similar_problem(args, session, ui_actions)
    assert result["rendered"] is True
    assert result["problem_id"].startswith("gen-")

    # 서버 세션에는 expected_answer 포함
    assert len(session.generated_problems) == 1
    assert session.generated_problems[0]["expected_answer"] == "1"

    # UI 페이로드에는 expected_answer 제거
    assert len(ui_actions) == 1
    assert ui_actions[0]["type"] == "present_problem"
    assert "expected_answer" not in ui_actions[0]["data"]


def test_evaluation_records_result_and_ui_event():
    session = FakeSession()
    ui_actions = []
    args = {"problem_id": "gen-abc123", "correct": True, "reasoning": "답이 6 맞음"}
    result = handle_submit_evaluation(args, session, ui_actions)
    assert result == {"ack": True}
    assert len(session.user_evaluations) == 1
    assert session.user_evaluations[0]["correct"] is True
    assert session.user_evaluations[0]["problem_id"] == "gen-abc123"
    assert ui_actions[0]["type"] == "evaluation"
    assert ui_actions[0]["correct"] is True
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_output_tools.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement output_tools.py**

Write `fastapi_app/tools/output_tools.py`:
```python
"""UI 액션 트리거 툴 처리기.

present_similar_problem:
  - 서버 세션의 generated_problems 에 전체 args 저장 (expected_answer 포함)
  - UI 페이로드에서는 expected_answer 제거 (유출 방지)
  - ui_actions 리스트에 렌더링 이벤트 append

submit_evaluation:
  - session.user_evaluations 에 결과 저장
  - ui_actions 리스트에 피드백 이벤트 append
"""
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def handle_present_similar_problem(args: dict[str, Any], session, ui_actions: list) -> dict:
    problem_id = f"gen-{uuid4().hex[:8]}"

    # 서버 세션 저장 (expected_answer 포함)
    stored = {"problem_id": problem_id, "created_at": _utc_now_iso(), **args}
    session.generated_problems.append(stored)

    # UI 페이로드: expected_answer 제거
    ui_payload = {k: v for k, v in args.items() if k != "expected_answer"}
    ui_actions.append({
        "type": "present_problem",
        "problem_id": problem_id,
        "data": ui_payload,
    })

    return {"problem_id": problem_id, "rendered": True}


def handle_submit_evaluation(args: dict[str, Any], session, ui_actions: list) -> dict:
    entry = {**args, "timestamp": _utc_now_iso()}
    session.user_evaluations.append(entry)
    ui_actions.append({"type": "evaluation", **args})
    return {"ack": True}
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_output_tools.py -v
```
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/tools/output_tools.py fastapi_app/tests/test_output_tools.py
git commit -m "$(cat <<'EOF'
feat(agent-api): output tools (present/evaluate) + expected_answer 마스킹 테스트

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: dispatch_tool — 보안 로직 중앙집중

**Files:**
- Create: `fastapi_app/tools/dispatch.py`
- Create: `fastapi_app/tests/test_dispatch.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_dispatch.py`:
```python
"""dispatch_tool 보안 로직 테스트.

핵심 체크:
1. user_email 서버 강제 주입 (LLM이 다른 값 넣어도 덮어씀)
2. output tools 는 ui_actions 에 반영되고 서버 세션에 저장
3. 알 수 없는 툴 이름은 {error: ...} 반환
4. 일반 예외는 {error: ...} 로 잡아 루프 유지
"""
from types import SimpleNamespace
import pytest
from fastapi_app.tools.dispatch import dispatch_tool


class FakeSession:
    def __init__(self):
        self.generated_problems = []
        self.user_evaluations = []


def make_tool_call(name: str, arguments_json: str):
    return SimpleNamespace(
        id=f"call_{name}",
        function=SimpleNamespace(name=name, arguments=arguments_json),
    )


@pytest.mark.asyncio
async def test_user_email_is_forcibly_overridden(monkeypatch):
    """LLM 이 get_user_wrong_history 에 다른 email 넘겨도 서버 email 로 덮어쓴다."""
    captured = {}

    async def fake_wrong_history(user_email, source_session_id, problem_number):
        captured["email"] = user_email
        return {"total_attempts": 0, "wrong_count": 0, "recent_submissions": []}

    monkeypatch.setattr("fastapi_app.tools.dispatch.get_user_wrong_history", fake_wrong_history)

    tc = make_tool_call(
        "get_user_wrong_history",
        '{"user_email":"attacker@evil.com","source_session_id":"2024-first","problem_number":1}',
    )
    session = FakeSession()
    await dispatch_tool(tc, user_email="real@user.com", session=session, ui_actions=[])

    assert captured["email"] == "real@user.com"


@pytest.mark.asyncio
async def test_present_similar_problem_masks_expected_answer(monkeypatch):
    tc = make_tool_call("present_similar_problem", (
        '{"question_text":"q","examples":"e","expected_answer":"42",'
        '"answer_explanation":"why","category":"Code","language":"Java",'
        '"input_type":"single","confidence":5}'
    ))
    session = FakeSession()
    ui_actions = []
    result = await dispatch_tool(tc, user_email="u@x.com", session=session, ui_actions=ui_actions)

    assert "problem_id" in result
    # 서버 세션에는 expected_answer 있음
    assert session.generated_problems[0]["expected_answer"] == "42"
    # UI 페이로드에는 없음
    assert "expected_answer" not in ui_actions[0]["data"]


@pytest.mark.asyncio
async def test_unknown_tool_returns_error():
    tc = make_tool_call("nonexistent_tool", "{}")
    result = await dispatch_tool(tc, user_email="u@x.com", session=FakeSession(), ui_actions=[])
    assert "error" in result


@pytest.mark.asyncio
async def test_invalid_json_arguments_return_error():
    tc = make_tool_call("get_question_detail", "{not valid json")
    result = await dispatch_tool(tc, user_email="u@x.com", session=FakeSession(), ui_actions=[])
    assert "error" in result
    assert "invalid" in result["error"].lower() or "json" in result["error"].lower()


@pytest.mark.asyncio
async def test_tool_exception_is_caught_as_error(monkeypatch):
    async def fake_question(source_session_id, problem_number):
        raise FileNotFoundError("missing")

    monkeypatch.setattr("fastapi_app.tools.dispatch.get_question_detail", fake_question)

    tc = make_tool_call("get_question_detail", '{"source_session_id":"x","problem_number":1}')
    result = await dispatch_tool(tc, user_email="u@x.com", session=FakeSession(), ui_actions=[])
    assert "error" in result
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_dispatch.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement dispatch.py**

Write `fastapi_app/tools/dispatch.py`:
```python
"""툴 호출 디스패치 — 보안 로직 중앙집중.

모든 툴 호출은 여기를 거침. 책임:
1. JSON 인자 파싱 실패 방어
2. 유저 스코프 툴에 user_email 강제 주입 (서버 세션 값으로 덮어씀)
3. 출력 툴은 UI 이벤트 생성 + 세션 상태 업데이트
4. 예외를 {"error": ...} 로 변환하여 에이전트 루프가 복구할 수 있게
"""
import json
import logging
from typing import Any

from ..agent.schemas import USER_SCOPED_TOOLS, OUTPUT_TOOLS
from .question import get_question_detail
from .user_history import get_user_wrong_history, get_user_topic_stats
from .output_tools import handle_present_similar_problem, handle_submit_evaluation

logger = logging.getLogger(__name__)


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
            return handle_present_similar_problem(args, session, ui_actions)
        if name == "submit_evaluation":
            return handle_submit_evaluation(args, session, ui_actions)

        return {"error": f"unknown tool: {name}"}

    except Exception as e:  # noqa: BLE001
        logger.warning("tool %s failed: %s", name, e, exc_info=True)
        return {"error": str(e)[:200]}
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_dispatch.py -v
```
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/tools/dispatch.py fastapi_app/tests/test_dispatch.py
git commit -m "$(cat <<'EOF'
feat(agent-api): dispatch_tool 중앙 디스패치 + 보안 로직 (user_email/마스킹)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: session_store CRUD (Postgres)

**Files:**
- Create: `fastapi_app/db/session_store.py`
- Create: `fastapi_app/tests/test_session_store_shape.py`

- [ ] **Step 1: Write failing test (shape-only, no real DB)**

Write `fastapi_app/tests/test_session_store_shape.py`:
```python
"""AgentSession dataclass shape 테스트.

실제 Supabase CRUD는 integration 레이어에서. 여기서는 직렬화만.
"""
from fastapi_app.db.session_store import AgentSession, serialize_for_upsert


def test_new_session_defaults():
    s = AgentSession(
        user_email="u@x.com",
        source_session_id="2024-first",
        problem_number=1,
    )
    assert s.messages == []
    assert s.tools_called == []
    assert s.turn_count == 0
    assert s.generated_problems == []
    assert s.user_evaluations == []
    assert s.prompt_version == "v1.0"


def test_serialize_for_upsert_shape():
    s = AgentSession(
        user_email="u@x.com",
        source_session_id="2024-first",
        problem_number=1,
        category="Code",
        subcategory="Java",
    )
    s.messages.append({"role": "user", "content": "hi"})
    s.tools_called.append("get_question_detail")
    s.turn_count = 1

    payload = serialize_for_upsert(s)
    assert payload["user_email"] == "u@x.com"
    assert payload["source_session_id"] == "2024-first"
    assert payload["problem_number"] == 1
    assert payload["category"] == "Code"
    assert payload["subcategory"] == "Java"
    assert payload["messages"] == [{"role": "user", "content": "hi"}]
    assert payload["tools_called"] == ["get_question_detail"]
    assert payload["turn_count"] == 1
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_session_store_shape.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement session_store.py**

Write `fastapi_app/db/session_store.py`:
```python
"""agent_sessions 테이블 CRUD.

메모리 상 AgentSession 데이터클래스 ↔ Postgres 레코드 매핑.
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
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_session_store_shape.py -v
```
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/db/session_store.py fastapi_app/tests/test_session_store_shape.py
git commit -m "$(cat <<'EOF'
feat(agent-api): agent_sessions CRUD (dataclass + Supabase upsert)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: run_agent 루프 (LLM mocked)

**Files:**
- Create: `fastapi_app/agent/runner.py`
- Create: `fastapi_app/tests/test_runner.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_runner.py`:
```python
"""run_agent 루프 integration 테스트 (LLM 은 mock)."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import pytest
from fastapi_app.agent.runner import run_agent
from fastapi_app.db.session_store import AgentSession


def fake_message(content=None, tool_calls=None):
    return SimpleNamespace(
        content=content,
        tool_calls=tool_calls,
        model_dump=lambda: {
            "role": "assistant",
            "content": content,
            "tool_calls": [
                {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                for tc in (tool_calls or [])
            ] if tool_calls else None,
        },
    )


def fake_tool_call(name: str, args: str, call_id: str = "c1"):
    return SimpleNamespace(id=call_id, function=SimpleNamespace(name=name, arguments=args))


def fake_response(message):
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


@pytest.mark.asyncio
async def test_run_agent_returns_reply_when_no_tool_calls(monkeypatch):
    """LLM 이 툴 없이 바로 답변하면 그 답변 그대로 반환."""
    session = AgentSession(user_email="u@x.com", source_session_id="2024-first", problem_number=1)

    async def fake_create(**kwargs):
        return fake_response(fake_message(content="직접 답변입니다"))

    with patch("fastapi_app.agent.runner.get_llm_client") as mock_client, \
         patch("fastapi_app.agent.runner.load_session", AsyncMock(return_value=session)), \
         patch("fastapi_app.agent.runner.save_session", AsyncMock()):
        mock_client.return_value.chat.completions.create = fake_create

        result = await run_agent(
            user_email="u@x.com",
            source_session_id="2024-first",
            problem_number=1,
            user_message="질문",
        )

    assert result["reply"] == "직접 답변입니다"
    assert result["ui_actions"] == []
    assert result["turn_count"] >= 1


@pytest.mark.asyncio
async def test_run_agent_executes_tool_then_responds(monkeypatch):
    """툴 호출 → 결과 주입 → 최종 답변 플로우."""
    session = AgentSession(user_email="u@x.com", source_session_id="2024-first", problem_number=1)

    responses = [
        fake_response(fake_message(
            tool_calls=[fake_tool_call("get_question_detail", '{"source_session_id":"2024-first","problem_number":1}')],
        )),
        fake_response(fake_message(content="문제 해설")),
    ]
    call_counter = {"n": 0}

    async def fake_create(**kwargs):
        r = responses[call_counter["n"]]
        call_counter["n"] += 1
        return r

    async def fake_dispatch(tool_call, user_email, session, ui_actions):
        return {"question_text": "C 문제", "answer": "1"}

    with patch("fastapi_app.agent.runner.get_llm_client") as mock_client, \
         patch("fastapi_app.agent.runner.dispatch_tool", fake_dispatch), \
         patch("fastapi_app.agent.runner.load_session", AsyncMock(return_value=session)), \
         patch("fastapi_app.agent.runner.save_session", AsyncMock()):
        mock_client.return_value.chat.completions.create = fake_create

        result = await run_agent("u@x.com", "2024-first", 1, "왜 틀렸어?")

    assert result["reply"] == "문제 해설"
    assert "get_question_detail" in session.tools_called


@pytest.mark.asyncio
async def test_run_agent_respects_max_iterations(monkeypatch):
    """LLM 이 계속 툴만 부르면 MAX_ITER 에서 중단."""
    session = AgentSession(user_email="u@x.com", source_session_id="2024-first", problem_number=1)

    async def fake_create(**kwargs):
        return fake_response(fake_message(
            tool_calls=[fake_tool_call("get_question_detail", '{"source_session_id":"s","problem_number":1}')],
        ))

    async def fake_dispatch(tool_call, user_email, session, ui_actions):
        return {"ok": True}

    with patch("fastapi_app.agent.runner.get_llm_client") as mock_client, \
         patch("fastapi_app.agent.runner.dispatch_tool", fake_dispatch), \
         patch("fastapi_app.agent.runner.load_session", AsyncMock(return_value=session)), \
         patch("fastapi_app.agent.runner.save_session", AsyncMock()):
        mock_client.return_value.chat.completions.create = fake_create

        result = await run_agent("u@x.com", "2024-first", 1, "x")

    # ERROR_MESSAGES["MAX_ITER_REACHED"] 메시지가 답변에 포함
    from fastapi_app.constants.prompts import ERROR_MESSAGES
    assert ERROR_MESSAGES["MAX_ITER_REACHED"] in result["reply"]
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_runner.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement runner.py**

Write `fastapi_app/agent/runner.py`:
```python
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
from ..tools.question import get_question_detail
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

    system_prompt = build_main_system_prompt(
        source_session_id=source_session_id,
        problem_number=problem_number,
        category=category or "unknown",
        subcategory=subcategory,
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
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_runner.py -v
```
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/agent/runner.py fastapi_app/tests/test_runner.py
git commit -m "$(cat <<'EOF'
feat(agent-api): run_agent 루프 + MAX_ITER 안전 장치 + integration 테스트

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: /chat 실제 구현 (run_agent 연결)

**Files:**
- Modify: `fastapi_app/main.py`
- Modify: `fastapi_app/tests/test_chat_endpoint.py`

- [ ] **Step 1: Replace echo with run_agent in main.py**

Replace the `@app.post("/chat", ...)` handler in `fastapi_app/main.py` with:
```python
from .agent.runner import run_agent


@app.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user_email: str = Depends(current_user_email),
):
    result = await run_agent(
        user_email=user_email,
        source_session_id=body.source_session_id,
        problem_number=body.problem_number,
        user_message=body.message,
    )
    return ChatResponse(**result)
```

- [ ] **Step 2: Update test to mock run_agent**

Append to `fastapi_app/tests/test_chat_endpoint.py`:
```python
@pytest.mark.asyncio
async def test_chat_calls_run_agent(client, monkeypatch):
    from unittest.mock import AsyncMock

    fake_run = AsyncMock(return_value={"reply": "mock reply", "ui_actions": [], "turn_count": 1})
    monkeypatch.setattr("fastapi_app.main.run_agent", fake_run)

    resp = client.post(
        "/chat",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@example.com"},
        json={"source_session_id": "2024-first", "problem_number": 3, "message": "x"},
    )
    assert resp.status_code == 200
    assert resp.json()["reply"] == "mock reply"
    fake_run.assert_awaited_once()
```

Also remove the old `test_chat_echoes_message` function since echo is gone.

- [ ] **Step 3: Run tests**

```bash
cd fastapi_app && pytest tests/test_chat_endpoint.py -v
```
Expected: 3 passed (rejects-without-secret, rejects-without-email, calls-run-agent)

- [ ] **Step 4: Commit**

```bash
git add fastapi_app/main.py fastapi_app/tests/test_chat_endpoint.py
git commit -m "$(cat <<'EOF'
feat(agent-api): /chat 실제 run_agent 연결 (echo 제거)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: /submit 엔드포인트 (생성 문제 답 제출)

**Files:**
- Modify: `fastapi_app/main.py`
- Create: `fastapi_app/tests/test_submit_endpoint.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_submit_endpoint.py`:
```python
"""/submit: 유저가 생성 문제에 답 제출 → run_agent 재진입."""
import pytest
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()
    from fastapi_app.main import app
    return TestClient(app)


def test_submit_calls_run_agent_with_synthesized_message(client, monkeypatch):
    captured_message = {}

    async def fake_run(user_email, source_session_id, problem_number, user_message):
        captured_message["value"] = user_message
        return {"reply": "정답!", "ui_actions": [], "turn_count": 2}

    monkeypatch.setattr("fastapi_app.main.run_agent", fake_run)

    resp = client.post(
        "/submit",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@x.com"},
        json={
            "source_session_id": "2024-first",
            "problem_number": 3,
            "problem_id": "gen-abc",
            "user_answer": "6",
        },
    )
    assert resp.status_code == 200
    # 서버가 "[유저가 gen-abc 문제에 답: '6']" 형태 메시지로 합성해서 LLM에게 보냈는지 확인
    assert "gen-abc" in captured_message["value"]
    assert "6" in captured_message["value"]
```

- [ ] **Step 2: Run test (expect fail — no /submit route)**

```bash
cd fastapi_app && pytest tests/test_submit_endpoint.py -v
```
Expected: 404

- [ ] **Step 3: Add /submit to main.py**

Append to `fastapi_app/main.py`:
```python
class SubmitRequest(BaseModel):
    source_session_id: str = Field(..., min_length=1)
    problem_number: int = Field(..., ge=1)
    problem_id: str = Field(..., min_length=1)
    user_answer: str = Field(..., min_length=1, max_length=500)


@app.post("/submit", response_model=ChatResponse)
async def submit_answer(
    body: SubmitRequest,
    user_email: str = Depends(current_user_email),
):
    synthesized = f"[유저가 {body.problem_id} 문제에 답변: '{body.user_answer}']"
    result = await run_agent(
        user_email=user_email,
        source_session_id=body.source_session_id,
        problem_number=body.problem_number,
        user_message=synthesized,
    )
    return ChatResponse(**result)
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_submit_endpoint.py -v
```
Expected: 1 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/main.py fastapi_app/tests/test_submit_endpoint.py
git commit -m "$(cat <<'EOF'
feat(agent-api): /submit 엔드포인트 (생성 문제 답 → run_agent 재진입)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 18: GET /session 엔드포인트 (이전 대화 로드)

**Files:**
- Modify: `fastapi_app/main.py`
- Create: `fastapi_app/tests/test_session_endpoints.py`

- [ ] **Step 1: Write failing test**

Write `fastapi_app/tests/test_session_endpoints.py`:
```python
"""GET/DELETE /session 엔드포인트."""
import pytest
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from fastapi_app.db.session_store import AgentSession


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()
    from fastapi_app.main import app
    return TestClient(app)


def test_get_session_returns_messages_when_exists(client, monkeypatch):
    session = AgentSession(
        user_email="u@x.com", source_session_id="2024-first", problem_number=1,
    )
    session.messages = [
        {"role": "system", "content": "s"},
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
    ]
    session.turn_count = 1
    session.generated_problems = [{"problem_id": "gen-1", "question_text": "q", "expected_answer": "hidden"}]

    async def fake_load(user_email, sid, pnum):
        return session

    monkeypatch.setattr("fastapi_app.main.load_session", fake_load)

    resp = client.get(
        "/session/2024-first/1",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@x.com"},
    )
    assert resp.status_code == 200
    body = resp.json()
    # system 메시지는 응답에서 제외 (프론트가 볼 필요 없음)
    roles = [m["role"] for m in body["messages"]]
    assert "system" not in roles
    assert body["turn_count"] == 1
    # 생성 문제 리스트에서 expected_answer 마스킹
    assert body["generated_problems"][0]["problem_id"] == "gen-1"
    assert "expected_answer" not in body["generated_problems"][0]


def test_get_session_returns_empty_when_missing(client, monkeypatch):
    monkeypatch.setattr("fastapi_app.main.load_session", AsyncMock(return_value=None))
    resp = client.get(
        "/session/2024-first/99",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@x.com"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["messages"] == []
    assert body["turn_count"] == 0


def test_delete_session_returns_ok(client, monkeypatch):
    monkeypatch.setattr("fastapi_app.main.delete_session", AsyncMock())
    resp = client.delete(
        "/session/2024-first/1",
        headers={"x-internal-auth": "test-secret", "x-user-email": "u@x.com"},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
```

- [ ] **Step 2: Run test (expect fail)**

```bash
cd fastapi_app && pytest tests/test_session_endpoints.py -v
```
Expected: 404

- [ ] **Step 3: Add session endpoints to main.py**

Append to `fastapi_app/main.py`:
```python
from .db.session_store import load_session, delete_session


class SessionView(BaseModel):
    messages: list[dict]
    turn_count: int
    generated_problems: list[dict]
    user_evaluations: list[dict]


@app.get("/session/{source_session_id}/{problem_number}", response_model=SessionView)
async def get_session(
    source_session_id: str,
    problem_number: int,
    user_email: str = Depends(current_user_email),
):
    session = await load_session(user_email, source_session_id, problem_number)
    if session is None:
        return SessionView(messages=[], turn_count=0, generated_problems=[], user_evaluations=[])

    # system 메시지 제외 + expected_answer 마스킹
    visible_messages = [m for m in session.messages if m.get("role") != "system"]
    masked_problems = [
        {k: v for k, v in p.items() if k != "expected_answer"}
        for p in session.generated_problems
    ]
    return SessionView(
        messages=visible_messages,
        turn_count=session.turn_count,
        generated_problems=masked_problems,
        user_evaluations=session.user_evaluations,
    )


@app.delete("/session/{source_session_id}/{problem_number}")
async def reset_session(
    source_session_id: str,
    problem_number: int,
    user_email: str = Depends(current_user_email),
):
    await delete_session(user_email, source_session_id, problem_number)
    return {"ok": True}
```

- [ ] **Step 4: Run test (expect pass)**

```bash
cd fastapi_app && pytest tests/test_session_endpoints.py -v
```
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add fastapi_app/main.py fastapi_app/tests/test_session_endpoints.py
git commit -m "$(cat <<'EOF'
feat(agent-api): GET/DELETE /session (expected_answer 마스킹, system 메시지 제외)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 19: Phase 2 통합 스모크 테스트 (수동, 실제 OpenAI 호출)

**Files:** 없음 (수동 검증)

이 task 는 실제 OpenAI API 를 호출하여 end-to-end 흐름 검증. 비용 약 $0.01 이하.

- [ ] **Step 1: .env 에 실제 키 설정**

`fastapi_app/.env` 에 OpenAI API key, Supabase URL/키를 실제 값으로 채움.

- [ ] **Step 2: 서버 시작**

```bash
cd fastapi_app
uvicorn main:app --reload --port 8001
```

- [ ] **Step 3: 실제 문제로 대화 1회**

```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -H "x-internal-auth: <secret>" \
  -H "x-user-email: test@example.com" \
  -d '{"source_session_id":"2024-first","problem_number":1,"message":"이 문제 설명해줘"}'
```
Expected:
- `reply` 에 C 언어 출력 결과 설명이 한국어로 들어있음
- `ui_actions` 는 비어있거나 `present_problem` 이벤트 포함
- `turn_count` ≥ 1

- [ ] **Step 4: Supabase 에서 세션 저장 확인**

Supabase Studio SQL 에디터:
```sql
SELECT source_session_id, problem_number, turn_count, tools_called, jsonb_array_length(messages) as msg_count
FROM agent_sessions
WHERE user_email = 'test@example.com'
ORDER BY updated_at DESC
LIMIT 5;
```
Expected: 방금 실행한 대화 세션 1개가 조회됨.

- [ ] **Step 5: 세션 로드 테스트**

```bash
curl http://localhost:8001/session/2024-first/1 \
  -H "x-internal-auth: <secret>" \
  -H "x-user-email: test@example.com"
```
Expected: 직전 대화의 메시지 배열 반환 (system 메시지 제외).

- [ ] **Step 6: 문제 발견 시 디버그 후 재시도**

툴 호출 실패·프롬프트 응답 이상 등은 서버 로그로 확인 후 수정. 커밋 없음 — 이건 검증 단계일 뿐.

---

## Phase 3: Next.js 코치 위저드 UI

LLM 무관. Next.js 내부에서 Supabase 직접 조회하는 2개 API + 2개 페이지 + 기존 선택 화면에 카드 추가.

### Task 20: lib/topicStatsStore.js (카테고리별 정답률 집계)

**Files:**
- Create: `lib/topicStatsStore.js`

- [ ] **Step 1: Implement topicStatsStore.js**

Write `lib/topicStatsStore.js`:
```javascript
import fs from 'fs/promises';
import path from 'path';
import { fetchUserFinishEvents } from '@/lib/userProblemsStore';

const DATASETS_ROOT = path.join(process.cwd(), 'datasets', 'practicalIndustrial');

function emptySlot() {
  return { total: 0, correct: 0, accuracy: 0 };
}

function finalizeSlot(slot) {
  const total = slot.total;
  const correct = slot.correct;
  return { total, correct, accuracy: total > 0 ? correct / total : 0 };
}

async function loadAllTags() {
  const tags = new Map();
  try {
    const entries = await fs.readdir(DATASETS_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sessionId = entry.name;
      const problemFile = path.join(DATASETS_ROOT, sessionId, 'problem1.json');
      try {
        const raw = await fs.readFile(problemFile, 'utf8');
        const data = JSON.parse(raw);
        const problems = data?.[0]?.problems || [];
        for (const p of problems) {
          const pnum = Number(p.problem_number);
          if (!Number.isFinite(pnum) || !p.category) continue;
          tags.set(`${sessionId}:${pnum}`, { category: p.category, subcategory: p.subcategory || null });
        }
      } catch {
        // skip malformed session
      }
    }
  } catch {
    // dataset root missing
  }
  return tags;
}

export async function computeUserTopicStats(userEmail) {
  const events = await fetchUserFinishEvents(userEmail);
  const tags = await loadAllTags();

  // 2-pass latest-wins: (sid, pnum) → latest outcome
  const latestForKey = new Map();
  for (const ev of events) {
    const outcomes = ev?.payload?.problemOutcomes || [];
    for (const o of outcomes) {
      const sid = String(o?.sessionId || '').trim();
      const pnum = Number(o?.problemNumber);
      if (!sid || !Number.isFinite(pnum)) continue;
      const key = `${sid}:${pnum}`;
      if (latestForKey.has(key)) continue; // events is desc — first seen is latest
      latestForKey.set(key, o);
    }
  }

  const result = {
    SQL: emptySlot(),
    Code: { _total: emptySlot(), Java: emptySlot(), C: emptySlot(), Python: emptySlot() },
    이론: { _total: emptySlot(), 네트워크: emptySlot(), 보안: emptySlot(), 소프트웨어공학: emptySlot() },
  };

  for (const [key, o] of latestForKey.entries()) {
    const tag = tags.get(key);
    if (!tag) continue;
    const isCorrect = Boolean(o?.isCorrect);

    if (tag.category === 'SQL') {
      result.SQL.total += 1;
      result.SQL.correct += isCorrect ? 1 : 0;
    } else if (tag.category === 'Code') {
      result.Code._total.total += 1;
      result.Code._total.correct += isCorrect ? 1 : 0;
      if (tag.subcategory && result.Code[tag.subcategory]) {
        result.Code[tag.subcategory].total += 1;
        result.Code[tag.subcategory].correct += isCorrect ? 1 : 0;
      }
    } else if (tag.category === '이론') {
      result.이론._total.total += 1;
      result.이론._total.correct += isCorrect ? 1 : 0;
      if (tag.subcategory && result.이론[tag.subcategory]) {
        result.이론[tag.subcategory].total += 1;
        result.이론[tag.subcategory].correct += isCorrect ? 1 : 0;
      }
    }
  }

  result.SQL = finalizeSlot(result.SQL);
  for (const parent of ['Code', '이론']) {
    const sub = {};
    for (const [k, v] of Object.entries(result[parent])) {
      sub[k] = finalizeSlot(v);
    }
    result[parent] = sub;
  }
  return result;
}
```

- [ ] **Step 2: Smoke test (manual)**

```bash
node --check lib/topicStatsStore.js
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/topicStatsStore.js
git commit -m "$(cat <<'EOF'
feat(coach): topicStatsStore — 카테고리/서브카테고리 정답률 집계

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: /api/user/topic-stats Next.js 라우트

**Files:**
- Create: `app/api/user/topic-stats/route.js`

- [ ] **Step 1: Implement route**

Write `app/api/user/topic-stats/route.js`:
```javascript
import { auth } from '@/auth';
import { computeUserTopicStats } from '@/lib/topicStatsStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const email = String(session?.user?.email || '').trim().toLowerCase();
  if (!email) {
    return Response.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }
  try {
    const stats = await computeUserTopicStats(email);
    return Response.json({ ok: true, stats });
  } catch (e) {
    return Response.json({ ok: false, message: String(e?.message || e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Smoke test (dev server)**

```bash
npm run dev
```
Then in browser with logged-in session, visit `http://localhost:3000/api/user/topic-stats`.
Expected: JSON with `{ok: true, stats: {SQL: {total, correct, accuracy}, Code: {_total, Java, C, Python}, 이론: {...}}}`.

If not logged in, `{ok: false, message: 'unauthorized'}` with 401.

- [ ] **Step 3: Commit**

```bash
git add app/api/user/topic-stats/route.js
git commit -m "$(cat <<'EOF'
feat(coach): /api/user/topic-stats Next.js 라우트 (next-auth + Supabase 직접)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 22: lib/wrongProblemsStore.js (카테고리 필터 틀린 문제 리스트)

**Files:**
- Create: `lib/wrongProblemsStore.js`

- [ ] **Step 1: Implement**

Write `lib/wrongProblemsStore.js`:
```javascript
import fs from 'fs/promises';
import path from 'path';
import { fetchUserFinishEvents } from '@/lib/userProblemsStore';

const DATASETS_ROOT = path.join(process.cwd(), 'datasets', 'practicalIndustrial');

async function loadAllProblems() {
  // (sessionId, problemNumber) -> {category, subcategory, question_preview}
  const map = new Map();
  try {
    const entries = await fs.readdir(DATASETS_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sessionId = entry.name;
      const problemFile = path.join(DATASETS_ROOT, sessionId, 'problem1.json');
      try {
        const raw = await fs.readFile(problemFile, 'utf8');
        const data = JSON.parse(raw);
        const problems = data?.[0]?.problems || [];
        for (const p of problems) {
          const pnum = Number(p.problem_number);
          if (!Number.isFinite(pnum)) continue;
          map.set(`${sessionId}:${pnum}`, {
            category: p.category || null,
            subcategory: p.subcategory || null,
            question_preview: String(p.question_text || '').slice(0, 50),
          });
        }
      } catch {
        // skip
      }
    }
  } catch {
    // dataset root missing
  }
  return map;
}

export async function getUserWrongProblemsByCategory(userEmail, category) {
  const events = await fetchUserFinishEvents(userEmail);
  const problemsMap = await loadAllProblems();

  // 2-pass latest-wins (사용자 문제별 최신 outcome 만)
  const latestForKey = new Map();
  const timestampForKey = new Map();
  for (const ev of events) {
    const outcomes = ev?.payload?.problemOutcomes || [];
    for (const o of outcomes) {
      const sid = String(o?.sessionId || '').trim();
      const pnum = Number(o?.problemNumber);
      if (!sid || !Number.isFinite(pnum)) continue;
      const key = `${sid}:${pnum}`;
      if (latestForKey.has(key)) continue;
      latestForKey.set(key, o);
      timestampForKey.set(key, ev?.timestamp || '');
    }
  }

  const rows = [];
  for (const [key, o] of latestForKey.entries()) {
    if (o?.isCorrect || o?.isUnknown) continue;
    const meta = problemsMap.get(key);
    if (!meta) continue;
    if (meta.category !== category) continue;
    const [sourceSessionId, pnumStr] = key.split(':');
    rows.push({
      source_session_id: sourceSessionId,
      problem_number: Number(pnumStr),
      category: meta.category,
      subcategory: meta.subcategory,
      question_preview: meta.question_preview,
      last_attempt_at: timestampForKey.get(key) || null,
    });
  }

  rows.sort((a, b) => String(b.last_attempt_at || '').localeCompare(String(a.last_attempt_at || '')));
  return rows;
}
```

- [ ] **Step 2: Smoke test**

```bash
node --check lib/wrongProblemsStore.js
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/wrongProblemsStore.js
git commit -m "$(cat <<'EOF'
feat(coach): wrongProblemsStore — 카테고리 필터 틀린 문제 목록

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 23: /api/user/wrong-problems Next.js 라우트

**Files:**
- Create: `app/api/user/wrong-problems/route.js`

- [ ] **Step 1: Implement**

Write `app/api/user/wrong-problems/route.js`:
```javascript
import { auth } from '@/auth';
import { getUserWrongProblemsByCategory } from '@/lib/wrongProblemsStore';

export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = new Set(['SQL', 'Code']);

export async function GET(request) {
  const session = await auth();
  const email = String(session?.user?.email || '').trim().toLowerCase();
  if (!email) {
    return Response.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  if (!category || !ALLOWED_CATEGORIES.has(category)) {
    return Response.json(
      { ok: false, message: `category must be one of ${[...ALLOWED_CATEGORIES].join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const rows = await getUserWrongProblemsByCategory(email, category);
    return Response.json({ ok: true, rows });
  } catch (e) {
    return Response.json({ ok: false, message: String(e?.message || e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Smoke test**

Dev server:
```
http://localhost:3000/api/user/wrong-problems?category=Code
```
Expected: `{ok: true, rows: [...]}` (empty array if no data).
`?category=이론` → 400 (이론은 V1 미지원).

- [ ] **Step 3: Commit**

```bash
git add app/api/user/wrong-problems/route.js
git commit -m "$(cat <<'EOF'
feat(coach): /api/user/wrong-problems 라우트 (SQL/Code 필터)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 24: /practical/coach/page.js (카테고리 진단 화면)

**Files:**
- Create: `app/practical/coach/page.js`
- Create: `app/practical/coach/CoachCategoryPageClient.js`

- [ ] **Step 1: Write server page**

Write `app/practical/coach/page.js`:
```javascript
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { computeUserTopicStats } from '@/lib/topicStatsStore';
import CoachCategoryPageClient from './CoachCategoryPageClient';

export const dynamic = 'force-dynamic';

export default async function CoachCategoryPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const email = String(session.user.email).trim().toLowerCase();
  const stats = await computeUserTopicStats(email);
  return <CoachCategoryPageClient stats={stats} />;
}
```

- [ ] **Step 2: Write client component**

Write `app/practical/coach/CoachCategoryPageClient.js`:
```javascript
'use client';

import Link from 'next/link';
import { ChevronLeft, Brain, Database, Code2, BookOpen, AlertCircle } from 'lucide-react';

function pct(n) {
  return `${Math.round((n || 0) * 100)}%`;
}

function CategoryRow({ icon: Icon, label, accent, accuracy, href, disabled, disabledLabel }) {
  const cardClasses = `flex items-center justify-between rounded-xl border bg-white px-5 py-4 shadow-sm transition ${
    disabled ? 'border-slate-200 opacity-60 cursor-not-allowed' : 'border-slate-200 hover:-translate-y-px hover:shadow-md'
  }`;
  const content = (
    <>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <p className="text-xs text-slate-400">정답률 <span className="font-semibold text-slate-600">{pct(accuracy)}</span></p>
        </div>
      </div>
      {disabled
        ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{disabledLabel || '준비중입니다'}</span>
        : <span className="text-xs font-semibold text-sky-600">복습하기 ▶</span>}
    </>
  );
  if (disabled) return <div className={cardClasses}>{content}</div>;
  return <Link href={href} className={cardClasses}>{content}</Link>;
}

export default function CoachCategoryPageClient({ stats }) {
  const totalAttempts =
    (stats?.SQL?.total || 0) +
    (stats?.Code?._total?.total || 0) +
    (stats?.이론?._total?.total || 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/practical"
          className="mb-6 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          실기 회차 선택으로
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">코치 에이전트</p>
              <h1 className="text-2xl font-extrabold text-slate-900">내 약점 진단</h1>
            </div>
          </div>

          {totalAttempts === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-400">아직 실기를 풀어본 기록이 없어요.</p>
              <p className="text-xs text-slate-300">실기를 한 번 풀고 오시면 약점 진단을 해드릴 수 있어요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <CategoryRow
                icon={Database}
                label="SQL"
                accent="bg-sky-100 text-sky-600"
                accuracy={stats?.SQL?.accuracy}
                href="/practical/coach/sql"
              />
              <CategoryRow
                icon={Code2}
                label="Code"
                accent="bg-emerald-100 text-emerald-600"
                accuracy={stats?.Code?._total?.accuracy}
                href="/practical/coach/code"
              />
              <CategoryRow
                icon={BookOpen}
                label="이론"
                accent="bg-amber-100 text-amber-600"
                accuracy={stats?.이론?._total?.accuracy}
                disabled
                disabledLabel="준비중입니다"
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Smoke test**

Dev server. Navigate to `/practical/coach` (logged in).
Expected: 3 카테고리 카드, SQL·Code는 클릭 가능, 이론은 "준비중" 비활성.

- [ ] **Step 4: Commit**

```bash
git add app/practical/coach/page.js app/practical/coach/CoachCategoryPageClient.js
git commit -m "$(cat <<'EOF'
feat(coach): /practical/coach 카테고리 진단 화면

- 3개 카테고리 정답률 카드
- 이론은 '준비중' 비활성
- 기록 없으면 empty state

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 25: /practical/coach/[category]/page.js (틀린 문제 리스트)

**Files:**
- Create: `app/practical/coach/[category]/page.js`
- Create: `app/practical/coach/[category]/CoachProblemListClient.js`
- Create: `app/practical/coach/[category]/categoryConfig.js`

- [ ] **Step 1: categoryConfig.js — URL slug ↔ 실제 category 매핑**

Write `app/practical/coach/[category]/categoryConfig.js`:
```javascript
export const CATEGORY_BY_SLUG = {
  sql: 'SQL',
  code: 'Code',
};

export const SLUG_META = {
  sql: { label: 'SQL', color: 'sky' },
  code: { label: 'Code', color: 'emerald' },
};
```

- [ ] **Step 2: Server page**

Write `app/practical/coach/[category]/page.js`:
```javascript
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { computeUserTopicStats } from '@/lib/topicStatsStore';
import { getUserWrongProblemsByCategory } from '@/lib/wrongProblemsStore';
import { CATEGORY_BY_SLUG } from './categoryConfig';
import CoachProblemListClient from './CoachProblemListClient';

export const dynamic = 'force-dynamic';

export default async function CoachCategoryProblemsPage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const slug = String(params.category || '').toLowerCase();
  const category = CATEGORY_BY_SLUG[slug];
  if (!category) notFound();

  const session = await auth();
  if (!session?.user?.email) redirect('/');
  const email = String(session.user.email).trim().toLowerCase();

  const [stats, rows] = await Promise.all([
    computeUserTopicStats(email),
    getUserWrongProblemsByCategory(email, category),
  ]);

  return <CoachProblemListClient category={category} slug={slug} stats={stats} rows={rows} />;
}
```

- [ ] **Step 3: Client component**

Write `app/practical/coach/[category]/CoachProblemListClient.js`:
```javascript
'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

function pct(n) {
  return `${Math.round((n || 0) * 100)}%`;
}

const SESSION_LABELS = {
  '2022-first': '2022년 1회', '2022-second': '2022년 2회', '2022-third': '2022년 3회',
  '2023-first': '2023년 1회', '2023-second': '2023년 2회', '2023-third': '2023년 3회',
  '2024-first': '2024년 1회', '2024-second': '2024년 2회', '2024-third': '2024년 3회',
  '2025-first': '2025년 1회', '2025-second': '2025년 2회', '2025-third': '2025년 3회',
};

function prettySession(id) {
  return SESSION_LABELS[id] || id;
}

function SubStatsBadges({ category, stats }) {
  if (category === 'SQL') return null;
  if (category === 'Code') {
    const c = stats?.Code || {};
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Java {pct(c.Java?.accuracy)}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">C {pct(c.C?.accuracy)}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Python {pct(c.Python?.accuracy)}</span>
      </div>
    );
  }
  return null;
}

export default function CoachProblemListClient({ category, slug, stats, rows }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/practical/coach"
          className="mb-6 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          카테고리 선택으로
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-extrabold text-slate-900">{category} 복습</h1>
          <div className="mb-5">
            <SubStatsBadges category={category} stats={stats} />
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-400">이 카테고리에서 틀린 문제가 없어요 🎉</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={`${r.source_session_id}:${r.problem_number}`}>
                  <Link
                    href={`/practical/${r.source_session_id}?p=${r.problem_number}&from=coach`}
                    className="group flex items-center justify-between rounded-xl border border-slate-200/80 border-l-4 border-l-rose-400 bg-white px-4 py-3 shadow-sm hover:bg-rose-50/60 hover:shadow-md transition"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-400">{prettySession(r.source_session_id)}</p>
                      <p className="text-sm font-bold text-slate-800">
                        {r.problem_number}번
                        {r.subcategory && <span className="ml-2 text-xs font-semibold text-slate-500">({r.subcategory})</span>}
                      </p>
                      {r.question_preview && (
                        <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{r.question_preview}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500 transition-transform" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Smoke test**

Dev server. Navigate to `/practical/coach/code`.
Expected: Java/C/Python 정답률 뱃지 + 틀린 Code 문제 리스트.

`/practical/coach/theory` → 404 (categoryConfig 에 없음 — 의도).

- [ ] **Step 5: Commit**

```bash
git add app/practical/coach/\[category\]/
git commit -m "$(cat <<'EOF'
feat(coach): /practical/coach/[category] 틀린 문제 리스트 + 서브카테고리 정답률

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 26: PracticalSelectionPageClient 에 코치 카드 추가

**Files:**
- Modify: `app/practical/PracticalSelectionPageClient.js`

- [ ] **Step 1: Read existing file**

Read `app/practical/PracticalSelectionPageClient.js` — 파일 내용은 기존 구조를 그대로 유지하면서 회차 카드 그리드 내에 "코치 에이전트" 카드를 추가하는 것이 목적.

- [ ] **Step 2: Locate the grid and add card**

기존 회차 카드 그리드(Link/div 리스트가 있는 `<div className="grid ...">`) 마지막 요소로 아래 컴포넌트를 추가.

파일 상단 import 부분에 추가:
```javascript
import { Brain } from 'lucide-react';
import { useEffect, useState } from 'react';
```

회차 카드 그리드 내부 끝에 추가 (회차 맵 끝난 직후):
```javascript
<CoachAgentCard />
```

같은 파일 하단(export default 컴포넌트 바깥)에 서브컴포넌트 정의:
```javascript
function CoachAgentCard() {
  const [enabled, setEnabled] = useState(null);

  useEffect(() => {
    fetch('/api/user/topic-stats')
      .then((r) => r.json())
      .then((json) => {
        if (!json?.ok) { setEnabled(false); return; }
        const total =
          (json.stats?.SQL?.total || 0) +
          (json.stats?.Code?._total?.total || 0) +
          (json.stats?.이론?._total?.total || 0);
        setEnabled(total > 0);
      })
      .catch(() => setEnabled(false));
  }, []);

  if (enabled === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse min-h-[140px]">
        <div className="h-10 w-10 rounded-xl bg-slate-100" />
        <div className="h-3 w-20 rounded bg-slate-100" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div
        title="먼저 실기를 한 번 풀어보세요"
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm opacity-60 cursor-not-allowed min-h-[140px]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-400">
          <Brain className="h-5 w-5" />
        </div>
        <p className="text-sm font-bold text-slate-500">코치 에이전트</p>
        <p className="text-[11px] text-slate-400 text-center">먼저 실기를 풀어보세요</p>
      </div>
    );
  }

  return (
    <a
      href="/practical/coach"
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-violet-200 bg-gradient-to-b from-violet-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md min-h-[140px]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
        <Brain className="h-5 w-5" />
      </div>
      <p className="text-sm font-extrabold text-violet-700">코치 에이전트</p>
      <p className="text-[11px] text-violet-500 text-center">약점 중심 복습</p>
    </a>
  );
}
```

- [ ] **Step 3: Smoke test**

Dev server. 로그인 후 `/practical` 방문.
Expected: 회차 카드들 + 마지막에 "코치 에이전트" 카드. 풀이 기록이 없으면 회색 비활성.

- [ ] **Step 4: Commit**

```bash
git add app/practical/PracticalSelectionPageClient.js
git commit -m "$(cat <<'EOF'
feat(coach): /practical 회차 선택 화면에 코치 에이전트 카드 추가

- topic-stats 조회로 풀이 기록 있을 때만 활성
- 클릭 시 /practical/coach 로 이동

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4, 5, 6 은 플랜 분량이 커서 다음 섹션에 이어 적음.

Phase 4-6 task 는 Phase 1-3 의 실행 결과를 확인한 후 구체화하는 것이 안전하므로, 다음 파일로 이어 작성:
`docs/superpowers/plans/2026-04-19-ai-tutor-agent-implementation-part2.md`

각 Phase 개요만 먼저 이 문서에 유지하고, Phase 4 시작 전 part2 를 열어 세부 task 정의를 이어가는 전략.

**Phase 4 예정 task (Task 27-33): AgentChat 컴포넌트**
- Task 27: `components/AgentChat/constants/{messages,config,index}.js`
- Task 28: `components/AgentChat/useAgentChat.js` 훅 (session 로드, send, submit)
- Task 29: `TextBubble.jsx`, `InputBox.jsx`
- Task 30: `GeneratedProblemCard.jsx` (인라인 퀴즈 위젯, input_type 3종 대응)
- Task 31: `EvaluationCard.jsx` (✅/❌ 피드백)
- Task 32: `MessageList.jsx` + `ChatWindow.jsx` + `FloatingButton.jsx`
- Task 33: `PracticalQuizV2.js` 또는 `/practical/[sessionId]/page.js` 에 AgentChat 마운트 (reviewOnly 상태에서만)

**Phase 5 예정 task (Task 34-37): 프록시 라우트 & E2E**
- Task 34: `app/api/agent/chat/route.js` (Next.js → FastAPI 프록시, shared secret 주입)
- Task 35: `app/api/agent/submit/route.js` (동일 패턴)
- Task 36: `app/api/agent/session/[sessionId]/[problemNumber]/route.js` GET/DELETE
- Task 37: 수동 E2E 검증 시나리오:
  1. 로그인
  2. `/practical` → 코치 에이전트 카드 클릭
  3. `/practical/coach` 에서 Code 클릭
  4. 틀린 Code 문제 하나 클릭 → `/practical/[sid]?p=N&from=coach`
  5. 플로팅 버튼 클릭 → 챗봇 열림 → 이전 대화 로드
  6. "왜 틀렸어?" 전송 → 해설 + (선택) 유사 문제 위젯
  7. 유사 문제 답 제출 → 채점 피드백
  8. Supabase Studio 에서 `agent_sessions` 레코드 확인

**Phase 6 예정 task (Task 38-40): 폴리싱**
- Task 38: 프롬프트 튜닝 (실사용 샘플 → PROMPT_VERSION 올림)
- Task 39: Rate limit 미들웨어 (FastAPI) + 구조화 로깅 JSON 포맷 + 토큰 사용량 DB 저장
- Task 40: 보안 체크리스트 §9.3 7개 전체 수동 검증 + 문서에 통과 표시

---

## Self-Review (writing-plans skill 체크리스트)

### 1. Spec coverage
| Spec 섹션 | 관련 task |
|----------|-----------|
| §1.3 범위 (실기만, 4단계 위저드) | Task 24-26, 33, 37 |
| §2 스택 결정 (FastAPI, Supabase, OpenAI-compatible) | Task 1, 5 |
| §3 아키텍처 | Task 1 + Phase 5 프록시 |
| §4.1 agent_sessions 테이블 | Task 2, 14 |
| §4.2 기존 소스 | Task 9-11 (읽기 전용 사용) |
| §5 태깅 체계 | 이미 완료 (커밋 9146b33), Task 11/20 집계 시 활용 |
| §6 툴 5개 | Task 8-13 |
| §6.4 보안 3원칙 | Task 13 (user_email override, expected_answer mask), Task 18 (mask in GET /session) |
| §7 run_agent | Task 15-16 |
| §8 UI 통합 (4단계 위저드) | Task 20-26, 33 |
| §8.3 API 라우트 | Task 21, 23, 34-36 |
| §9.1 에러 처리 4원칙 | Task 13 (tool error mask), Task 15 (MAX_ITER 처리) |
| §9.2 관찰성 | Task 39 |
| §9.3 보안 체크리스트 | Task 40 |
| §9.4 테스트 피라미드 | Unit: Task 3-15, Integration: Task 15, E2E: Task 19, 37 |
| §9.5 Done 기준 | Task 37 + Task 40 |
| §10 API 명세 | Task 6, 16-18 (FastAPI) + Task 21, 23, 34-36 (Next.js) |
| §11 환경변수 | Task 1 (config.py), Task 34-36 (Next.js 환경변수 사용) |
| §12 로드맵 Phase | 그대로 Phase 1-4 매핑 |

모든 spec 섹션이 task 로 매핑됨. 누락 없음.

### 2. Placeholder scan
- "TBD/TODO/later/add appropriate" 문구: 없음
- Phase 4-6 세부 task 는 개요만 있고 실제 구체 task 는 Phase 3 완료 후 part2 파일로 이어 작성한다고 명시 — placeholder 가 아닌 **계획된 분할**

### 3. Type consistency
- `AgentSession` 필드명 일관 (session_store.py 정의 ↔ serialize ↔ runner 에서 접근)
- 툴 이름 5개 TOOLS_SCHEMA ↔ dispatch_tool ↔ tests 전부 일치
- `ui_actions` 타입 일관: `{type: 'present_problem'|'evaluation', ...}`

### 4. Issues found
없음. 플랜 문서 Part 1 (Task 1-26) 완성.

---

## Execution Handoff

**Plan complete (Part 1, Task 1-26 상세 + Task 27-40 개요) and saved to `docs/superpowers/plans/2026-04-19-ai-tutor-agent-implementation.md`.**

Phase 3 까지 완료 후 Phase 4-6 세부 task 는 **Part 2 파일로 이어 작성** — Phase 3 실행 결과 보고 AgentChat 컴포넌트 세부 결정을 더 정확히 내리기 위함.

**두 가지 실행 옵션:**

**1. Subagent-Driven (권장)**
- 매 task 마다 새 subagent 가 fresh context 로 실행
- task 사이에 메인 에이전트가 리뷰
- 빠른 반복 · 컨텍스트 오염 최소

**2. Inline Execution**
- 이 세션에서 순차 실행
- 체크포인트마다 멈춰 확인
- 대화 맥락 활용 가능

**어느 방식으로 진행하시겠어요?**
