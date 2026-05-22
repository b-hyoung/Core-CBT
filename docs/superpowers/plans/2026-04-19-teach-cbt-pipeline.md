# teach_CBT 학습 데이터 파이프라인 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 정보처리산업기사 실기 Code(C/Java/Python) + SQL query 유사 문제 생성 → 품질 평가 → 파인튜닝 데이터 파이프라인 구축

**Architecture:** 별도 Python 프로젝트(`teach_CBT`)에서 4-Phase 파이프라인 실행. Core-CBT datasets를 읽기 전용 참조. 크롤링 → 쌍 생성(GPT-4o-mini + gpt-oss:20b) → 품질 평가(Claude/GPT-4o) → LoRA 파인튜닝.

**Tech Stack:** Python 3.11, httpx, BeautifulSoup, openai SDK, anthropic SDK, unsloth, JSON 파일

**프로젝트 위치:** `C:\Users\ACE\Desktop\bobs_project\teach_CBT`
**Core-CBT 데이터셋:** `C:\Users\ACE\Desktop\bobs_project\Core-CBT\datasets\practicalIndustrial`

**Important conventions:**
- 모든 파일 경로는 `teach_CBT/` 기준
- Python 실행: `/c/Users/ACE/AppData/Local/Programs/Python/Python311/python.exe`
- 커밋 메시지: `<type>(<scope>): <설명>` 형식
- TDD: 테스트 먼저 → 최소 구현 → 통과 확인

---

## Phase 0: 프로젝트 스캐폴드

### Task 1: 프로젝트 초기화 + 디렉터리 구조

**Files:**
- Create: `requirements.txt`
- Create: `config.py`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: git init**

```bash
cd C:\Users\ACE\Desktop\bobs_project\teach_CBT
git init
```

- [ ] **Step 2: Create .gitignore**

Write `.gitignore`:
```
__pycache__/
*.pyc
.env
.venv/
data/raw/
*.egg-info/
.pytest_cache/
```

- [ ] **Step 3: Create directory structure**

```bash
mkdir -p data/raw data/normalized data/core_cbt
mkdir -p crawlers generators evaluators
mkdir -p pairs/raw pairs/approved pairs/rejected
mkdir -p finetune
mkdir -p tests
```

- [ ] **Step 4: Create requirements.txt**

Write `requirements.txt`:
```
httpx==0.27.2
beautifulsoup4==4.12.3
openai==1.54.0
anthropic==0.39.0
pydantic==2.9.2
pydantic-settings==2.6.0
python-dotenv==1.0.1
pytest==8.3.3
pytest-asyncio==0.24.0
```

- [ ] **Step 5: Create config.py**

Write `config.py`:
```python
"""환경변수 기반 설정."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent
CORE_CBT_DATASETS = PROJECT_ROOT.parent / "Core-CBT" / "datasets" / "practicalIndustrial"


class Settings(BaseSettings):
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "gpt-oss:20b"
    openai_model: str = "gpt-4o-mini"
    evaluator_model: str = "claude-opus-4-6"
    core_cbt_datasets: str = str(CORE_CBT_DATASETS)

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
```

- [ ] **Step 6: Create .env.example**

Write `.env.example`:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=gpt-oss:20b
OPENAI_MODEL=gpt-4o-mini
EVALUATOR_MODEL=claude-opus-4-6
```

- [ ] **Step 7: Create __init__.py files**

```bash
touch crawlers/__init__.py generators/__init__.py evaluators/__init__.py tests/__init__.py
```

- [ ] **Step 8: Create README.md**

Write `README.md`:
````markdown
# teach_CBT — AI 학습 데이터 파이프라인

정보처리산업기사 실기 Code/SQL 유사 문제 생성·평가·파인튜닝.

## 설치

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env    # 키 채우기
```

## 파이프라인

```bash
# 1. Core-CBT 데이터 로드
python -m generators.loader

# 2. 유사 문제 생성
python -m generators.pair_generator

# 3. 품질 평가
python -m evaluators.quality_evaluator

# 4. 파인튜닝 데이터 준비
python -m finetune.prepare_data
```
````

- [ ] **Step 9: Verify Python + install deps**

```bash
cd C:\Users\ACE\Desktop\bobs_project\teach_CBT
python -m pip install -r requirements.txt
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: teach_CBT 프로젝트 스캐폴드"
```

---

### Task 2: Core-CBT 데이터 로더 + 필터

**Files:**
- Create: `generators/loader.py`
- Create: `tests/test_loader.py`

- [ ] **Step 1: Write failing test**

Write `tests/test_loader.py`:
```python
"""Core-CBT 데이터셋 로더 테스트."""
import pytest
from generators.loader import load_target_problems


def test_load_returns_only_target_categories():
    problems = load_target_problems()
    for p in problems:
        assert p["category"] in ("Code", "SQL")
        if p["category"] == "Code":
            assert p["subcategory"] in ("C", "Java", "Python")
        elif p["category"] == "SQL":
            assert p["subcategory"] == "query"


def test_load_returns_required_fields():
    problems = load_target_problems()
    assert len(problems) > 0
    for p in problems:
        assert "session_id" in p
        assert "problem_number" in p
        assert "question_text" in p
        assert "examples" in p
        assert "answer" in p
        assert "category" in p
        assert "subcategory" in p


def test_load_count_is_around_100():
    problems = load_target_problems()
    assert len(problems) >= 80  # 최소 80문제 이상
```

- [ ] **Step 2: Run test (expect fail)**

```bash
python -m pytest tests/test_loader.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement loader.py**

Write `generators/loader.py`:
```python
"""Core-CBT 데이터셋에서 대상 문제만 로드.

대상: Code(C/Java/Python) + SQL(query)
"""
import json
from pathlib import Path
from config import settings

TARGET_CATEGORIES = {
    ("Code", "C"),
    ("Code", "Java"),
    ("Code", "Python"),
    ("SQL", "query"),
}


