export const prompts = {
  phase0: {
    title: "Phase 0 · 셋업과 데이터",
    when: "2026-02-17 ~ 02-20",
    what: [
      "create-next-app으로 골격 시작",
      "기출 PDF → 회차별 JSON 변환",
      "회차 선택 → 60문항 풀이 라우팅",
    ],
    prompt: `[목표]
정보처리산업기사 필기 기출 PDF를 JSON으로 변환하고
Next.js로 회차별 풀이 페이지 만들기.

[지금 상태]
- create-next-app 갓 생성, 라우팅 미설계
- 기출 PDF 5회분 보유, 데이터 구조 미정

[부탁 — 한 번에 하나씩 물어봐줘]
1. JSON 스키마 제안
   (회차 / 문항번호 / 지문 / 보기4 / 정답 / 해설 / 과목)
2. /datasets/problem2022/{회차}.json 폴더링이 맞을지
3. 풀이 페이지 라우팅 — /exam/[year]/[round] vs /exam?... 트레이드오프

추천안은 맨 위에, 이유 한 줄씩.`,
    takeaway: "큰 결정은 한꺼번에 묻지 말고 객관식으로 쪼개라.",
  },

  phase1: {
    title: "Phase 1 · 운영 루프",
    when: "2026-02-22 ~ 03-09",
    what: [
      "신고 기능 + Discord Webhook 알림",
      "Supabase analytics_events / reports 테이블",
      "/admin 대시보드 — 방문/완료/합격률",
    ],
    prompt: `[배경]
사용자가 문제 오류를 발견해도 전달할 방법이 없음.
운영자는 어떤 문항이 자주 신고되는지 한눈에 봐야 함.

[제약]
- DB 고정비 X → Supabase 무료 티어
- 알림은 Discord Webhook
- /admin 은 비공개 라우트

[원하는 결정 3개 — 각각 추천안 + 트레이드오프]
A. 신고 데이터 모델: 같은 문항 반복 신고를 어떻게 묶을지
   (원본 회차+문항번호 기반 group_key vs 별도 group 테이블)
B. Discord 페이로드: 회차 / 문항 / 사유 / 요약 / 관리자 링크
C. /admin 최소 지표: 방문 / 시작 / 완료 / 합격률 / 신고

설계 후 supabase migration SQL 까지.`,
    takeaway: "기능 추가 전에 '관찰 가능한가'를 먼저 만들면 다음 우선순위가 보인다.",
  },

  phase2: {
    title: "Phase 2 · 실기 UX 투명성",
    when: "2026-04-15 (16 commits)",
    what: [
      "answer_format_hint 자동 추론 + Supabase override",
      "gradePracticalAnswer.js 채점 모듈 분리",
      "ResultFeedback — diff + 관대 채점 이유 표시",
    ],
    prompt: `[문제]
실기 입력 5종(single / ordered_sequence / unordered_symbol_set /
multi_blank / textarea) 채점이 관대하게 동작하지만
- answer_format_hint가 일부 문항만 → 사용자가 포맷 추측
- 관대 채점 이유가 안 보임 → 신뢰 못해서 여러 번 시도
- diff 없음 → 오답 원인 학습 효율 ↓

[원하는 것]
입력 전 "무엇이 정답인지" 명시 +
채점 후 내 답 vs 정답 비교 + 관대 채점 이유

[조건]
- 힌트 데이터: 자동 추론 + Supabase override
- 채점 분리: app/practical/[sessionId]/_lib/gradePracticalAnswer.js
- 관리자 UI는 /admin 안에 탭 추가

설계서 형식:
① decisions table (결정 / 값 / 이유)
② architecture diagram
③ data flow 순서`,
    takeaway: "스펙은 결정 테이블이 본문이다. 산문은 줄여라.",
  },

  phase3: {
    title: "Phase 3 · AI 코치 에이전트 (하루 89 커밋)",
    when: "2026-04-19",
    what: [
      "FastAPI 별도 서버 + shared secret 인증",
      "Raw Function Calling (no LangChain)",
      "Tool 5종 · Agent Runner 최대 10 iter",
    ],
    prompt: `실기 오답을 다시 볼 때 공식 해설만으론 부족해.
자연어로 "왜 틀렸어?" 물으면
사용자의 이 문제 오답 이력을 반영한 답을 줘야 함.
SQL/Code는 유사 문제 자동 생성 → 다시 풀게.

처음부터 같이 설계하자.
한 번에 하나씩, 객관식으로 물어봐:

1. 스택: FastAPI 별도 서버 vs Next.js API Route만
2. LLM 추상화: LangChain vs Raw Function Calling
3. 세션 저장: Postgres 영구 vs 휘발
4. 인증 경계: 직접 노출 vs Next 프록시 + shared secret
5. Tool 셋: question / user_history / code_executor /
            output_tools / dispatch 다섯 개로 시작?

각 결정마다 트레이드오프 표. 추천안 맨 위에.`,
    takeaway: "에이전트는 프레임워크 없이 직접 짜야 한 번에 디버깅 가능하다.",
  },

  phase4: {
    title: "Phase 4 · 실행 검증 + Critic AI",
    when: "2026-04-23 ~ 04-27",
    what: [
      "SQL 유사 문제 → 실제 MySQL 실행으로 검증",
      "Code → 컴파일러 실행 후 정답 비교",
      "둘 다 실패 시 Critic AI(다른 모델) 폴백",
    ],
    prompt: `[현재 문제]
GPT-4o-mini가 생성한 유사 문제가
- SQL: 문법 OK인데 의도와 다른 결과
- Code: 정답 텍스트만 비교라 코드 구조 동일도 통과

[원하는 것]
1) SQL 유사 문제: 실제 MySQL에 SELECT 던져 결과로 검증
2) Code 유사 문제: 컴파일러 실행 → 출력 비교
3) 둘 다 실패하면 Critic AI(평가자 모델)에 점수 요청 → 폴백

fastapi_app/tools/code_executor.py 설계:
- 입력 / 출력 스키마
- 타임아웃·메모리 제한
- 컨테이너 격리 여부 (yes/no + 이유)
- 정답 비교 normalize 규칙

단계별로, 코드 X 설계만.`,
    takeaway: "AI 출력은 항상 외부 검증기를 통과시켜라 (LLM-as-judge는 최후).",
  },

  phase5: {
    title: "Phase 5 · teach_CBT 파인튜닝 파이프라인",
    when: "2026-04-19 (별도 spec)",
    what: [
      "별도 프로젝트로 분리",
      "4-Phase: 수집 → 쌍 생성 → 평가 → LoRA 튜닝",
      "gpt-oss:20b → ollama 등록 목표",
    ],
    prompt: `GPT-4o-mini API 비용을 줄이려면 결국 로컬 모델.
별도 프로젝트 teach_CBT 로 파이프라인 분리.

4-Phase로 가자:
P1. 데이터 수집 — 크롤링 + 정규화
P2. 유사 문제 쌍 생성 — GPT-4o-mini + gpt-oss:20b
P3. 품질 평가 — Claude/GPT-4o 평가자 → 점수
P4. LoRA 파인튜닝 → ollama 등록

각 Phase 마다 표로:
- 입력 / 출력 스키마
- 평가 지표
- 실패 케이스 처리

스코프 너무 크면 P1만 먼저 잘라줘.`,
    takeaway: "큰 비전은 spec 한 장에 그리되, 실행은 Phase 1만 잘라서 들어가라.",
  },
};

