# Core-CBT 오답 해결 에이전트 설계서

> 작성일: 2026-04-18  
> 대상 프로젝트: [Core-CBT](https://github.com/b-hyoung/Core-CBT)  
> 목적: 오답 노트 복습 시 사용자 학습을 돕는 AI 에이전트 구축

---

## 1. 배경 및 목표

### 1.1 프로젝트 컨텍스트
- **Core-CBT**: 자격시험 CBT 학습 서비스 (정처산기, SQLD 등)
- 스택: Django (백엔드) + Next.js (프론트) + PostgreSQL
- 이미 GPT 보조 해설 + 캐시 재사용 구조 운영 중
- 실사용자 존재, 운영·피드백 반영 이력 있음

### 1.2 왜 에이전트인가
단순 "API 호출로 해설 생성"을 넘어, **사용자 상황을 판단해서 여러 데이터를 조합**하는 AI 튜터가 필요.

수동 방식 한계:
- "왜 틀렸어?" → 유저 오답 이력 + 유사 문제 + 개념 조합 필요
- if-else 분기로 모든 조합 커버 불가
- 자연어 질의의 다양성 대응 어려움

### 1.3 목표
- 오답 노트 복습 시 자연어로 AI와 대화하며 학습
- 유저의 오답 이력을 인지하는 맞춤 설명
- 관련 개념 및 유사 문제 연계
- 학습 데이터 축적 → 장기 자산화

---

## 2. 에이전트 개념 복습

### 2.1 에이전트 vs 일반 API 호출

| 구분 | 일반 API (수동) | 에이전트 |
|------|---------------|---------|
| 판단 주체 | 개발자 (if-else) | **LLM** |
| 함수 호출 | 개발자가 코드로 | **자동 실행** |
| 툴 조합 | 내가 설계 | **LLM이 조합** |
| 반복 처리 | 수동 루프 | **자동 반복** |

### 2.2 핵심 원칙
- 함수는 개발자가 만든다
- **언제·어떻게·몇 번 부를지**는 LLM이 판단한다
- 개발자 역할 = 좋은 툴 + 명확한 프롬프트 설계

---

## 3. 설계 결정 사항

### 3.1 기능 정의

| 항목 | 결정 |
|------|------|
| **발동 트리거** | 오답 노트 복습 시 |
| **UI 위치** | 플로팅 챗봇 (오른쪽 하단) |
| **데이터 스코프** | 중간 (해당 유저 오답 이력까지) |
| **대화 범위** | 해당 오답 문제 + 관련 개념만 |
| **세션 저장 단위** | 문제별 (user_id + question_id) |

### 3.2 기술 결정

| 항목 | 결정 | 근거 |
|------|------|------|
| **프레임워크** | Function Calling 직접 구현 | 원리 체득 우선, 규모 적절 |
| **LLM** | OpenAI (GPT-4o-mini)로 시작 | 가성비, 나중에 교체 가능 |
| **최대 반복 횟수** | 5회 | 안전, 응답 속도 확보 |
| **세션 저장소** | Redis | 빠른 읽기/쓰기, 휘발성 OK |
| **백엔드** | Django (기존 스택) | 통합 쉬움 |
| **프론트엔드** | Next.js (기존 스택) | 기존 UI와 통합 |

---

## 4. 시스템 아키텍처

### 4.1 전체 흐름도

```
┌──────────────────────────────────────┐
│ Next.js 프론트                       │
│  - 오답 노트 페이지                  │
│  - 플로팅 챗봇 컴포넌트              │
│  - POST /api/agent/chat              │
└───────────────┬──────────────────────┘
                │
                ↓
┌──────────────────────────────────────┐
│ Django /api/agent/chat               │
│  - 인증 확인                         │
│  - Redis에서 세션 로드               │
│  - agent.run() 호출                  │
│  - Redis에 세션 저장                 │
└───────────────┬──────────────────────┘
                │
                ↓
┌──────────────────────────────────────┐
│ Agent Runner (핵심 루프)             │
│  1. 시스템 프롬프트 + 메시지 구성    │
│  2. LLM 호출 (툴 스키마 포함)        │
│  3. 툴 호출 요청 → 툴 실행           │
│  4. 결과 메시지 추가 → 2로 돌아감    │
│  5. 최종 답변 나오면 종료 (최대 5회) │
└───────────────┬──────────────────────┘
                │
                ↓
┌──────────────────────────────────────┐
│ Tools (Django ORM 래핑)              │
│  - get_question_detail               │
│  - get_user_wrong_history            │
│  - get_user_topic_stats              │
│  - search_similar_questions          │
│  - search_concept                    │
└───────────────┬──────────────────────┘
                │
                ↓
       [PostgreSQL]     [Redis]
       (문제, 유저,      (대화 세션)
        오답 이력)
```

### 4.2 데이터 플로우 예시

사용자가 오답 노트에서 문제 123번 복습 중 "왜 3번이 아니야?" 질문했을 때:

```
1. 프론트 → POST /api/agent/chat
   {
     user_id: 42,
     question_id: 123,
     message: "왜 3번이 아니야?",
     session_id: "user42_q123"
   }

2. Django: Redis에서 session_id 세션 로드
   - 기존 대화 있으면 messages 배열에 이어붙임
   - 없으면 새 세션 생성

3. Agent Runner:
   Step 1) LLM 호출 (gpt-4o-mini + 툴 스키마 5개)
   Step 2) LLM 응답: "get_user_wrong_history(42, 123) 호출해줘"
   Step 3) 툴 실행 → "이 유저는 이 문제 2번째 틀림, 둘 다 3번 선택"
   Step 4) 결과를 messages에 추가, LLM 재호출
   Step 5) LLM 응답: "search_concept('JOIN UNION 차이') 호출해줘"
   Step 6) 툴 실행 → "JOIN은 ...니다. UNION은 ...니다"
   Step 7) 결과 추가, LLM 재호출
   Step 8) LLM 최종 답변: "3번을 두 번째 고르셨네요. JOIN과 UNION을..."

4. Django: 업데이트된 messages를 Redis에 저장

5. 프론트에 답변 반환
```

---

## 5. 툴 설계

### 5.1 툴 목록 (5개)

⚠️ **주의**: 실제 Core-CBT DB 스키마 확인 후 조정 필요. `search_concept`은 RAG 필요 여부에 따라 키워드 검색으로 축소 가능.

#### 5.1.1 `get_question_detail`
```python
def get_question_detail(question_id: int) -> dict:
    """특정 문제의 원문, 보기, 정답, 공식 해설 조회
    
    Args:
        question_id: 문제 ID
    
    Returns:
        {
          "id": 123,
          "text": "문제 본문...",
          "choices": ["1번 보기", "2번 보기", ...],
          "answer": 2,
          "explanation": "공식 해설...",
          "topic": "SQL JOIN",
          "exam_type": "SQLD"
        }
    """
```

#### 5.1.2 `get_user_wrong_history`
```python
def get_user_wrong_history(user_id: int, question_id: int) -> dict:
    """이 유저가 이 문제를 몇 번 틀렸는지, 매번 뭘 골랐는지
    
    ⚠️ 이 유저 스코프로만 제한 (보안 필수)
    
    Returns:
        {
          "attempts": [
            {"selected": 3, "timestamp": "..."},
            {"selected": 3, "timestamp": "..."}
          ],
          "total_attempts": 2,
          "correct_count": 0
        }
    """
```

#### 5.1.3 `get_user_topic_stats`
```python
def get_user_topic_stats(user_id: int, topic: str) -> dict:
    """이 유저의 특정 주제 정답률, 오답 수
    
    ⚠️ DB에 topic 태그 필요. 없으면 이 툴 빼거나 다른 방식 고안.
    
    Returns:
        {
          "topic": "SQL JOIN",
          "total_solved": 15,
          "correct": 8,
          "accuracy": 0.53,
          "recent_trend": "improving" | "declining" | "stable"
        }
    """
```

#### 5.1.4 `search_similar_questions`
```python
def search_similar_questions(question_id: int, limit: int = 3) -> list:
    """같은 개념 다루는 유사 문제 N개 반환
    
    구현 방법 (선택):
    - 단순: 같은 topic 태그의 다른 문제
    - 고급: 임베딩 기반 유사도 (벡터DB 필요)
    
    Returns:
        [
          {"id": 124, "text": "...", "topic": "..."},
          ...
        ]
    """
```

#### 5.1.5 `search_concept`
```python
def search_concept(keyword: str, exam_type: str) -> str:
    """개념 설명 검색
    
    구현 방법 (선택):
    - V1 (단순): 해설 DB에서 키워드 LIKE 검색
    - V2 (고급): RAG - 개념 문서를 벡터DB에 임베딩
    
    Returns: 관련 개념 설명 텍스트
    """
```

### 5.2 툴 스키마 (OpenAI Function Calling 형식)

```python
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_question_detail",
            "description": "특정 문제의 원문, 보기, 정답, 공식 해설 조회",
            "parameters": {
                "type": "object",
                "properties": {
                    "question_id": {"type": "integer"}
                },
                "required": ["question_id"]
            }
        }
    },
    # ... 나머지 4개 동일한 형식
]
```

---

## 6. 데이터 모델

### 6.1 Redis 세션 스키마

```
Key: agent_session:{user_id}:{question_id}
Value: JSON
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "...", "tool_calls": [...]},
    {"role": "tool", "tool_call_id": "...", "content": "..."}
  ],
  "created_at": "2026-04-18T14:30:00Z",
  "updated_at": "2026-04-18T14:32:15Z",
  "turn_count": 3
}
TTL: 7일 (복습 주기 고려)
```

### 6.2 Django 모델 (필요 시 장기 아카이브)

```python
# 선택사항: 나중에 분석용으로 저장하고 싶을 때
class AgentConversation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    question_id = models.IntegerField()
    messages = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'question_id']),
        ]
```

---

## 7. 시스템 프롬프트 초안

```
너는 자격증 시험 학습 튜터야.
유저가 오답 노트에서 복습 중인 문제에 대해 대화해.

[현재 컨텍스트]
- 유저 ID: {user_id}
- 문제 ID: {question_id}
- 시험 종목: {exam_type}

[원칙]
1. 현재 문제(question_id={question_id})에 집중해서 답변
2. 유저의 오답 이력을 먼저 조회해서 맞춤 설명 제공
3. 정답만 말하지 말고 "왜"를 반드시 설명
4. 복합 질문일 경우 여러 툴 조합해서 근거 마련
5. 관련 개념이나 유사 문제 추천으로 반복 학습 유도
6. 시험 외 주제(일상 잡담, 다른 유저 정보 등)는 정중히 거절

[사용 가능한 도구]
- get_question_detail: 문제 상세 조회
- get_user_wrong_history: 이 유저의 이 문제 오답 이력
- get_user_topic_stats: 유저의 주제별 성적
- search_similar_questions: 유사 문제 검색
- search_concept: 개념 설명 검색

[톤앤매너]
- 친근하지만 전문적
- 짧고 명확하게
- 한국어로 답변
```

---

## 8. 에이전트 루프 의사코드

```python
def run_agent(user_message, user_id, question_id, session_id):
    # 1. Redis에서 세션 로드
    session = redis.get(f"agent_session:{user_id}:{question_id}")
    messages = session["messages"] if session else [
        {"role": "system", "content": build_system_prompt(user_id, question_id)}
    ]
    
    # 2. 유저 메시지 추가
    messages.append({"role": "user", "content": user_message})
    
    # 3. 에이전트 루프 (최대 5회)
    MAX_ITERATIONS = 5
    for i in range(MAX_ITERATIONS):
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS_SCHEMA,
        )
        
        msg = response.choices[0].message
        messages.append(msg.model_dump())
        
        # 툴 호출 없으면 최종 답변
        if not msg.tool_calls:
            break
        
        # 툴 호출 실행
        for tool_call in msg.tool_calls:
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)
            
            # ⚠️ 보안: user_id는 클라이언트 아닌 세션에서 강제 주입
            if tool_name in ["get_user_wrong_history", "get_user_topic_stats"]:
                tool_args["user_id"] = user_id  # override
            
            try:
                result = TOOL_REGISTRY[tool_name](**tool_args)
            except Exception as e:
                result = f"Error: {str(e)}"
            
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result, ensure_ascii=False)
            })
    
    # 4. Redis에 세션 저장 (TTL 7일)
    redis.setex(
        f"agent_session:{user_id}:{question_id}",
        timedelta(days=7),
        json.dumps({"messages": messages, "updated_at": now()})
    )
    
    # 5. 최종 답변 반환
    return messages[-1]["content"]
```

---

## 9. 폴더 구조 제안

```
core_cbt/
├── agent/                      ← 새로 만듦
│   ├── __init__.py
│   ├── runner.py               ← run_agent() 메인 루프
│   ├── prompts.py              ← 시스템 프롬프트 빌더
│   ├── schemas.py              ← TOOLS_SCHEMA 정의
│   ├── session.py              ← Redis 세션 입출력
│   ├── tools/
│   │   ├── __init__.py         ← TOOL_REGISTRY 등록
│   │   ├── question.py         ← get_question_detail, search_similar
│   │   ├── user_history.py     ← get_user_wrong_history, topic_stats
│   │   └── concept.py          ← search_concept
│   └── tests/
│       ├── test_tools.py
│       └── test_runner.py
├── api/
│   └── agent_views.py          ← POST /api/agent/chat
├── settings/
│   └── ...                     ← OPENAI_API_KEY, REDIS_URL 추가
└── ...
```

---

## 10. API 엔드포인트 명세

### 10.1 `POST /api/agent/chat`

**Request:**
```json
{
  "question_id": 123,
  "message": "왜 3번이 아니야?"
}
```
(user_id는 세션/토큰에서 추출)

**Response:**
```json
{
  "reply": "3번을 두 번째 고르셨네요. JOIN과 UNION의 차이는...",
  "session_id": "user42_q123",
  "turn_count": 3,
  "tools_used": ["get_user_wrong_history", "search_concept"]
}
```

**Error Cases:**
- 401: 미인증
- 403: 해당 문제 접근 권한 없음
- 429: Rate limit 초과
- 500: LLM 호출 실패

### 10.2 `GET /api/agent/session/{question_id}`

세션 조회 (복습 시 이전 대화 이어보기)

**Response:**
```json
{
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "updated_at": "..."
}
```

### 10.3 `DELETE /api/agent/session/{question_id}`

세션 초기화

---

## 11. 프론트엔드 컴포넌트 구조 (Next.js)

```
components/
├── AgentChat/
│   ├── FloatingButton.tsx      ← 오른쪽 하단 버튼
│   ├── ChatWindow.tsx          ← 대화창 패널
│   ├── MessageBubble.tsx       ← 메시지 버블
│   ├── InputBox.tsx            ← 입력창
│   └── useAgentChat.ts         ← 커스텀 훅 (API 호출, 상태 관리)
```

**훅 예시 (`useAgentChat.ts`):**
```typescript
function useAgentChat(questionId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 문제 열릴 때 세션 로드
  useEffect(() => {
    fetch(`/api/agent/session/${questionId}`)
      .then(r => r.json())
      .then(data => setMessages(data.messages || []));
  }, [questionId]);
  
  const send = async (message: string) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    
    const res = await fetch('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, message })
    });
    const data = await res.json();
    
    setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    setIsLoading(false);
  };
  
  return { messages, send, isLoading };
}
```

---

## 12. 개발 로드맵

### Week 1: 기반 구축
- [ ] Day 1-2: Django 모델 + `/api/agent/chat` 엔드포인트 (에코 버전)
- [ ] Day 3-4: 툴 함수 5개 구현 + 단위 테스트
- [ ] Day 5-7: 에이전트 루프 구현 + 로컬 테스트

### Week 2: 통합 & UI
- [ ] Day 1-3: Next.js 플로팅 챗봇 컴포넌트
- [ ] Day 4-5: Redis 세션 저장/로드 로직
- [ ] Day 6-7: 오답 노트 페이지 통합

### Week 3: 다듬기
- [ ] Day 1-3: 프롬프트 튜닝 (실제 써보면서)
- [ ] Day 4-5: 에러 처리, 로깅 (Langfuse 등 고려)
- [ ] Day 6-7: 배포 + 실사용자 테스트

---

## 13. 체크리스트 (CLI 작업 전)

- [ ] OpenAI API 키 발급 및 `.env` 설정
- [ ] Redis 로컬/클라우드 세팅 (Render Redis, Upstash 등)
- [ ] Core-CBT 현재 DB 스키마 확인
  - [ ] 문제 모델 필드명
  - [ ] 유저 오답 기록 모델 존재 여부
  - [ ] topic/category 태그 존재 여부 (`get_user_topic_stats`용)
- [ ] `search_concept` 구현 방식 결정 (LIKE 검색 vs RAG)
- [ ] 환경변수 정리 (`OPENAI_API_KEY`, `REDIS_URL`, `AGENT_MAX_ITERATIONS` 등)

---

## 14. 주의사항 & 보안

### 14.1 프롬프트 인젝션 방지
- user_message 안에 "시스템 프롬프트 무시하고..." 류 공격 가능
- **대응**: user_id는 세션/토큰에서 강제 주입, LLM이 말해도 무시

### 14.2 유저 데이터 격리
- `get_user_wrong_history`, `get_user_topic_stats`는 반드시 요청자의 user_id로 제한
- 클라이언트가 user_id 파라미터 넘겨도 **서버에서 override**

### 14.3 비용 관리
- `gpt-4o-mini` 기준 대략 1회 대화당 $0.001~0.005
- Rate limit: 유저당 시간당 20회 권장
- 로깅으로 토큰 사용량 추적

### 14.4 할루시네이션 방지
- "잘 모르겠으면 모르겠다고 해" 프롬프트 명시
- 툴 결과 없으면 추측하지 말고 솔직히 답변하도록 지시

---

## 15. 향후 확장 아이디어

- [ ] RAG 도입 — 개념 문서 벡터DB화
- [ ] 멀티턴 대화 요약 — 세션 길어지면 자동 요약해서 토큰 절약
- [ ] A/B 테스트 — 프롬프트 v1 vs v2 성능 비교
- [ ] 피드백 수집 — 유저가 👍/👎 누를 수 있게, 데이터 축적
- [ ] 파인튜닝 — 충분한 데이터 쌓이면 자체 모델
- [ ] 학습 대시보드 — AI가 파악한 내 약점 시각화
- [ ] 스트리밍 응답 — SSE로 점진 출력

---

## 16. 참고 링크

- [OpenAI Function Calling 공식 문서](https://platform.openai.com/docs/guides/function-calling)
- [Django DRF](https://www.django-rest-framework.org/)
- [Redis Python Client](https://redis-py.readthedocs.io/)
- [Core-CBT 저장소](https://github.com/b-hyoung/Core-CBT)

---

## 부록 A: 대화 흐름 예시

### A.1 "왜 틀렸는지 물어보는" 흐름
```
유저: "이 문제 왜 3번이 아니야?"

[에이전트 내부]
1. get_question_detail(123) 호출
   → 정답은 2번, 해설: JOIN 문법 관련
2. get_user_wrong_history(42, 123) 호출
   → 이 유저 이 문제 2번째 틀림, 둘 다 3번 선택
3. LLM 답변 생성

유저에게:
"이 문제 두 번째 틀렸네요, 둘 다 3번 고르셨어요.
3번이 아닌 이유는 OUTER JOIN의 NULL 처리 때문이에요.
INNER JOIN과 달리 OUTER JOIN은... 
비슷한 유형 더 풀어보시겠어요?"
```

### A.2 "개념이 헷갈린다"는 흐름
```
유저: "근데 OUTER JOIN이 뭐야?"

[에이전트 내부]
1. search_concept("OUTER JOIN", "SQLD") 호출
   → 개념 설명 텍스트
2. LLM 답변 생성

유저에게:
"OUTER JOIN은 조인 조건에 맞지 않는 행도 포함하는 JOIN이에요.
LEFT OUTER JOIN은..."
```

### A.3 "비슷한 문제 달라"는 흐름
```
유저: "이런 유형 더 풀고 싶어"

[에이전트 내부]
1. search_similar_questions(123, limit=3) 호출
   → 유사 문제 3개p ID 반환
2. LLM 답변 생성

유저에게:
"JOIN 관련 문제 3개 추천드려요:
- 문제 127번: LEFT JOIN 관련
- 문제 134번: 여러 테이블 조인
- 문제 201번: NULL 처리 이슈
풀러 가시겠어요? (각 문제 링크)"
```