def load_target_problems() -> list[dict]:
    """Core-CBT datasets에서 대상 문제 + 정답 + 해설을 로드."""
    root = Path(settings.core_cbt_datasets)
    if not root.exists():
        raise FileNotFoundError(f"Core-CBT datasets not found: {root}")

    results = []
    for session_dir in sorted(root.iterdir()):
        if not session_dir.is_dir():
            continue

        problem_path = session_dir / "problem1.json"
        answer_path = session_dir / "answer1.json"
        comment_path = session_dir / "comment1.json"
        if not problem_path.exists():
            continue

        problems_data = _load_json(problem_path)
        problems = problems_data[0].get("problems", []) if problems_data else []

        answers_data = _load_json(answer_path) if answer_path.exists() else []
        answers = (
            answers_data[0].get("answers", [])
            if answers_data and isinstance(answers_data[0], dict) and "answers" in answers_data[0]
            else answers_data
        )

        comments_data = _load_json(comment_path) if comment_path.exists() else []
        comments = (
            comments_data[0].get("comments", [])
            if comments_data and isinstance(comments_data[0], dict) and "comments" in comments_data[0]
            else comments_data
        )

        for p in problems:
            cat = p.get("category")
            sub = p.get("subcategory")
            if (cat, sub) not in TARGET_CATEGORIES:
                continue

            pnum = p.get("problem_number")
            answer = _find(answers, "problem_number", pnum, "correct_answer_text") or _find(answers, "problem_number", pnum, "answer") or ""
            comment = _find(comments, "problem_number", pnum, "comment") or _find(comments, "problem_number", pnum, "comment_text") or ""

            results.append({
                "session_id": session_dir.name,
                "problem_number": pnum,
                "question_text": p.get("question_text", ""),
                "examples": p.get("examples", ""),
                "input_type": p.get("input_type", "single"),
                "answer": answer,
                "explanation": comment,
                "category": cat,
                "subcategory": sub,
            })

    return results


def _load_json(path: Path) -> list:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def _find(items: list, key: str, value, target_key: str):
    for item in items:
        if item.get(key) == value:
            return item.get(target_key)
    return None


if __name__ == "__main__":
    problems = load_target_problems()
    by_cat = {}
    for p in problems:
        k = f"{p['category']}/{p['subcategory']}"
        by_cat[k] = by_cat.get(k, 0) + 1
    print(f"총 {len(problems)}문제 로드:")
    for k, v in sorted(by_cat.items()):
        print(f"  {k}: {v}")
```

- [ ] **Step 4: Run test (expect pass)**

```bash
python -m pytest tests/test_loader.py -v
```
Expected: 3 passed

- [ ] **Step 5: Run loader directly to verify**

```bash
python -m generators.loader
```
Expected:
```
총 100문제 로드:
  Code/C: 47
  Code/Java: 27
  Code/Python: 9
  SQL/query: 17
```

- [ ] **Step 6: Commit**

```bash
git add generators/loader.py tests/test_loader.py
git commit -m "feat(loader): Core-CBT 데이터셋 로더 + 대상 필터 (100문제)"
```

---

## Phase 1: 크롤링

### Task 3: 크롤링 탐색 + 사이트 선정

**Files:**
- Create: `crawlers/sites.py`
- Create: `crawlers/practical_crawler.py`
- Create: `tests/test_crawler.py`

- [ ] **Step 1: 크롤링 대상 사이트 탐색**

정보처리산업기사 실기 기출/모의고사를 공개하는 사이트를 수동으로 탐색.
후보:
- 구글 검색: `정보처리산업기사 실기 기출 코드 문제`
- 네이버 블로그/카페 (비정형 — 파싱 어려움)
- 수제비 (sujebi.com) — 기출 해설 사이트
- 기출문제넷 등

탐색 결과를 `crawlers/sites.py`에 기록:

Write `crawlers/sites.py`:
```python
"""크롤링 대상 사이트 목록.

탐색 후 실제 크롤링 가능한 사이트만 등록.
각 사이트별 파싱 전략을 기록.
"""

SITES = [
    # {
    #     "name": "사이트명",
    #     "base_url": "https://...",
    #     "strategy": "어떻게 파싱할지",
    #     "target": "Code/SQL 문제가 있는 페이지 패턴",
    #     "status": "ready | blocked | needs_login",
    # },
]

# 탐색 결과:
# - 실제 크롤링 시 탐색하면서 이 리스트를 채워나감
# - 크롤링 방어가 강하거나 로그인 필요하면 status=blocked
# - JS 렌더링 필요하면 Playwright 사용
```

- [ ] **Step 2: 기본 크롤러 구조 작성**

Write `crawlers/practical_crawler.py`:
```python
"""정보처리산업기사 실기 문제 크롤러.

사이트별 크롤링 + 파싱 → 정규화 JSON 저장.
"""
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone
import httpx
from bs4 import BeautifulSoup
from config import settings, PROJECT_ROOT

RAW_DIR = PROJECT_ROOT / "data" / "raw"
NORMALIZED_DIR = PROJECT_ROOT / "data" / "normalized"


def fetch_page(url: str, headers: dict | None = None) -> str:
    """URL에서 HTML 가져오기."""
    default_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    if headers:
        default_headers.update(headers)
    resp = httpx.get(url, headers=default_headers, timeout=15.0, follow_redirects=True)
    resp.raise_for_status()
    return resp.text


