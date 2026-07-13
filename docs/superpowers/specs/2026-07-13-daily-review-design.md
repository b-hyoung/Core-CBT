# 오늘의 복습 (Daily Review) — 실기 오답 변형 재출제 생존키트

- 날짜: 2026-07-13 (월)
- 제약: **시험 D-6 (2026-07-19 일요일)**. 오늘 구현, 화~토 실사용.
- 근거: `docs/superpowers/research/2026-07-13-practical-coaching-research.md`
- 최우선 품질 기준 (사용자 지정): **생성 문제의 질**

## 배경과 목표

정보처리산업기사 실기는 기출이 그대로 재출제되지 않고 유사 유형만 반복된다.
따라서 학습 루프는:

1. 기출(2022~2026)을 푼다
2. 틀린 문제의 **유사 변형**을 다음날 다시 푼다 (간격 1일 = 남은 6일 기준 최적 간격)
3. 변형도 틀리면 기록하고, 또 다음날 새 변형으로 재출제

환경 제약: 유사 문제 생성은 로컬 agent 서버(`AGENT_API_URL`, localhost:8001)에서만 가능.
→ **생성은 집(로컬)에서, 풀기는 어디서나(폰/프로덕션)** 구조로 분리한다.

## 아키텍처

```
[집/로컬]                          [Supabase]                [어디서나/폰]
기출 풀기 → 오답 기록 ─┐
                        ├→ 생성 버튼 → generated_problems → /practical/daily-review
agent 서버 (유사 변형) ─┘            (due_date 게이팅)        (PracticalQuizV2 주입)
                                          ↑                        │
                                          └── 결과 반영 (done/재스케줄) ──┘
```

## ① 데이터 — `generated_problems` 테이블

| 컬럼 | 타입 | 내용 |
|---|---|---|
| `id` | uuid PK | |
| `user_email` | text | 소유자 (정규화: trim + lowercase) |
| `source_session_id` | text | 원본 기출 세션 (예: practical-industrial-2024-1) |
| `source_problem_number` | int | 원본 문항 번호 |
| `problem` | jsonb | 데이터셋 problem 객체와 동일 shape (question_text, examples, input_type, input_labels, answer_format_hint, category, subcategory) |
| `answer` | text | 정답 |
| `accepted_answers` | jsonb | 허용 답안 배열 |
| `comment` | text | 해설 |
| `due_date` | date | 풀 날짜 |
| `status` | text | `pending` / `done` / `discarded` |
| `attempts` | int | 시도 횟수 |
| `created_at`, `last_result_at` | timestamptz | |

problem을 데이터셋 shape 그대로 저장하는 이유: `PracticalQuizV2`에 변환 없이 주입하기 위해.

## ② 생성 — `POST /api/daily-review/generate` (로컬 전용)

1. `auth()` → email. 내 실기 오답 조회 (`getUserWrongProblems` + `classifySessionId`로 practical 필터)
2. 오답 각각에 대해 agent 서버로 유사 변형 생성 (기존 `/api/agent/chat` 프록시 패턴 재사용)
3. `generated_problems`에 insert, **due_date = 내일**
4. 스킵 규칙: 같은 원본에 pending 변형이 이미 있으면 건너뜀
5. agent 서버 미기동 시: 명확한 에러 메시지 ("로컬에서 agent 서버를 켜고 실행하세요")

트리거 UI: `/practical/daily-review` 페이지 상단 버튼 (로컬에서만 동작해도 무방).

## ③ 품질 게이트 — 이 기능의 성패 (최우선)

리서치 근거: LLM 자유 생성 문항의 작성 결함률 ~49%, 개념 오류 ~22% (Law 2025).
검증된 대응 = 개념 고정 + 표면 치환(템플릿 방식) + 기계 검증 + 사람 최종 판정.

1. **생성 프롬프트에 원본 전체 컨텍스트 제공**: 원본 문제 + 정답 + 해설을 함께 넘기고,
   "측정 개념은 유지하고 표면(값·명칭·표현)만 바꿔라"를 명시. 난이도 앵커 = 원본.
2. **agent 서버의 실행 검증 활용**: SQL 변형은 기존 MySQL 실행 검증 경로를 반드시 태움.
   (agent 서버에 이미 존재 — 이 레포에서는 응답의 검증 플래그 확인만)
