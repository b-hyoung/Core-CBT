# Phase 2 구현 요약: Agent 툴 & Runner (Task 8~18)

**브랜치:** `feat/agent`  
**기간:** 2026-04-19  
**테스트 결과:** 45 passed, 0 failed  

---

## 커밋 히스토리

| SHA | Task | 설명 |
|-----|------|------|
| `f163919` | Task 8 | TOOLS_SCHEMA 5개 정의 + 스키마 구조 테스트 |
| `057a7cd` | Task 9 | get_question_detail 툴 + 데이터셋 로더 |
| `20f217f` | Task 10 | get_user_wrong_history 툴 (2-pass latest-wins) |
| `ce252b1` | Task 11 | get_user_topic_stats 툴 + 카테고리/서브카테고리 집계 |
| `c722e22` | Task 12 | output tools (present/evaluate) + expected_answer 마스킹 |
| `d5a2016` | Task 13 | dispatch_tool 중앙 디스패치 + 보안 로직 |
| `ec5e210` | Task 14 | agent_sessions CRUD (dataclass + Supabase upsert) |
| `1201f96` | Task 15 | run_agent 루프 + MAX_ITER 안전 장치 |
| `51149bc` | Task 16 | /chat 실제 run_agent 연결 (echo 제거) |
| `3aea855` | Task 17 | /submit 엔드포인트 (생성 문제 답 재진입) |
| `0932fdd` | Task 18 | GET/DELETE /session (마스킹, system 메시지 제외) |

---

## 신규 파일 구조

```
fastapi_app/
├── agent/
│   ├── __init__.py
│   ├── llm_client.py          (Phase 1)
│   ├── schemas.py             ← Task 8: 5개 툴 스키마 + 보안 상수
│   └── runner.py              ← Task 15: 에이전트 메인 루프
├── tools/
│   ├── __init__.py            ← Task 9
│   ├── question.py            ← Task 9: get_question_detail (JSON 로더)
│   ├── user_history.py        ← Task 10+11: wrong_history + topic_stats
│   ├── output_tools.py        ← Task 12: present_similar_problem / submit_evaluation
│   └── dispatch.py            ← Task 13: 중앙 디스패치 (보안 강제)
├── db/
│   ├── supabase_client.py     (Phase 1)
│   └── session_store.py       ← Task 14: AgentSession CRUD
├── main.py                    ← Task 16~18: /chat, /submit, /session 엔드포인트
├── pytest.ini                 ← Task 9: asyncio_mode=auto
└── tests/
    ├── test_schemas.py            (4 tests)
    ├── test_tool_question.py      (4 tests)
    ├── test_tool_user_history.py  (5 tests)
    ├── test_tool_topic_stats.py   (4 tests)
    ├── test_output_tools.py       (2 tests)
    ├── test_dispatch.py           (5 tests)
    ├── test_session_store_shape.py(2 tests)
    ├── test_runner.py             (3 tests)
    ├── test_chat_endpoint.py      (3 tests)
    ├── test_submit_endpoint.py    (1 test)
    └── test_session_endpoints.py  (3 tests)
```

---

## 주요 설계 결정

### 보안
- **user_email 서버 강제 주입:** `dispatch_tool`에서 USER_SCOPED_TOOLS 호출 시 LLM이 보낸 `user_email` 무시, 서버 세션 값으로 덮어씀
- **expected_answer 마스킹:** `present_similar_problem` UI 페이로드에서 제거, `GET /session` 응답에서도 제거
- **system 메시지 비노출:** `GET /session` 응답에서 `role=system` 메시지 필터링

### 에이전트 루프 (`runner.py`)
- LLM Function Calling → dispatch_tool → tool result 주입 → 반복
- `agent_max_iterations` (기본 5) 초과 시 안전 중단 + 사용자 안내 메시지
- 세션 로드/생성 → 대화 후 자동 저장 (upsert)
- 저장 실패 시 에러 로깅만, 응답은 정상 반환

### 데이터 흐름
- `get_question_detail`: `datasets/practicalIndustrial/{session}/problem1.json` 로드
- `get_user_wrong_history`: Supabase `analytics_events` → 2-pass latest-wins 집계
- `get_user_topic_stats`: 위 이벤트 + 문제 태그 → 카테고리별 정답률
- `present_similar_problem`: UUID 기반 problem_id 발급, 세션에 저장, UI에 렌더링 이벤트
- `submit_evaluation`: 채점 결과 기록 + UI 피드백 이벤트

### /submit 엔드포인트
- 유저 답변을 `"[유저가 {problem_id} 문제에 답변: '{answer}']"` 형태로 합성
- `run_agent`에 재진입하여 LLM이 `submit_evaluation` 툴로 채점

---

## API 엔드포인트 (Phase 2 완료 기준)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| POST | `/chat` | 에이전트 대화 (run_agent) |
| POST | `/submit` | 생성 문제 답 제출 → 채점 |
| GET | `/session/{sid}/{pnum}` | 이전 대화 로드 (마스킹 적용) |
| DELETE | `/session/{sid}/{pnum}` | 세션 초기화 |

모든 엔드포인트는 `x-internal-auth` + `x-user-email` 헤더 필수.

---

## 다음 단계: Task 19 (수동 통합 스모크)

Task 19는 실제 OpenAI API 호출이 필요한 수동 검증. `.env`에 키를 설정 후:

```bash
cd fastapi_app
uvicorn main:app --reload --port 8001

# 대화 테스트
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -H "x-internal-auth: <secret>" \
  -H "x-user-email: test@example.com" \
  -d '{"source_session_id":"2024-first","problem_number":1,"message":"이 문제 설명해줘"}'
```

Task 19 이후 Phase 3 (Next.js 코치 위저드 UI, Task 20~26)으로 진행.