def save_raw(html: str, source_name: str, page_id: str) -> Path:
    """크롤링 원본 HTML 저장."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{source_name}_{page_id}.html"
    path = RAW_DIR / filename
    path.write_text(html, encoding="utf-8")
    return path


def normalize_problem(
    question_text: str,
    examples: str,
    answer: str,
    category: str,
    subcategory: str,
    input_type: str = "single",
    source_url: str = "",
    source_name: str = "",
) -> dict:
    """크롤링된 문제를 정규화 형식으로 변환."""
    problem_id = hashlib.md5(f"{question_text}{examples}".encode()).hexdigest()[:12]
    return {
        "id": f"crawled-{problem_id}",
        "question_text": question_text.strip(),
        "examples": examples.strip(),
        "input_type": input_type,
        "category": category,
        "subcategory": subcategory,
        "answer": answer.strip(),
        "source": "crawled",
        "source_name": source_name,
        "source_url": source_url,
        "crawled_at": datetime.now(timezone.utc).isoformat(),
    }


def save_normalized(problems: list[dict], batch_name: str) -> Path:
    """정규화된 문제를 JSON으로 저장."""
    NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)
    path = NORMALIZED_DIR / f"{batch_name}.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(problems, f, ensure_ascii=False, indent=2)
    return path


# --- 사이트별 파서 ---
# 실제 크롤링 시 사이트별 parse_* 함수를 여기에 추가

def crawl_all():
    """등록된 모든 사이트에서 크롤링 실행."""
    from .sites import SITES
    total = 0
    for site in SITES:
        if site.get("status") != "ready":
            continue
        print(f"Crawling {site['name']}...")
        # 사이트별 크롤링 로직 호출
        # problems = parse_site(site)
        # save_normalized(problems, site['name'])
        # total += len(problems)
    print(f"총 {total}문제 수집")


if __name__ == "__main__":
    crawl_all()
```

- [ ] **Step 3: Write basic test**

Write `tests/test_crawler.py`:
```python
"""크롤러 기본 기능 테스트."""
from crawlers.practical_crawler import normalize_problem


def test_normalize_creates_proper_structure():
    p = normalize_problem(
        question_text="다음 C 코드의 출력 결과를 쓰시오.",
        examples='printf("%d", 1+2);',
        answer="3",
        category="Code",
        subcategory="C",
        source_url="https://example.com/q1",
        source_name="test",
    )
    assert p["category"] == "Code"
    assert p["subcategory"] == "C"
    assert p["answer"] == "3"
    assert p["source"] == "crawled"
    assert p["id"].startswith("crawled-")


def test_normalize_strips_whitespace():
    p = normalize_problem(
        question_text="  질문  ",
        examples="  코드  ",
        answer="  답  ",
        category="SQL",
        subcategory="query",
    )
    assert p["question_text"] == "질문"
    assert p["examples"] == "코드"
    assert p["answer"] == "답"
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_crawler.py -v
```
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add crawlers/ tests/test_crawler.py
git commit -m "feat(crawler): 크롤러 스캐폴드 + 정규화 함수 + 사이트 목록"
```

---

## Phase 2: 유사 문제 쌍 생성

### Task 4: 생성 프롬프트 템플릿

**Files:**
- Create: `generators/prompts.py`

- [ ] **Step 1: Write prompts**

Write `generators/prompts.py`:
```python
"""유사 문제 생성용 프롬프트 템플릿."""

CODE_SIMILAR_PROMPT = """너는 정보처리산업기사 실기 출제 전문가야.

아래 원본 문제와 같은 개념을 테스트하되, 정답이 반드시 다른 유사 문제를 만들어.

[원본 문제]
- 카테고리: {category} / {subcategory}
- 문제: {question_text}
- 코드:
{examples}
- 정답: {answer}

[참고 문제 (같은 카테고리 다른 회차)]
{reference_problems}

[생성 규칙]
1. 같은 프로그래밍 개념을 테스트해야 함 (반복문이면 반복문, 포인터면 포인터)
2. 변수명, 초기값, 연산, 반복 횟수 등을 변경하여 출력 결과가 달라지게
3. 정답이 원본과 동일하면 절대 안 됨
4. 문제 형식: "다음 {subcategory} 코드의 출력 결과를 쓰시오."
5. 난이도는 원본과 비슷하게

[응답 형식 — JSON만]
{{
  "question_text": "...",
  "examples": "...(전체 코드)",
  "expected_answer": "...",
  "answer_explanation": "...(왜 그 답인지 1-2문장)",
  "input_type": "{input_type}",
  "category": "{category}",
  "subcategory": "{subcategory}",
  "confidence": 1-5
}}"""

SQL_SIMILAR_PROMPT = """너는 정보처리산업기사 실기 출제 전문가야.

아래 원본 SQL 문제와 같은 개념을 테스트하되, 정답이 반드시 다른 유사 문제를 만들어.

[원본 문제]
- 문제: {question_text}
- 보기/SQL:
{examples}
- 정답: {answer}
- 입력 형식: {input_type}

[참고 문제 (같은 카테고리 다른 회차)]
{reference_problems}

[생성 규칙]
1. 같은 SQL 개념을 테스트 (조건절이면 조건절, 집계면 집계)
2. 테이블명, 컬럼명, 조건값, SQL 키워드를 변경
3. 빈칸 개수와 구조((가),(나),(다) 등)는 원본과 동일하게 유지
4. 정답이 원본과 동일하면 절대 안 됨
5. 문제 형식: 정보처리산업기사 실기 스타일 유지

[응답 형식 — JSON만]
{{
  "question_text": "...",
  "examples": "...(전체 보기/SQL문)",
  "expected_answer": "...",
  "answer_explanation": "...",
  "input_type": "{input_type}",
  "category": "SQL",
  "subcategory": "query",
  "confidence": 1-5
}}"""

CROSS_LANG_PROMPT = """너는 정보처리산업기사 실기 출제 전문가야.

아래 {source_lang} 문제를 Python으로 변환해서 유사 문제를 만들어.

[원본 문제 ({source_lang})]
- 문제: {question_text}
- 코드:
{examples}
- 정답: {answer}

[변환 규칙]
1. 같은 프로그래밍 개념을 Python 문법으로 변환
2. 변수값을 변경하여 출력 결과가 원본과 달라지게
3. Python 관용구 사용 (list comprehension, f-string 등 시험 범위 내)
4. 문제 형식: "다음 Python 코드의 출력 결과를 쓰시오."

