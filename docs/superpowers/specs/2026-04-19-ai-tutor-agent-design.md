# Core-CBT AI 학습 튜터 에이전트 설계서

> 작성일: 2026-04-19
> 대상 프로젝트: [Core-CBT](https://github.com/b-hyoung/Core-CBT)
> 브랜치: `feat/agent`
> 대체 문서: 과거 `practice.MD` (Django/Redis 기반 가정, **이 문서로 대체·폐기**)

---

## 1. 배경·목표

### 1.1 문제
Core-CBT의 실기 오답 복습 맥락에서 유저가 문제를 다시 볼 때, 공식 해설만으로는 왜 틀렸는지 이해가 어렵다. "왜 틀렸어?" 같은 자연어 질의에 맥락을 가진 답을 주려면 `if-else` 분기로는 불충분하다. 또한 유저가 자기 약점을 직관적으로 파악하고 **약점 중심의 복습 루트**로 이어지는 UX가 없다.

### 1.2 목표
- 오답 복습 시 자연어로 AI와 대화하며 학습
- 유저의 이 문제 오답 이력을 반영한 맞춤 설명
- SQL/Code 카테고리에서 **유사 문제 자동 생성 → 유저 풀이 → AI 채점** 흐름
- 대화 영구 보관으로 **장기 학습 자산화**

### 1.3 범위 한정
- **시험 종목**: 정보처리산업기사 실기만 (필기·SQLD·aiprompt 제외 — V2+ 고려)
- **진입 경로**: `/practical` 회차 선택 화면의 **"코치 에이전트"** 카드 → 3단계 위저드 → 문제별 챗봇
- **지원 카테고리**: SQL, Code (V1). 이론은 "준비중" 상태로 UI 노출 (V2 활성화)
- **언어**: 한국어

---

## 2. 스택 결정

| 항목 | 결정 | 근거 |
|------|------|------|
| 백엔드 | **FastAPI** (신규, 별도 서버) | 에이전트 로직·LLM 호출을 Next.js와 분리. 파이썬 생태계 활용 |
| 프론트엔드 | **Next.js 16** (기존) | 현재 운영 중인 Core-CBT와 통합 |
| DB | **Supabase Postgres** (기존) | 이미 운영 중. 단일 DB로 통일 |
| 세션 저장소 | **Postgres** (신규 테이블) | 장기 자산화 요건. Redis 도입은 V2 실측 후 |
| LLM | **OpenAI GPT-4o-mini** (V1) | 안정적 Function Calling, 한국어 품질, 저렴 |
| LLM 추상화 | **OpenAI-compatible 인터페이스** | `LLM_BASE_URL` 환경변수로 향후 gpt-oss-20b 등 로컬 모델 교체 가능 |
| 에이전트 프레임워크 | **Raw Function Calling** (openai SDK 직접) | 원리 체득 + 의존성 최소 + 특화 로직 삽입 쉬움 |
| 인증 경계 | Next.js 서버 → FastAPI **shared secret** | FastAPI 퍼블릭 노출 X. email 서버 측 주입 |

---

## 3. 시스템 아키텍처

```
┌─────────────────────────────────────────┐
│ Browser (Next.js)                       │
│  - /practical               (회차 선택) │
│  - /practical/coach         (카테고리)  │
│  - /practical/coach/[cat]   (문제 리스트)│
│  - /practical/[sessionId]?p=X           │
│    → 플로팅 챗봇 (채팅 + 생성 문제 위젯)│
└───────────────┬─────────────────────────┘
                │ POST /api/agent/chat
                ↓
┌─────────────────────────────────────────┐
│ Next.js (기존 배포)                     │
│  - /api/agent/chat (프록시)             │
│  - next-auth 세션 검증 → email 추출     │
│  - FastAPI 로 중계 (shared secret 헤더) │
└───────────────┬─────────────────────────┘
                │ HTTP (internal)
                ↓
┌─────────────────────────────────────────┐
│ FastAPI (신규)                          │
│  - /chat 엔드포인트                     │
│  - Agent Runner (최대 5회 루프)         │
│  - LLM client (OpenAI 호환 추상화)      │
│  - Tool registry (5개)                  │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴────────┐
        ↓                ↓
┌──────────────┐  ┌──────────────┐
│ Supabase PG  │  │ datasets/    │
│  - analytics │  │  practical   │
│    _events   │  │  Industrial  │
│  - problem_  │  │  *.json      │
│    outcomes  │  │  (태깅 완료) │
│  - agent_    │  │              │
│    sessions  │  │              │
│    (신규)    │  │              │
└──────────────┘  └──────────────┘
```

**핵심 특징**
- FastAPI는 인터넷 미노출 — Next.js 서버에서만 접근
- 문제 데이터는 JSON 파일, 유저 행동 데이터는 Supabase
- 신규 테이블은 `agent_sessions` 하나

---

## 4. 데이터 모델

### 4.1 신규 테이블: `agent_sessions`

```sql
CREATE TABLE agent_sessions (
  id                  BIGSERIAL PRIMARY KEY,
  user_email          TEXT        NOT NULL,
  source_session_id   TEXT        NOT NULL,   -- 예: "2024-first"
  problem_number      INT         NOT NULL,
  category            TEXT,                   -- 'SQL' | 'Code' | '이론' 캐시
  subcategory         TEXT,                   -- 'Java'|'C'|...|'네트워크'|...
  messages            JSONB       NOT NULL,   -- 전체 대화 배열
  tools_called        TEXT[]      DEFAULT '{}',
  turn_count          INT         DEFAULT 0,
  generated_problems  JSONB       DEFAULT '[]',  -- 생성된 유사 문제들
  user_evaluations    JSONB       DEFAULT '[]',  -- 유저가 푼 결과들
  prompt_version      TEXT        DEFAULT 'v1.0',
  quality_flag        TEXT,                   -- 'good'|'bad'|NULL (수동 리뷰용)
  quality_note        TEXT,                   -- 리뷰 코멘트
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_email, source_session_id, problem_number)
);

CREATE INDEX idx_agent_sessions_user ON agent_sessions(user_email);
CREATE INDEX idx_agent_sessions_problem ON agent_sessions(source_session_id, problem_number);
CREATE INDEX idx_agent_sessions_category ON agent_sessions(category, subcategory);
CREATE INDEX idx_agent_sessions_updated ON agent_sessions(updated_at DESC);

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_sessions" ON agent_sessions
  FOR ALL USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');
```

**설계 포인트**
- `category`/`subcategory` 캐시: JSON 조인 없이 분석 가능
- `generated_problems` + `user_evaluations`: AI 생성 문제 정답률 직접 측정
- `prompt_version`: 프롬프트 교체 시 이전 데이터와 분리
- `quality_flag`/`quality_note`: 향후 파인튜닝용 데이터셋 정제 기반
- `UNIQUE` 제약: 문제별 1세션 (practice.MD 원칙 유지)

### 4.2 기존 소스 (변경 없음)

| 소스 | 용도 |
|------|------|
| `datasets/practicalIndustrial/{회차}/problem1.json` | 문제 원문 + `category`/`subcategory` (태깅 완료) |
| `datasets/practicalIndustrial/{회차}/answer1.json` | 정답 |
| `datasets/practicalIndustrial/{회차}/comment1.json` | 공식 해설 |
| `analytics_events` 테이블 | 유저 `finish_exam` 이벤트 → 오답 이력 파생 |
| `problem_outcomes` 테이블 | 집계 통계 |

### 4.3 분석 가능성

V1 당일부터: **Supabase Studio SQL 에디터** 로 쿼리 가능.

예시 쿼리:
```sql
-- 챗봇 호출 많은 문제 TOP 10 (유저들이 어려워하는 문제)
SELECT source_session_id, problem_number, category, COUNT(*) AS chats
FROM agent_sessions GROUP BY 1,2,3 ORDER BY chats DESC LIMIT 10;

-- 카테고리별 사용 분포
SELECT category, subcategory, COUNT(*), AVG(turn_count)::int AS avg_turns
FROM agent_sessions GROUP BY 1,2 ORDER BY 3 DESC;

-- AI 생성 문제 정답률 (V1 검증 핵심)
SELECT category,
  COUNT(*) FILTER (WHERE (e->>'correct')::boolean) * 100.0 / NULLIF(COUNT(*),0) AS accuracy
FROM agent_sessions, jsonb_array_elements(user_evaluations) e
GROUP BY 1;
```

V2+ 에서 관리자 페이지 추가 (`app/admin/agent/`) → 대화 뷰어 + `quality_flag` 태깅 UI + `recharts` 차트.

---

## 5. 태깅된 분류 체계

실기 12회차 232문제에 부착 완료 (2025-04-19 커밋 `9146b33`).

```json
{
  "category": "SQL" | "Code" | "이론",
  "subcategory":
      "Java" | "C" | "Python"              // category == "Code"
    | "네트워크" | "보안" | "소프트웨어공학"  // category == "이론"
    // category == "SQL" 이면 subcategory 없음
}
```

**분류 규칙**
- `SQL`: SQL 커맨드(SELECT/CREATE/UPDATE 등) + DB 이론(정규화/무결성/ERD/키)
- `Code`: C/Java/Python 코드 출력·빈칸·알고리즘
- `이론 / 네트워크`: 실제 네트워크 + OS + HW + 인프라(컨테이너 등)
- `이론 / 보안`: 네트워크 보안 / 웹 보안
- `이론 / 소프트웨어공학`: 테스트 기법·생명주기·UI·형상관리·자료구조

---

## 6. 툴 설계 (V1: 5개)

### 6.1 개요

| # | 이름 | 유형 | 설명 |
|---|------|------|------|
| 1 | `get_question_detail` | 입력 | 문제 원문·정답·공식 해설·분류 조회 |
| 2 | `get_user_wrong_history` | 입력 (유저 스코프) | 이 유저의 이 문제 오답 이력 |
| 3 | `get_user_topic_stats` | 입력 (유저 스코프) | 유저의 카테고리별 정답률 |
| 4 | `present_similar_problem` | 출력 (UI 트리거) | 유사 문제 인라인 위젯 렌더링. SQL/Code만 |
| 5 | `submit_evaluation` | 출력 (UI 트리거) | 유저 답 채점 피드백 렌더링 |

### 6.2 입력 툴 (데이터 조회)

**① `get_question_detail`**
```python
# 파라미터
source_session_id: str  # "2024-first"
problem_number:    int
# 반환
{
  "problem_number": 1,
  "question_text": "...",
  "examples": "...",
  "answer": "...",
  "explanation": "...",
  "category": "Code",
  "subcategory": "C",
  "input_type": "single"
}
# 구현: datasets/practicalIndustrial/{session}/{problem/answer/comment}.json 로드
```

**② `get_user_wrong_history`** (user_email 서버 주입)
```python
source_session_id: str
problem_number:    int
# 반환
{
  "total_attempts": 2,
  "wrong_count": 2,
  "recent_submissions": [
    {"submitted": "3번", "timestamp": "..."},
    ...
  ]
}
# 구현: analytics_events 스캔 + 2-pass latest-wins
# 참조: lib/userProblemsStore.js 로직 파이썬 포팅
```

**③ `get_user_topic_stats`** (user_email 서버 주입)
```python
category: Optional[str]  # None 이면 전체
# 반환
{
  "SQL":  {"total": 15, "correct": 8, "accuracy": 0.53},
  "Code": {
    "_total": {...},
    "Java":   {...},
    "C":      {...},
    "Python": {...}
  },
  "이론": {
    "_total": {...},
    "네트워크":     {...},
    "보안":         {...},
    "소프트웨어공학": {...}
  }
}
# 구현: analytics_events + datasets 태그 조인 집계
```

### 6.3 출력 툴 (UI 이벤트 트리거)

**④ `present_similar_problem`** — SQL/Code 에서만
```python
question_text:      str   # 문제 설명
examples:           str   # 코드 또는 SQL 스키마·데이터
expected_answer:    str   # 정답 (서버 세션에만 저장, 프론트·LLM 재전달에선 제거)
answer_explanation: str   # 왜 정답인지
category:           str   # 'SQL' | 'Code'
language:           Optional[str]  # 'Java'|'C'|'Python' (Code일 때)
input_type:         str   # 'single'|'multi_blank'|'textarea'
confidence:         int   # 1(낮음)~5(높음) — 자기 판단

# 반환 (LLM 재호출 시 messages에 들어감)
{"problem_id": "gen-a1b2", "rendered": True}

# 부가 동작:
# - 서버: session.generated_problems 에 전체 인자 저장 (expected_answer 포함)
# - ui_actions에 {type: "present_problem", problem_id, data: {expected_answer 제외}} 추가
```

**⑤ `submit_evaluation`**
```python
problem_id: str    # present_similar_problem 반환 id
correct:    bool
reasoning:  str

# 부가 동작:
# - 서버: session.user_evaluations 에 기록
# - ui_actions에 {type: "evaluation", ...} 추가
```

### 6.4 보안 3원칙

1. **유저 스코프 강제**: `get_user_wrong_history`, `get_user_topic_stats` 의 `user_email` 은 LLM이 넘겨도 **서버가 세션 값으로 덮어씀**.
2. **이론 카테고리 유사 문제 생성 금지**: 시스템 프롬프트에 명시. `present_similar_problem` 도 파라미터 검증에서 `category in ('SQL','Code')` 확인.
3. **expected_answer 마스킹**: UI 페이로드·LLM 재전달 메시지에서 제거. 서버 `generated_problems[problem_id]` 에만 저장.

---

## 7. Agent Runner 로직

### 7.1 메인 루프

```python
async def run_agent(user_email, source_session_id, problem_number, user_message):
    # 1) 세션 로드 or 생성
    session = await load_or_create_session(user_email, source_session_id, problem_number)
    session.messages.append({"role": "user", "content": user_message})

    ui_actions = []
    MAX_ITER = 5

    # 2) 에이전트 루프
    for _ in range(MAX_ITER):
        resp = await llm_client.chat.completions.create(
            model=llm_model(),
            messages=session.messages,
            tools=TOOLS_SCHEMA,
            tool_choice="auto",
        )
        msg = resp.choices[0].message
        session.messages.append(msg.model_dump())

        if not msg.tool_calls:
            break  # 최종 답변 완료

        for tc in msg.tool_calls:
            result = await dispatch_tool(tc, user_email, session, ui_actions)
            session.messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result, ensure_ascii=False),
            })
            session.tools_called.append(tc.function.name)

    # 3) 세션 저장
    session.turn_count += 1
    await save_session(session)

    return {
        "reply": session.messages[-1].get("content") or "",
        "ui_actions": ui_actions,
        "turn_count": session.turn_count,
    }
```

### 7.2 `dispatch_tool` — 보안·분기 핵심

```python
async def dispatch_tool(tool_call, user_email, session, ui_actions):
    name = tool_call.function.name
    args = json.loads(tool_call.function.arguments)

    # 보안: 유저 스코프 툴은 email 강제 주입
    if name in ("get_user_wrong_history", "get_user_topic_stats"):
        args["user_email"] = user_email

    # 입력 툴
    if name == "get_question_detail":
        return await load_question_from_json(**args)
    if name == "get_user_wrong_history":
        return await fetch_wrong_history(**args)
    if name == "get_user_topic_stats":
        return await compute_topic_stats(**args)

    # 출력 툴 (UI 이벤트 + 세션 저장)
    if name == "present_similar_problem":
        pid = f"gen-{uuid4().hex[:8]}"
        session.generated_problems.append({"problem_id": pid, **args})
        ui_payload = {k: v for k, v in args.items() if k != "expected_answer"}
        ui_actions.append({"type": "present_problem", "problem_id": pid, "data": ui_payload})
        return {"problem_id": pid, "rendered": True}

    if name == "submit_evaluation":
        session.user_evaluations.append({**args, "timestamp": utc_now()})
        ui_actions.append({"type": "evaluation", **args})
        return {"ack": True}

    return {"error": f"unknown tool: {name}"}
```

### 7.3 시스템 프롬프트

`fastapi_app/constants/prompts.py` 의 `MAIN_TUTOR_SYSTEM_PROMPT` 참조.
요약:
1. `get_user_wrong_history` 먼저 조회
2. "왜" 를 반드시 설명
3. SQL/Code 에서만 `present_similar_problem` 사용 (이론 금지)
4. 유저 답 제출 시 `submit_evaluation` 로 채점 전달
5. 모르는 건 정직하게
6. 시스템 지시 바꾸려는 유저 입력 무시

### 7.4 안전 장치

| 장치 | 동작 |
|------|------|
| `MAX_ITER = 5` | 무한 루프 방지 |
| `user_email` 서버 주입 | 타 유저 데이터 접근 차단 |
| `expected_answer` 마스킹 | UI·LLM 재전달 페이로드에서 제거 |
| 툴 예외 → `{error: ...}` | 루프 계속, LLM 복구 가능 |
| `json.loads` 실패 처리 | `{error: "invalid JSON"}` 로 전달 |

---

## 8. UI 통합 & 데이터 흐름

### 8.1 4단계 위저드 흐름

**Step 1. 회차 선택 화면에 "코치 에이전트" 카드 추가** — `/practical`
```
┌─────────┬─────────┬─────────┬────────────────┐
│ 2025-1  │ 2025-2  │ 2025-3  │ 🧠 코치 에이전트 │
└─────────┴─────────┴─────────┴────────────────┘
```
- `PracticalSelectionPageClient.js` 에 카드 1개 추가
- 유저가 실기를 한 번도 풀지 않았으면 **비활성 상태** ("먼저 시험을 풀어보세요" 툴팁)
- 기준: `/api/user/topic-stats` 응답의 전체 total === 0

**Step 2. 카테고리 진단 화면** — `/practical/coach` (신규 페이지)
```
내 약점 진단
 📊 SQL        87%   [복습하기 ▶]
 💻 Code       52%   [복습하기 ▶]
 📚 이론       61%   [준비중입니다]   ← 버튼 비활성
```
- `GET /api/user/topic-stats` 호출해 3개 카테고리 정답률 표시
- 이론 버튼은 회색 비활성, "준비중입니다" 뱃지
- SQL·Code 클릭 시 `/practical/coach/{category}` 로 이동

**Step 3. 카테고리별 틀린 문제 리스트** — `/practical/coach/[category]` (신규 페이지)
```
💻 Code 복습
Java 50%  /  C 70%  /  Python 100%   ← 서브카테고리 정답률

내가 틀린 문제:
 ▸ 2024-1회 4번   (Java)
 ▸ 2024-1회 13번  (Java)
 ▸ 2023-3회 10번  (Java)
 ▸ 2022-2회 1번   (C)
```
- `GET /api/user/topic-stats` 에서 서브카테고리 정답률 상단 표시
- `GET /api/user/wrong-problems?category=Code` 로 리스트 로드
- 각 항목 클릭 → `/practical/[sourceSessionId]?p={problemNumber}&from=coach`

**Step 4. 문제 리뷰 페이지 + 플로팅 챗봇** — `/practical/[sessionId]?p=X`
```
[문제 4. Java 출력결과]
...문제 본문·해설...

                                      [🧠] ← 플로팅 버튼
```
- 기존 `PracticalQuizV2` 페이지 재사용 (이미 `reviewOnly: true`)
- 플로팅 버튼을 눌렀을 때만 챗봇 열림 (자동 펼침 X)
- 챗봇 열리면 per-problem agent session 시작

### 8.2 프론트 컴포넌트 구조

```
app/practical/
├─ page.js                               (기존) 회차 선택
├─ PracticalSelectionPageClient.js       (기존) 여기에 코치 카드 추가
├─ [sessionId]/page.js                   (기존) 여기에 AgentChat 마운트
├─ coach/                                (신규)
│  ├─ page.js                            카테고리 진단 화면
│  └─ [category]/
│     └─ page.js                         카테고리별 틀린 문제 리스트
...

components/AgentChat/                    (신규)
├─ constants/
│  ├─ messages.js                        UI 문구
│  ├─ config.js                          설정값
│  └─ index.js                           re-export
├─ FloatingButton.jsx
├─ ChatWindow.jsx
├─ MessageList.jsx
│  ├─ TextBubble.jsx
│  ├─ GeneratedProblemCard.jsx           생성 문제 위젯
│  └─ EvaluationCard.jsx                 채점 피드백
├─ InputBox.jsx
└─ useAgentChat.js
```

### 8.3 Next.js API 라우트

```
app/api/
├─ agent/                                (에이전트 프록시 — FastAPI 호출)
│  ├─ chat/route.js                      POST: 메시지 전송
│  ├─ submit/route.js                    POST: 생성 문제 답 제출
│  └─ session/[sessionId]/[problemNumber]/
│     └─ route.js                        GET/DELETE: 세션 로드/초기화
└─ user/                                 (코치 위저드용 — LLM 없이 직접 Supabase 조회)
   ├─ topic-stats/route.js               GET: 카테고리·서브카테고리별 정답률
   └─ wrong-problems/route.js            GET: category 필터된 틀린 문제 리스트
```

**코치 위저드 전용 API 2개는 FastAPI를 거치지 않음.** LLM 호출이 없고 단순 DB 쿼리이므로 Next.js 내부에서 직접 Supabase에 접근. 레이턴시 최소화.

### 8.4 FastAPI 모듈 구조

```
fastapi_app/
├─ main.py                      FastAPI 앱
├─ config.py                    환경변수 (LLM_BASE_URL 등)
├─ constants/                   ← 이미 생성됨
│  ├─ __init__.py
│  └─ prompts.py                시스템 프롬프트 모음
├─ agent/
│  ├─ runner.py                 run_agent 루프
│  ├─ schemas.py                TOOLS_SCHEMA
│  └─ llm_client.py             OpenAI-compatible 추상화
├─ tools/
│  ├─ question.py               get_question_detail
│  ├─ user_history.py           get_user_wrong_history, topic_stats
│  └─ output_tools.py           present_similar_problem, submit_evaluation
├─ db/
│  ├─ session_store.py          agent_sessions CRUD
│  └─ supabase_client.py        REST 헬퍼
└─ auth/
   └─ internal_auth.py          shared secret 검증
```

### 8.5 주요 UX 플로우

**(a) 단순 질문**
```
유저 → /api/agent/chat → FastAPI → LLM (get_user_wrong_history 호출)
                                 → LLM (get_question_detail 호출)
                                 → LLM 최종 답변
프론트 → TextBubble 렌더링
```

**(b) 유사 문제 풀이**
```
유저: "비슷한 문제"
LLM → present_similar_problem(question, expected_answer="6", ...)
서버: generated_problems에 저장, ui_actions 생성
프론트 → TextBubble + GeneratedProblemCard 렌더링

유저: 답 "6" 제출 → /api/agent/submit
FastAPI: "[유저가 gen-a1b2 문제에 답: '6']" 메시지로 삽입, run_agent 재진입
LLM → session.generated_problems[id].expected_answer 참조 → submit_evaluation 호출
프론트 → TextBubble + EvaluationCard(✅/❌) 렌더링
```

### 8.6 상수 분리 (이미 확정)

- `components/AgentChat/constants/messages.js` — UI 문구 (플레이스홀더·에러·버튼 라벨·피드백)
- `components/AgentChat/constants/config.js` — 설정값 (MAX_INPUT_LENGTH, ENABLED_ROUTES, ENABLED_CATEGORIES_FOR_GENERATION 등)
- `fastapi_app/constants/prompts.py` — **이미 생성됨** (백엔드 시스템 프롬프트·에러 메시지·빌더)

---

## 9. 에러 처리·보안·테스트

### 9.1 에러 처리 4원칙

1. **툴 예외 → LLM 복구 가능**: `{error: "..."}` 으로 변환, 루프 유지
2. **malformed tool call 방어**: `json.loads` 실패 시 에러 반환, 루프 계속
3. **MAX_ITER 도달**: `prompts.ERROR_MESSAGES["MAX_ITER_REACHED"]` 으로 우아한 종료
4. **유저용 메시지 상수화**: 프론트/백엔드 양쪽 별도 관리

### 9.2 관찰성 (V1 최소)

| 수단 | 내용 |
|------|------|
| 구조화 로그 | Python `logging` + JSON 포맷 |
| 요청 ID | 각 요청에 UUID, 로그·DB 에 기록 |
| 토큰 사용량 | OpenAI `usage` 응답 → `agent_sessions` 에 저장 |
| 마지막 에러 | `agent_sessions.last_error` 필드 (선택 확장) |

외부 도구(Langfuse 등) V2 고려.

### 9.3 보안 체크리스트

| # | 원칙 | 위치 |
|---|------|------|
| 1 | 유저 스코프 강제 | `dispatch_tool` |
| 2 | expected_answer 마스킹 | `dispatch_tool` + UI |
| 3 | 프롬프트 인젝션 방어 | 시스템 프롬프트 + user_email 서버 주입 |
| 4 | Next.js↔FastAPI 서버간 인증 | `X-Internal-Auth` shared secret, FastAPI 퍼블릭 X |
| 5 | Supabase RLS | `agent_sessions` 에 `user_email = jwt_email` 정책 |
| 6 | Rate limit | 유저당 시간당 20회 (Next.js 프록시 또는 FastAPI 미들웨어) |
| 7 | 시크릿 관리 | `.env` 만, 커밋 금지 |

### 9.4 테스트 전략

```
     ┌──────────┐
     │ E2E 1-2  │  풀 시나리오 (수동 or 머지 전만)
     └──────────┘
   ┌──────────────┐
   │ Integration  │  run_agent + 실제 DB·JSON (LLM mock)
   │   3-5개       │
   └──────────────┘
┌────────────────────┐
│ Unit 10-15개       │  각 툴 · dispatch · session_store · auth · prompt builder
└────────────────────┘
```

**중요 unit 테스트**:
- `get_user_wrong_history` 2-pass latest-wins (기존 버그 회귀 방지)
- `dispatch_tool` user_email 덮어쓰기 / expected_answer 마스킹

**도구**: `pytest` + `pytest-asyncio` + FastAPI TestClient (백엔드). 프론트는 기존 스택 따름.

### 9.5 V1 Done 기준

- [ ] 입력 툴 3개 동작 (실제 데이터로 스모크)
- [ ] 출력 툴 2개 동작 (위젯 렌더링·채점 피드백)
- [ ] `/practical` 회차 선택 화면에 **"코치 에이전트" 카드** 노출 (데이터 없으면 비활성)
- [ ] `/practical/coach` 카테고리 진단 화면 (3개 정답률 표시, 이론 "준비중" 비활성)
- [ ] `/practical/coach/[category]` 틀린 문제 리스트 (서브카테고리 정답률 상단 + 리스트)
- [ ] 문제 클릭 → `/practical/[sessionId]?p=X` 이동 → 플로팅 버튼으로 챗봇 열림
- [ ] 답 제출 → 채점 → 피드백 end-to-end
- [ ] `agent_sessions` 영구 저장, Supabase Studio 조회 가능
- [ ] 보안 체크리스트 1·2·4·6·7 통과 (3·5 코드 리뷰 확인)

---

## 10. API 엔드포인트 명세

### 10.1 `POST /api/agent/chat` (Next.js → FastAPI 프록시)

**Request**
```json
{
  "source_session_id": "2024-first",
  "problem_number": 3,
  "message": "왜 이게 틀렸어?"
}
```
(user_email 은 next-auth 세션에서 서버가 추출)

**Response**
```json
{
  "reply": "이 문제 2번 틀리셨네요. 형변환 때문에...",
  "ui_actions": [
    {
      "type": "present_problem",
      "problem_id": "gen-a1b2",
      "data": { "question_text": "...", "examples": "...", "category": "Code", "language": "Java", "input_type": "single" }
    }
  ],
  "turn_count": 2
}
```

**에러**
- 401 미인증 / 403 페이지 권한 없음 / 429 rate limit / 500 LLM 실패

### 10.2 `POST /api/agent/submit` (생성 문제 답 제출)

**Request**
```json
{
  "source_session_id": "2024-first",
  "problem_number": 3,
  "problem_id": "gen-a1b2",
  "user_answer": "6"
}
```

**Response**
```json
{
  "reply": "정답이에요!",
  "ui_actions": [{"type": "evaluation", "problem_id": "gen-a1b2", "correct": true, "reasoning": "..."}],
  "turn_count": 3
}
```

### 10.3 `GET /api/agent/session/:session_id/:problem_number`

이전 대화 로드 (페이지 진입 시).

### 10.4 `DELETE /api/agent/session/:session_id/:problem_number`

세션 초기화.

### 10.5 `GET /api/user/topic-stats` (코치 위저드 전용, LLM 없음)

**Response**
```json
{
  "SQL":  { "total": 36, "correct": 31, "accuracy": 0.86 },
  "Code": {
    "_total": { "total": 80, "correct": 42, "accuracy": 0.52 },
    "Java":   { "total": 30, "correct": 15, "accuracy": 0.50 },
    "C":      { "total": 40, "correct": 28, "accuracy": 0.70 },
    "Python": { "total": 10, "correct": 10, "accuracy": 1.00 }
  },
  "이론": { "_total": { "total": 70, "correct": 43, "accuracy": 0.61 } }
}
```
- `analytics_events` + `datasets` 태그 조인 집계
- Next.js 서버가 Supabase 직접 조회 (FastAPI 경유 X)
- 데이터 없으면 모든 `total: 0` → 프론트가 코치 카드 비활성 판단

### 10.6 `GET /api/user/wrong-problems?category=<SQL|Code>` (코치 위저드 전용)

**Response**
```json
[
  {
    "source_session_id": "2024-first",
    "problem_number": 4,
    "category": "Code",
    "subcategory": "Java",
    "question_preview": "java 출력결과",
    "last_attempt_at": "2026-04-10T12:34:56Z"
  },
  ...
]
```
- `category` 쿼리로 필터
- `analytics_events` 최신 오답 + `datasets` 문제 텍스트 프리뷰 50자 조인
- Next.js 서버가 Supabase 직접 조회

---

## 11. 환경변수

| 변수 | 어디서 | 설명 |
|------|--------|------|
| `OPENAI_API_KEY` | FastAPI | OpenAI API 키 |
| `LLM_BASE_URL` | FastAPI | 기본 `https://api.openai.com/v1`, 로컬 전환 시 교체 |
| `LLM_MODEL` | FastAPI | 기본 `gpt-4o-mini`, 로컬 전환 시 예: `gpt-oss:20b` |
| `SUPABASE_URL` | Next.js / FastAPI | 기존 |
| `SUPABASE_SERVICE_ROLE_KEY` | Next.js / FastAPI | 기존 (공유 또는 별도) |
| `INTERNAL_SHARED_SECRET` | Next.js / FastAPI | 서버간 인증 토큰 |
| `NEXTAUTH_SECRET` | Next.js | 기존 |
| `AGENT_MAX_ITERATIONS` | FastAPI | 기본 5 |
| `AGENT_RATE_LIMIT_PER_HOUR` | FastAPI / Next.js | 기본 20 |

---

## 12. 개발 로드맵 (개략)

### V1 (MVP, 약 2-3주)

**Phase 1: FastAPI 기반 (3-5일)**
- FastAPI 스캐폴딩, Supabase 클라이언트
- 마이그레이션 작성·실행 (`agent_sessions`)
- `llm_client.py` + 환경변수 구조
- `/chat` 엔드포인트 echo 버전
- shared secret 인증 미들웨어

**Phase 2: 툴 5개 (4-5일)**
- 각 툴 구현 + pytest unit 테스트
- `dispatch_tool` 보안 로직 (user_email 주입, expected_answer 마스킹)
- `run_agent` 루프 + integration test (LLM mock)

**Phase 3: Next.js 통합 (5-7일)**
- `/api/agent/chat`, `/submit`, `/session/...` 프록시 라우트
- `/api/user/topic-stats`, `/api/user/wrong-problems` 직접 DB 라우트
- `/practical/coach/page.js` — 카테고리 진단 화면
- `/practical/coach/[category]/page.js` — 카테고리별 틀린 문제 리스트
- `PracticalSelectionPageClient.js` 에 "코치 에이전트" 카드 추가 (비활성 상태 포함)
- `components/AgentChat/*` + 상수 분리
- `/practical/[sessionId]` 에 AgentChat 마운트 (플로팅 버튼)
- 수동 E2E 검증: 회차 화면 → 코치 → 카테고리 → 문제 → 챗봇

**Phase 4: 다듬기 (2-3일)**
- 프롬프트 튜닝 (실제 써보며)
- 에러 처리·로깅
- 보안 체크리스트 검증

### V2 (이후 확장)

- **Gated Critic 에이전트**: Code 카테고리 또는 confidence<4 일 때만 `consult_code_critic` 툴 호출. 생성 문제 정답 검증
- **gpt-oss-20b 로컬 전환 실험**: `LLM_BASE_URL` 교체로 Ollama 전환 → baseline 비교
- **관리자 대화 뷰어**: `app/admin/agent/` 에 대화 리뷰 + `quality_flag` 태깅 UI
- **SSE 스트리밍 응답**
- **파인튜닝 데이터 export**: `quality_flag='good'` 세션만 추출 (200+ 쌓인 후)

### V3+

- RAG 도입 (개념 문서 벡터DB)
- 멀티턴 대화 요약 (긴 세션 토큰 절약)
- 프롬프트 A/B 테스트 자동화
- 유저 학습 대시보드
- 필기·SQLD·aiprompt 확장

---

## 13. 참고

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [FastAPI 공식](https://fastapi.tiangolo.com/)
- [Supabase Python Client](https://github.com/supabase/supabase-py)
- [Core-CBT 저장소](https://github.com/b-hyoung/Core-CBT)
- 관련 생성 파일:
  - [fastapi_app/constants/prompts.py](../../../fastapi_app/constants/prompts.py)

---

## 부록 A: 대화 흐름 예시

### A.1 "왜 틀렸어?" (이론 카테고리)
```
유저: "이 문제 왜 틀렸지?"
에이전트 내부:
  1) get_user_wrong_history → 2번 틀림, 둘 다 특정 보기 선택
  2) get_question_detail → 정답·해설·category='이론'/subcategory='네트워크'
  3) 최종 답변 (유사 문제 생성 없음 — 이론이므로)
유저에게:
  "2번 틀리셨네요. 둘 다 X 고르셨어요.
   정답은 Y인데, 이유는 OSI 데이터링크 계층이..."
```

### A.2 유사 문제 풀이 (Code / Java)
```
유저: "비슷한 Java 문제 하나"
에이전트 내부:
  1) get_question_detail → 원 문제 맥락
  2) LLM 스스로 문제 생성 → present_similar_problem(
       question_text="다음 Java의 출력은?",
       examples="int a=(int)(3.7+2.5);...",
       expected_answer="6",
       confidence=5,
       category="Code",
       language="Java"
     )
서버:
  - session.generated_problems에 저장
  - ui_actions에 expected_answer 제외한 페이로드 추가
프론트: GeneratedProblemCard 렌더링

─────

유저: 답 "6" 제출 (/api/agent/submit)
서버:
  - "[유저가 gen-a1b2 문제에 답: '6']" 메시지 삽입
  - run_agent 재진입
  - LLM이 session.generated_problems[gen-a1b2].expected_answer 참조 → 일치 확인
  - submit_evaluation(problem_id, correct=true, reasoning="...") 호출
프론트: TextBubble + EvaluationCard(✅)
```

### A.3 카테고리 통계 질문
```
유저: "나 어떤 분야 약해?"
에이전트 내부:
  1) get_user_topic_stats(category=None)
  2) 반환: {SQL: 0.75, Code/Java: 0.5, Code/C: 0.7, 이론/네트워크: 0.4, ...}
  3) 최종 답변
유저에게:
  "이론/네트워크가 40%로 가장 약해요.
   Code/Java도 50%니 같이 보완하면 좋겠습니다..."
```

---

## 부록 B: 태깅 완료 내역

2025-04-19 커밋 `9146b33` 에서 실기 12회차 232문제에 `category`/`subcategory` 부착:

| 연도 | 회차 | 문항수 | 커밋 |
|------|------|--------|------|
| 2022 | 1·2·3 | 60 | 9146b33 |
| 2023 | 1·2·3 | 60 | 9146b33 |
| 2024 | 1·2·3 | 60 | 9146b33 |
| 2025 | 1·2 | 40 | 9146b33 |
| 2025 | 3 | 12 | 9146b33 |

주의: 2025-3회차는 원본이 12문제 (다른 회차 20문제). 원본 데이터 검토 필요시 `datasets/practicalIndustrial/2025-third/problem1.json` 확인.