export const patterns = [
  {
    icon: "①",
    name: "브래인스토밍",
    rule: "한 번에 하나씩 · 가능하면 객관식",
    template: `[지금 상태]
- ...

[하고 싶은 것]
- ...

[부탁]
한 번에 하나씩, 가능하면 A/B/C 객관식으로 물어봐.
각 결정의 트레이드오프 표 + 추천안 맨 위.`,
    real: "Phase 3 에이전트 설계 — 5개 결정을 5번에 나눠 물음",
  },
  {
    icon: "②",
    name: "스펙(설계서)",
    rule: "결정 테이블 + 다이어그램 + 데이터 흐름",
    template: `결과물: docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md

목차:
1. 배경 / 목표 / 범위 한정
2. 스택 결정 (표)
3. 아키텍처 (ASCII 다이어그램)
4. 데이터 모델 / API 인터페이스
5. 실패 모드
6. V2+ 보류 항목`,
    real: "2026-04-19-ai-tutor-agent-design.md · 282줄, 결정표 7개",
  },
  {
    icon: "③",
    name: "플랜(작업 분해)",
    rule: "Task 단위 + 각 Task의 검증 기준",
    template: `Spec: docs/superpowers/specs/...
Plan: docs/superpowers/plans/YYYY-MM-DD-<topic>.md

Task 형식:
### Task N — <한 줄>
- 변경 파일
- 구현 핵심
- 완료 기준 (테스트 / 수동 확인)
- 의존 Task

10개 미만으로 쪼개. 너무 크면 sub-spec.`,
    real: "teach-cbt-pipeline 10 Tasks 분해",
  },
  {
    icon: "④",
    name: "구현 (TDD · 작은 diff)",
    rule: "실패 테스트 먼저 · 한 Task = 한 commit",
    template: `현재 Task: <plan의 Task N>

순서:
1. 실패 테스트 작성 (왜 실패하는지 1줄)
2. 최소 구현으로 통과
3. 리팩터 (테스트 그대로)

제약:
- diff 200줄 미만
- 무관 리팩터 금지
- 주석은 WHY 만`,
    real: "gradePracticalAnswer.js — 입력 5종 채점 + diff",
  },
  {
    icon: "⑤",
    name: "디버깅 (systematic)",
    rule: "재현 → 가설 → 최소 변화 검증",
    template: `[증상]
- 정확히 일어나는 것:
- 일어나지 않는 것:

[재현 단계]
1. ...
2. ...

[가설 (우선순위 순)]
A. ... 검증: ...
B. ...

가장 비용 낮은 가설부터 검증. 코드 수정 전에 가설부터.`,
    real: "유사 문제 정답 중복 — 텍스트 비교만 한 _check_answer_duplicate",
  },
  {
    icon: "⑥",
    name: "리뷰 · 리팩터링",
    rule: "변경 의도 vs 실제 diff 갭 확인",
    template: `이 PR/브랜치를 비판적으로 봐줘.

확인 포인트:
1. 스펙의 결정 테이블과 코드가 일치하는가
2. 무관한 변경이 섞였는가
3. 테스트가 행위 아닌 구현을 검증하지 않는가
4. 다음 사람이 5분 안에 흐름을 따라갈 수 있는가

각 항목에 PASS / WARN / FAIL + 한 줄 근거.`,
    real: "ultrareview · code-reviewer 서브에이전트로 독립 검증",
  },
];