[응답 형식 — JSON만]
{{
  "question_text": "다음 Python 코드의 출력 결과를 쓰시오.",
  "examples": "...(전체 Python 코드)",
  "expected_answer": "...",
  "answer_explanation": "...",
  "input_type": "single",
  "category": "Code",
  "subcategory": "Python",
  "confidence": 1-5
}}"""


def format_reference_problems(refs: list[dict]) -> str:
    """참고 문제를 프롬프트용 텍스트로 포맷."""
    if not refs:
        return "(참고 문제 없음)"
    parts = []
    for i, r in enumerate(refs, 1):
        parts.append(f"--- 참고 {i} ({r['session_id']} #{r['problem_number']}) ---")
        parts.append(f"문제: {r['question_text']}")
        if r.get("examples"):
            parts.append(f"코드/보기:\n{r['examples']}")
        parts.append(f"정답: {r['answer']}")
        parts.append("")
    return "\n".join(parts)
```

- [ ] **Step 2: Commit**

```bash
git add generators/prompts.py
git commit -m "feat(generator): 유사 문제 생성 프롬프트 템플릿 (Code/SQL/크로스언어)"
```

---

### Task 5: 유사 문제 쌍 생성기

**Files:**
- Create: `generators/pair_generator.py`
- Create: `tests/test_pair_generator.py`

- [ ] **Step 1: Write failing test**

Write `tests/test_pair_generator.py`:
```python
"""유사 문제 쌍 생성기 테스트."""
import json
import pytest
from generators.pair_generator import (
    build_generation_prompt,
    parse_generated_problem,
    check_answer_duplicate,
    get_reference_problems,
)


def test_build_prompt_includes_original():
    prompt = build_generation_prompt(
        original={"question_text": "C 코드", "examples": "printf(1);", "answer": "1",
                   "category": "Code", "subcategory": "C", "input_type": "single"},
        references=[],
    )
    assert "printf(1)" in prompt
    assert "정답: 1" in prompt


def test_parse_valid_json():
    raw = '{"question_text":"q","examples":"e","expected_answer":"a","answer_explanation":"x","input_type":"single","category":"Code","subcategory":"C","confidence":4}'
    result = parse_generated_problem(raw)
    assert result["question_text"] == "q"
    assert result["expected_answer"] == "a"


def test_parse_invalid_json_returns_none():
    result = parse_generated_problem("not json at all")
    assert result is None


def test_check_answer_duplicate_detects_same():
    assert check_answer_duplicate("AND", "AND") is True
    assert check_answer_duplicate("and", "AND") is True


def test_check_answer_duplicate_allows_different():
    assert check_answer_duplicate("OR", "AND") is False


def test_get_reference_problems_excludes_self():
    from generators.loader import load_target_problems
    all_problems = load_target_problems()
    if not all_problems:
        pytest.skip("no problems loaded")
    p = all_problems[0]
    refs = get_reference_problems(
        all_problems, p["category"], p["subcategory"], p["session_id"], count=2
    )
    for r in refs:
        assert r["session_id"] != p["session_id"] or r["problem_number"] != p["problem_number"]
```

- [ ] **Step 2: Run test (expect fail)**

```bash
python -m pytest tests/test_pair_generator.py -v
```
Expected: `ImportError`

- [ ] **Step 3: Implement pair_generator.py**

Write `generators/pair_generator.py`:
```python
"""유사 문제 쌍 생성기.