3. **저장 전 자동 검증 (이 레포 담당)**:
   - **출력 스키마 강제**: 생성 응답을 JSON Schema로 검증 (question_text, answer,
     input_type 등 데이터셋 shape) — 파싱 결함 클래스를 통째로 제거
   - 정답이 문제 본문에 그대로 노출되지 않는지 문자열 검사
   - 원본과 문제 텍스트가 사실상 동일하면(유사도 과다) 거부 — "같은 문제 반복 금지" 위반
4. **재생성 예산 하드캡 (stop rule)**: 게이트 실패 시 실패 사유를 프롬프트에 넣어
   재생성하되 **최대 2회**, 초과 시 해당 문항 폐기 + 로그. 무한 재시도 비용과
   "억지로 통과한 저품질" 둘 다 방지.
5. **풀이 화면에 "문제 이상해요" 버튼**: 원탭으로 `status='discarded'` 처리 + 다음 생성 때
   해당 원본의 새 변형 생성. 사람 최종 판정을 가장 싸게 넣는 장치. 폐기 사유는 로깅.
6. 검증 실패 변형은 저장하지 않고 생성 결과 요약에 "N건 품질 미달로 제외" 표시.
7. (시간 남으면) **별도 모델 rubric 채점**: 생성 모델이 아닌 다른 모델이 "정답 유일성 ·
   단서 누출 · 원본과 개념 동일성" 체크리스트로 절대 채점 — 자기 선호 편향 회피.
   1-pass만, A/B 비교 채점은 하지 않음.

근거: 하네스/루프 엔지니어링 리서치 (Anthropic harness 설계 2025-26, Osmani "Loop
Engineering" 2026-06, MCQG-SRefine). 핵심 원칙 — "루프의 병목은 모델이 아니라
검증자(verifier)"이며, 생성자와 검증자는 분리한다. 다중 judge 앙상블 등은 이 규모에 과잉.

## ④ 풀기 — `/practical/daily-review` (force-dynamic, 로그인 필수)

- 조회: `user_email = 나 AND due_date <= 오늘 AND status = 'pending'`
- `high-wrong/page.js` 패턴 복제: 문제 renumber(1..N) + answersMap/commentsMap 구성 → `PracticalQuizV2`
- **인터리빙**: category(SQL/Code/이론)가 연속 2문항 이상 나오지 않게 셔플 (근거 d=0.83)
- sessionId = `'practical-daily-review'` (SYNTHETIC_SESSIONS에 등록)
- 채점: 기존 accepted_answers 매칭 → agent 서버 불필요, 폰에서 완전 동작
- 풀 문제 0건이면 안내 화면 ("오늘 복습할 문제가 없습니다 · 생성 버튼은 집에서")
- 진입점: 실기 선택 페이지에 "오늘의 복습 (N문제)" 카드

## ⑤ 기록·재스케줄 — `POST /api/daily-review/result`

- 풀이 완료 시 기존 finish_exam 파이프라인은 그대로 유지 (전체 통계 보존)
- 추가로 변형별 결과 반영:
  - 맞힘 → `status='done'`
  - 틀림 → `due_date = 내일`, attempts+1, 다음 생성 실행 시 같은 원본의 **새 변형** 추가
- 본인 소유 행만 갱신 가능 (user_email 검사)

## 이번 주 범위에서 제외 (YAGNI)

개념 태깅/숙달 바, 1→3→7일 확장 간격(1일 고정), 힌트 사다리, 과신 콜아웃,
진단 리포트, 이론 문항의 실행 검증. 전부 시험 후 풀 리빌딩에서.

## 테스트 전략

- vitest: due_date 게이팅 로직, 인터리빙 셔플 제약, 품질 자동 검증(정답 노출·중복 텍스트 거부), row ↔ 퀴즈 주입 shape 매핑
- 수동 E2E: 로컬에서 생성 → Supabase 확인 → (내일 날짜로) 풀기 → 결과 반영 확인

## 성공 기준

- 화요일 아침 폰으로 `/practical/daily-review` 접속 시 월요일 오답의 변형이 출제된다
- 변형을 틀리면 수요일에 다시 나온다 (새 변형 생성 시)
- 품질 미달 문제는 저장되지 않거나 원탭으로 제거할 수 있다
