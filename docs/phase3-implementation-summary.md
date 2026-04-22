# Phase 3 구현 요약: Next.js 코치 위저드 UI (Task 20~26)

**브랜치:** `feat/agent`  
**기간:** 2026-04-19  

---

## 커밋 히스토리

| SHA | Task | 설명 |
|-----|------|------|
| `f3493b9` | Task 20 | topicStatsStore — 카테고리/서브카테고리 정답률 집계 |
| `6e7cd88` | Task 21 | /api/user/topic-stats Next.js 라우트 |
| `73cda18` | Task 22 | wrongProblemsStore — 카테고리 필터 틀린 문제 목록 |
| `63a0318` | Task 23 | /api/user/wrong-problems 라우트 (SQL/Code 필터) |
| `8c4c4d7` | Task 24 | /practical/coach 카테고리 진단 화면 |
| `4158085` | Task 25 | /practical/coach/[category] 틀린 문제 리스트 |
| `299af99` | Task 26 | /practical 회차 선택 화면에 코치 에이전트 카드 추가 |

---

## 신규 파일 구조

```
lib/
├── topicStatsStore.js         ← Task 20: 카테고리별 정답률 집계
└── wrongProblemsStore.js      ← Task 22: 카테고리 필터 틀린 문제 리스트

app/api/user/
├── topic-stats/route.js       ← Task 21: GET /api/user/topic-stats
└── wrong-problems/route.js    ← Task 23: GET /api/user/wrong-problems?category=SQL|Code

app/practical/
├── PracticalSelectionPageClient.js  ← Task 26: 코치 에이전트 카드 추가 (수정)
└── coach/
    ├── page.js                      ← Task 24: 카테고리 진단 (서버 컴포넌트)
    ├── CoachCategoryPageClient.js   ← Task 24: 카테고리 진단 (클라이언트)
    └── [category]/
        ├── categoryConfig.js        ← Task 25: slug ↔ category 매핑
        ├── page.js                  ← Task 25: 틀린 문제 리스트 (서버)
        └── CoachProblemListClient.js ← Task 25: 틀린 문제 리스트 (클라이언트)
```

---

## 유저 플로우 (4단계 위저드 중 1~3단계)

1. `/practical` → "코치 에이전트" 카드 클릭 (풀이 기록 있을 때만 활성)
2. `/practical/coach` → SQL / Code / 이론 카테고리별 정답률 확인 (이론은 "준비중")
3. `/practical/coach/sql` 또는 `/practical/coach/code` → 틀린 문제 리스트
4. 문제 클릭 → `/practical/{sessionId}?p={N}&from=coach` (기존 퀴즈 화면)

4단계(챗봇 대화)는 Phase 4에서 AgentChat 컴포넌트로 구현 예정.

---

## 다음 단계

- **Phase 4 (Task 27~33):** AgentChat 컴포넌트 (채팅 UI, 유사 문제 카드, 채점 피드백)
- **Phase 5 (Task 34~37):** Agent 프록시 라우트 (Next.js → FastAPI) + E2E 검증
- **Phase 6 (Task 38~40):** 폴리싱 (프롬프트 튜닝, Rate limit, 보안 체크리스트)