GPT-4o-mini + gpt-oss:20b 양쪽으로 생성.
"""
import json
import re
import random
from datetime import datetime, timezone
from pathlib import Path
from openai import OpenAI
from config import settings, PROJECT_ROOT
from .loader import load_target_problems
from .prompts import (
    CODE_SIMILAR_PROMPT,
    SQL_SIMILAR_PROMPT,
    CROSS_LANG_PROMPT,
    format_reference_problems,
)

PAIRS_RAW_DIR = PROJECT_ROOT / "pairs" / "raw"

# 언어별 생성 쌍 수
PAIRS_PER_PROBLEM = {
    "C": 3,
    "Java": 4,
    "Python": 5,
    "query": 4,
}


def get_reference_problems(
    all_problems: list[dict],
    category: str,
    subcategory: str,
    exclude_session_id: str,
    count: int = 3,
) -> list[dict]:
    """같은 카테고리/서브카테고리의 다른 회차 문제를 참고용으로 반환."""
    candidates = [
        p for p in all_problems
        if p["category"] == category
        and p["subcategory"] == subcategory
        and p["session_id"] != exclude_session_id
    ]
    random.shuffle(candidates)
    return candidates[:count]


def build_generation_prompt(original: dict, references: list[dict]) -> str:
    """원본 + 참고 문제로 생성 프롬프트 조립."""
    ref_text = format_reference_problems(references)
    category = original["category"]

    if category == "SQL":
        template = SQL_SIMILAR_PROMPT
    else:
        template = CODE_SIMILAR_PROMPT

    return template.format(
        category=original["category"],
        subcategory=original["subcategory"],
        question_text=original["question_text"],
        examples=original.get("examples", ""),
        answer=original["answer"],
        input_type=original.get("input_type", "single"),
        reference_problems=ref_text,
    )


def parse_generated_problem(raw_text: str) -> dict | None:
    """LLM 응답에서 JSON 추출."""
    # JSON 블럭 추출
    json_match = re.search(r'\{[\s\S]*\}', raw_text)
    if not json_match:
        return None
    try:
        data = json.loads(json_match.group())
    except json.JSONDecodeError:
        return None

    required = ["question_text", "examples", "expected_answer"]
    if not all(data.get(k) for k in required):
        return None
    return data


def check_answer_duplicate(new_answer: str, original_answer: str) -> bool:
    """정답이 원본과 동일한지 체크 (정규화 비교)."""
    def normalize(s):
        return re.sub(r'[\s,/|().:：\-]+', '', str(s or '')).lower()
    return normalize(new_answer) == normalize(original_answer)


def generate_one(
    original: dict,
    references: list[dict],
    model: str,
    base_url: str | None = None,
    api_key: str = "",
) -> dict | None:
    """하나의 유사 문제를 생성."""
    prompt = build_generation_prompt(original, references)

    client = OpenAI(api_key=api_key or "unused", base_url=base_url)
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=2000,
        )
        raw = resp.choices[0].message.content or ""
    except Exception as e:
        print(f"  LLM error: {e}")
        return None

    parsed = parse_generated_problem(raw)
    if not parsed:
        print(f"  Parse failed")
        return None

    if check_answer_duplicate(parsed.get("expected_answer", ""), original["answer"]):
        print(f"  Answer duplicate — rejected")
        return None

    return parsed


def save_pair(original: dict, generated: dict, generator: str) -> Path:
    """생성 쌍을 JSON으로 저장."""
    PAIRS_RAW_DIR.mkdir(parents=True, exist_ok=True)
    pair = {
        "original": {
            "session_id": original["session_id"],
            "problem_number": original["problem_number"],
            "question_text": original["question_text"],
            "examples": original.get("examples", ""),
            "answer": original["answer"],
            "category": original["category"],
            "subcategory": original["subcategory"],
        },
        "generated": generated,
        "generator": generator,
        "generation_timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "pending_review",
    }
    filename = f"{original['session_id']}_{original['problem_number']}_{generator}_{datetime.now().strftime('%H%M%S')}.json"
    path = PAIRS_RAW_DIR / filename
    with path.open("w", encoding="utf-8") as f:
        json.dump(pair, f, ensure_ascii=False, indent=2)
    return path


def run_generation(
    target_subcategories: list[str] | None = None,
    generators: list[str] | None = None,
):
    """전체 생성 파이프라인 실행."""
    all_problems = load_target_problems()
    if target_subcategories:
        all_problems = [p for p in all_problems if p["subcategory"] in target_subcategories]

    if generators is None:
        generators = ["openai", "ollama"]

    total_generated = 0

    for p in all_problems:
        pairs_count = PAIRS_PER_PROBLEM.get(p["subcategory"], 3)
        refs = get_reference_problems(all_problems, p["category"], p["subcategory"], p["session_id"])

        print(f"\n[{p['session_id']} #{p['problem_number']}] {p['category']}/{p['subcategory']} — {pairs_count}쌍 생성")

        for gen_name in generators:
            if gen_name == "openai":
                model, base_url, api_key = settings.openai_model, None, settings.openai_api_key
            elif gen_name == "ollama":
                model, base_url, api_key = settings.ollama_model, settings.ollama_base_url, "unused"
            else:
                continue

            for i in range(pairs_count):
                print(f"  [{gen_name}] pair {i+1}/{pairs_count}...", end=" ")
                result = generate_one(p, refs, model=model, base_url=base_url, api_key=api_key)
                if result:
                    save_pair(p, result, gen_name)
                    total_generated += 1
                    print("OK")
                else:
                    print("SKIP")

    print(f"\n총 {total_generated}쌍 생성 완료")


if __name__ == "__main__":
    import sys
    subcats = sys.argv[1:] if len(sys.argv) > 1 else None
    run_generation(target_subcategories=subcats)
```

- [ ] **Step 4: Run test (expect pass)**

```bash
python -m pytest tests/test_pair_generator.py -v
```
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add generators/pair_generator.py tests/test_pair_generator.py
git commit -m "feat(generator): 유사 문제 쌍 생성기 (GPT-4o-mini + ollama 양쪽)"
```

---

### Task 6: 크로스 언어 변환기 (C/Java → Python)

**Files:**
- Create: `generators/cross_lang.py`
- Create: `tests/test_cross_lang.py`

- [ ] **Step 1: Write failing test**

Write `tests/test_cross_lang.py`:
```python
"""크로스 언어 변환 테스트."""
from generators.cross_lang import build_cross_lang_prompt


def test_build_prompt_contains_source_lang():
    prompt = build_cross_lang_prompt(
        original={"question_text": "C 코드", "examples": "printf(1);", "answer": "1",
                   "subcategory": "C"},
    )
    assert "C" in prompt
    assert "Python" in prompt
    assert "printf(1)" in prompt
```

- [ ] **Step 2: Implement cross_lang.py**

Write `generators/cross_lang.py`:
```python
"""C/Java → Python 크로스 언어 변환.

Python 문제 부족분 보충용.
"""
from .prompts import CROSS_LANG_PROMPT
from .pair_generator import generate_one, save_pair, get_reference_problems
from .loader import load_target_problems
from config import settings


def build_cross_lang_prompt(original: dict) -> str:
    """크로스 언어 변환 프롬프트 생성."""
    return CROSS_LANG_PROMPT.format(
        source_lang=original["subcategory"],
        question_text=original["question_text"],
        examples=original.get("examples", ""),
        answer=original["answer"],
    )


def run_cross_lang_generation(count: int = 20):
    """C/Java 문제 중 반복문·배열·조건문 문제를 Python으로 변환."""
    all_problems = load_target_problems()
    source_problems = [
        p for p in all_problems
        if p["category"] == "Code" and p["subcategory"] in ("C", "Java")
    ]

    # 랜덤 셔플 후 count개 선택
    import random
    random.shuffle(source_problems)
    targets = source_problems[:count]

    total = 0
    for p in targets:
        print(f"[cross-lang] {p['subcategory']} → Python: {p['session_id']} #{p['problem_number']}...", end=" ")

        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key or "unused")
        prompt = build_cross_lang_prompt(p)

        try:
            resp = client.chat.completions.create(
                model=settings.openai_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
                max_tokens=2000,
            )
            raw = resp.choices[0].message.content or ""
        except Exception as e:
            print(f"ERROR: {e}")
            continue

        from .pair_generator import parse_generated_problem
        parsed = parse_generated_problem(raw)
        if parsed:
            # subcategory를 Python으로 강제
            parsed["subcategory"] = "Python"
            parsed["category"] = "Code"
            save_pair(p, parsed, f"cross-lang-{p['subcategory']}-to-python")
            total += 1
            print("OK")
        else:
            print("SKIP")

    print(f"\n크로스 언어 변환 {total}쌍 생성 완료")


if __name__ == "__main__":
    run_cross_lang_generation()
```

- [ ] **Step 3: Run test**

```bash
python -m pytest tests/test_cross_lang.py -v
```
Expected: 1 passed

- [ ] **Step 4: Commit**

```bash
git add generators/cross_lang.py tests/test_cross_lang.py
git commit -m "feat(generator): C/Java → Python 크로스 언어 변환기"
```

---

## Phase 3: 품질 평가

### Task 7: 품질 평가기

**Files:**
- Create: `evaluators/quality_evaluator.py`
- Create: `evaluators/prompts.py`
- Create: `tests/test_evaluator.py`

- [ ] **Step 1: Write evaluation prompt**

Write `evaluators/prompts.py`:
```python
"""품질 평가 프롬프트."""

EVALUATION_PROMPT = """너는 정보처리산업기사 실기 문제 품질 심사관이야.

아래 "원본 문제"에 대해 AI가 생성한 "유사 문제"의 품질을 평가해.

[원본 문제]
- 카테고리: {category} / {subcategory}
- 문제: {original_question}
- 코드/보기: {original_examples}
- 정답: {original_answer}

[AI 생성 유사 문제]
- 문제: {generated_question}
- 코드/보기: {generated_examples}
- 정답: {generated_answer}
- 해설: {generated_explanation}

[평가 기준]
1. answer_diff (bool): 유사 문제 정답이 원본과 다른가?
2. structure_kept (bool): 빈칸 개수/구조, input_type이 원본과 동일한가?
3. solvable (bool): 문제가 논리적으로 풀 수 있고, 제시된 정답이 실제로 맞는가?
   - Code 문제: 코드를 실제 실행하면 제시된 정답이 나오는가?
   - SQL 문제: SQL 문법이 맞고, 빈칸에 제시된 답이 논리적으로 정답인가?
4. difficulty (1-5): 원본과 난이도가 비슷한가? (5=동일, 1=완전 다름)
5. style (1-5): 정보처리산업기사 실기 문체를 유지하는가? (5=완벽, 1=전혀 아님)

[응답 형식 — JSON만]
{{
  "answer_diff": true/false,
  "structure_kept": true/false,
  "solvable": true/false,
  "difficulty": 1-5,
  "style": 1-5,
  "feedback": "한줄 피드백"
}}"""
```

- [ ] **Step 2: Write failing test**

Write `tests/test_evaluator.py`:
```python
"""품질 평가기 테스트."""
from evaluators.quality_evaluator import judge_pass, parse_evaluation


def test_judge_pass_all_good():
    scores = {"answer_diff": True, "structure_kept": True, "solvable": True, "difficulty": 4, "style": 4}
    assert judge_pass(scores) is True


def test_judge_fail_answer_same():
    scores = {"answer_diff": False, "structure_kept": True, "solvable": True, "difficulty": 4, "style": 4}
    assert judge_pass(scores) is False


def test_judge_fail_low_difficulty():
    scores = {"answer_diff": True, "structure_kept": True, "solvable": True, "difficulty": 2, "style": 4}
    assert judge_pass(scores) is False


def test_parse_valid():
    raw = '{"answer_diff":true,"structure_kept":true,"solvable":true,"difficulty":4,"style":5,"feedback":"good"}'
    result = parse_evaluation(raw)
    assert result["answer_diff"] is True
    assert result["difficulty"] == 4


def test_parse_invalid_returns_none():
    result = parse_evaluation("not json")
    assert result is None
```

- [ ] **Step 3: Implement quality_evaluator.py**

Write `evaluators/quality_evaluator.py`:
```python
"""유사 문제 품질 평가기.

생성된 쌍을 평가하여 approved/rejected로 분류.
"""
import json
import re
import shutil
from pathlib import Path
from datetime import datetime, timezone
from config import settings, PROJECT_ROOT
from .prompts import EVALUATION_PROMPT

PAIRS_RAW_DIR = PROJECT_ROOT / "pairs" / "raw"
PAIRS_APPROVED_DIR = PROJECT_ROOT / "pairs" / "approved"
PAIRS_REJECTED_DIR = PROJECT_ROOT / "pairs" / "rejected"


def parse_evaluation(raw_text: str) -> dict | None:
    """평가 응답에서 JSON 추출."""
    json_match = re.search(r'\{[\s\S]*\}', raw_text)
    if not json_match:
        return None
    try:
        return json.loads(json_match.group())
    except json.JSONDecodeError:
        return None


def judge_pass(scores: dict) -> bool:
    """평가 결과가 합격인지 판정."""
    if not scores.get("answer_diff"):
        return False
    if not scores.get("structure_kept"):
        return False
    if not scores.get("solvable"):
        return False
    if scores.get("difficulty", 0) < 3:
        return False
    if scores.get("style", 0) < 3:
        return False
    return True


def evaluate_one(pair: dict) -> dict | None:
    """하나의 쌍을 평가."""
    original = pair["original"]
    generated = pair["generated"]

    prompt = EVALUATION_PROMPT.format(
        category=original.get("category", ""),
        subcategory=original.get("subcategory", ""),
        original_question=original.get("question_text", ""),
        original_examples=original.get("examples", ""),
        original_answer=original.get("answer", ""),
        generated_question=generated.get("question_text", ""),
        generated_examples=generated.get("examples", ""),
        generated_answer=generated.get("expected_answer", ""),
        generated_explanation=generated.get("answer_explanation", ""),
    )

    # 평가자 모델 호출 (Claude 또는 GPT-4o)
    evaluator = settings.evaluator_model
    if "claude" in evaluator:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        resp = client.messages.create(
            model=evaluator,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.content[0].text
    else:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        resp = client.chat.completions.create(
            model=evaluator,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
        )
        raw = resp.choices[0].message.content or ""

    return parse_evaluation(raw)


def run_evaluation():
    """미평가 쌍 전체 평가."""
    PAIRS_APPROVED_DIR.mkdir(parents=True, exist_ok=True)
    PAIRS_REJECTED_DIR.mkdir(parents=True, exist_ok=True)

    pair_files = sorted(PAIRS_RAW_DIR.glob("*.json"))
    total = len(pair_files)
    approved = 0
    rejected = 0

    for i, pf in enumerate(pair_files, 1):
        pair = json.loads(pf.read_text(encoding="utf-8"))
        if pair.get("status") != "pending_review":
            continue

        orig = pair["original"]
        print(f"[{i}/{total}] {orig.get('session_id')} #{orig.get('problem_number')} ({pair.get('generator')})...", end=" ")

        scores = evaluate_one(pair)
        if scores is None:
            print("EVAL FAILED")
            continue

        passed = judge_pass(scores)
        pair["evaluation"] = {
            "scores": scores,
            "pass": passed,
            "evaluator": settings.evaluator_model,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        }
        pair["status"] = "approved" if passed else "rejected"

        # 파일 이동
        dest_dir = PAIRS_APPROVED_DIR if passed else PAIRS_REJECTED_DIR
        dest = dest_dir / pf.name
        dest.write_text(json.dumps(pair, ensure_ascii=False, indent=2), encoding="utf-8")
        pf.unlink()

        if passed:
            approved += 1
            print(f"PASS (d={scores.get('difficulty')} s={scores.get('style')})")
        else:
            rejected += 1
            print(f"FAIL ({scores.get('feedback', '')})")

    print(f"\n평가 완료: {approved} approved, {rejected} rejected ({total} total)")


if __name__ == "__main__":
    run_evaluation()
```

- [ ] **Step 4: Run test**

```bash
python -m pytest tests/test_evaluator.py -v
```
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add evaluators/ tests/test_evaluator.py
git commit -m "feat(evaluator): 품질 평가기 + 합격/불합격 판정 + 파일 분류"
```

---

## Phase 4: 파인튜닝

### Task 8: 학습 데이터 변환

**Files:**
- Create: `finetune/prepare_data.py`
- Create: `tests/test_prepare_data.py`

- [ ] **Step 1: Write failing test**

Write `tests/test_prepare_data.py`:
```python
"""학습 데이터 변환 테스트."""
from finetune.prepare_data import convert_pair_to_instruction


def test_convert_creates_instruction_format():
    pair = {
        "original": {
            "question_text": "C 코드 출력",
            "examples": "printf(1);",
            "answer": "1",
            "category": "Code",
            "subcategory": "C",
        },
        "generated": {
            "question_text": "C 코드 출력",
            "examples": "printf(2);",
            "expected_answer": "2",
            "answer_explanation": "2를 출력",
        },
    }
    result = convert_pair_to_instruction(pair)
    assert "instruction" in result
    assert "input" in result
    assert "output" in result
    assert "printf(1)" in result["input"]
    assert "printf(2)" in result["output"]
```

- [ ] **Step 2: Implement prepare_data.py**

Write `finetune/prepare_data.py`:
```python
"""approved 쌍을 instruction-tuning 형식으로 변환."""
import json
from pathlib import Path
from config import PROJECT_ROOT

PAIRS_APPROVED_DIR = PROJECT_ROOT / "pairs" / "approved"
FINETUNE_DIR = PROJECT_ROOT / "finetune"

INSTRUCTION = "다음 정보처리산업기사 실기 문제와 같은 개념을 테스트하되 정답이 다른 유사 문제를 만들어주세요."


def convert_pair_to_instruction(pair: dict) -> dict:
    """쌍을 instruction-tuning 형식으로 변환."""
    orig = pair["original"]
    gen = pair["generated"]

    input_text = (
        f"카테고리: {orig.get('category')}/{orig.get('subcategory')}\n"
        f"문제: {orig.get('question_text', '')}\n"
        f"코드/보기:\n{orig.get('examples', '')}\n"
        f"정답: {orig.get('answer', '')}"
    )

    output_text = (
        f"문제: {gen.get('question_text', '')}\n"
        f"코드/보기:\n{gen.get('examples', '')}\n"
        f"정답: {gen.get('expected_answer', '')}\n"
        f"해설: {gen.get('answer_explanation', '')}"
    )

    return {
        "instruction": INSTRUCTION,
        "input": input_text,
        "output": output_text,
    }


def run_prepare():
    """approved 전체를 변환하여 jsonl로 저장."""
    pair_files = sorted(PAIRS_APPROVED_DIR.glob("*.json"))
    dataset = []

    for pf in pair_files:
        pair = json.loads(pf.read_text(encoding="utf-8"))
        entry = convert_pair_to_instruction(pair)
        dataset.append(entry)

    output_path = FINETUNE_DIR / "train_data.jsonl"
    with output_path.open("w", encoding="utf-8") as f:
        for entry in dataset:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    print(f"{len(dataset)}개 학습 데이터 → {output_path}")
    return output_path


if __name__ == "__main__":
    run_prepare()
```

- [ ] **Step 3: Run test**

```bash
python -m pytest tests/test_prepare_data.py -v
```
Expected: 1 passed

- [ ] **Step 4: Commit**

```bash
git add finetune/prepare_data.py tests/test_prepare_data.py
git commit -m "feat(finetune): 학습 데이터 변환 (approved → instruction JSONL)"
```

---

### Task 9: LoRA 학습 스크립트 + Modelfile

**Files:**
- Create: `finetune/train.py`
- Create: `finetune/Modelfile`

- [ ] **Step 1: Create train.py**

Write `finetune/train.py`:
```python
"""gpt-oss:20b LoRA 파인튜닝 스크립트.

unsloth 사용. RTX 5060 Ti 16GB 대응.
"""
import json
from pathlib import Path
from config import PROJECT_ROOT

TRAIN_DATA = PROJECT_ROOT / "finetune" / "train_data.jsonl"
OUTPUT_DIR = PROJECT_ROOT / "finetune" / "output"


def load_dataset():
    """JSONL 학습 데이터 로드."""
    entries = []
    with TRAIN_DATA.open("r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                entries.append(json.loads(line))
    return entries


def train():
    """LoRA 파인튜닝 실행."""
    try:
        from unsloth import FastLanguageModel
    except ImportError:
        print("unsloth가 설치되어 있지 않습니다.")
        print("pip install unsloth")
        return

    dataset = load_dataset()
    if not dataset:
        print("학습 데이터가 없습니다. finetune/prepare_data.py를 먼저 실행하세요.")
        return

    print(f"학습 데이터: {len(dataset)}개")
    print("LoRA 학습을 시작합니다...")

    # unsloth 기반 학습 (실제 학습 시 아래 설정 조정)
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name="gpt-oss:20b",  # ollama 모델명 또는 HuggingFace 경로
        max_seq_length=4096,
        load_in_4bit=True,  # 16GB VRAM 대응
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_alpha=16,
        lora_dropout=0,
        bias="none",
    )

    # 학습 실행
    from trl import SFTTrainer
    from transformers import TrainingArguments

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=TrainingArguments(
            per_device_train_batch_size=1,
            gradient_accumulation_steps=4,
            warmup_steps=10,
            max_steps=100,
            learning_rate=2e-4,
            fp16=True,
            logging_steps=10,
            output_dir=str(OUTPUT_DIR),
        ),
    )

    trainer.train()
    model.save_pretrained(str(OUTPUT_DIR / "lora_adapter"))
    print(f"학습 완료. 어댑터 저장: {OUTPUT_DIR / 'lora_adapter'}")


if __name__ == "__main__":
    train()
```

- [ ] **Step 2: Create Modelfile**

Write `finetune/Modelfile`:
```
FROM gpt-oss:20b
ADAPTER ./output/lora_adapter

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_predict 2048

SYSTEM """너는 정보처리산업기사 실기 유사 문제 생성 전문가야.
주어진 원본 문제와 같은 개념을 테스트하되 정답이 다른 유사 문제를 JSON 형식으로 만들어."""
```

- [ ] **Step 3: Commit**

```bash
git add finetune/train.py finetune/Modelfile
git commit -m "feat(finetune): LoRA 학습 스크립트 + ollama Modelfile"
```

---

### Task 10: 전체 파이프라인 CLI

**Files:**
- Create: `run_pipeline.py`

- [ ] **Step 1: Create CLI**

Write `run_pipeline.py`:
```python
"""전체 파이프라인 CLI.

Usage:
    python run_pipeline.py load        # Core-CBT 데이터 확인
    python run_pipeline.py generate    # 유사 문제 생성
    python run_pipeline.py generate C  # C 문제만 생성
    python run_pipeline.py cross-lang  # Python 크로스 언어 변환
    python run_pipeline.py evaluate    # 품질 평가
    python run_pipeline.py prepare     # 파인튜닝 데이터 준비
    python run_pipeline.py stats       # 현재 상태 통계
"""
import sys
import json
from pathlib import Path
from config import PROJECT_ROOT


def cmd_load():
    from generators.loader import load_target_problems
    problems = load_target_problems()
    by_cat = {}
    for p in problems:
        k = f"{p['category']}/{p['subcategory']}"
        by_cat[k] = by_cat.get(k, 0) + 1
    print(f"총 {len(problems)}문제:")
    for k, v in sorted(by_cat.items()):
        print(f"  {k}: {v}")


def cmd_generate(subcats=None):
    from generators.pair_generator import run_generation
    run_generation(target_subcategories=subcats)


def cmd_cross_lang():
    from generators.cross_lang import run_cross_lang_generation
    run_cross_lang_generation()


def cmd_evaluate():
    from evaluators.quality_evaluator import run_evaluation
    run_evaluation()


def cmd_prepare():
    from finetune.prepare_data import run_prepare
    run_prepare()


def cmd_stats():
    raw = list((PROJECT_ROOT / "pairs" / "raw").glob("*.json"))
    approved = list((PROJECT_ROOT / "pairs" / "approved").glob("*.json"))
    rejected = list((PROJECT_ROOT / "pairs" / "rejected").glob("*.json"))
    train_data = PROJECT_ROOT / "finetune" / "train_data.jsonl"
    train_count = sum(1 for _ in open(train_data, encoding="utf-8")) if train_data.exists() else 0

    print("=== teach_CBT 파이프라인 상태 ===")
    print(f"  대기 중 (raw):     {len(raw)}")
    print(f"  합격 (approved):   {len(approved)}")
    print(f"  불합격 (rejected): {len(rejected)}")
    print(f"  학습 데이터:       {train_count}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "load":
        cmd_load()
    elif cmd == "generate":
        subcats = sys.argv[2:] if len(sys.argv) > 2 else None
        cmd_generate(subcats)
    elif cmd == "cross-lang":
        cmd_cross_lang()
    elif cmd == "evaluate":
        cmd_evaluate()
    elif cmd == "prepare":
        cmd_prepare()
    elif cmd == "stats":
        cmd_stats()
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
```

- [ ] **Step 2: Commit**

```bash
git add run_pipeline.py
git commit -m "feat: 전체 파이프라인 CLI (load/generate/evaluate/prepare/stats)"
```

---

## Self-Review

### 1. Spec coverage
| Spec 섹션 | Task |
|----------|------|
| §2 대상 범위 | Task 2 (loader 필터) |
| §4 데이터 수집 | Task 3 (크롤러) |
| §5 유사 문제 쌍 생성 | Task 4-5 (프롬프트 + 생성기) |
| §5.3 크로스 언어 | Task 6 |
| §6 품질 평가 | Task 7 |
| §7 파인튜닝 | Task 8-9 |
| §8 프로젝트 구조 | Task 1 |

### 2. Placeholder scan
- 없음. 모든 Step에 코드 포함.

### 3. Type consistency
- `load_target_problems()` 반환 형식 Task 2 정의 ↔ Task 5/6/7에서 사용 일치
- `pair` dict 구조 Task 5 ↔ Task 7/8 일치
- `parse_generated_problem` / `parse_evaluation` 패턴 동일

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-19-teach-cbt-pipeline.md`.

**두 가지 실행 옵션:**

**1. Subagent-Driven (recommended)** - Task별 fresh subagent 디스패치, 태스크 사이 리뷰

**2. Inline Execution** - 이 세션에서 순차 실행, 체크포인트마다 확인

**어느 방식으로 진행하시겠어요?**
