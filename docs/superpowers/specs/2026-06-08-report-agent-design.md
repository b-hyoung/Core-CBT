# 신고 처리 에이전트 워크플로 설계

**작성일:** 2026-06-08
**상태:** 승인됨 (사용자 검토 대기)
**관련 영역:** 문제 신고 처리, n8n, Dify, Slack, GitHub PR 자동화

## 한 줄 요약

> "Next.js는 그대로 신고 받고, n8n이 Slack 알림 + Dify 분석 + GitHub PR 생성 + Supabase 기록을 오케스트레이션한다. 사람은 PR만 리뷰한다."

## 배경 / 목적

현재 사용자가 문제를 신고하면:
- Supabase `analytics_events` 테이블에 적재
- Discord 웹훅으로 운영자에게 즉시 알림

운영자가 신고를 확인하고 데이터셋(`datasets/problem*/...`)을 수동으로 수정하는 구조.

이 흐름에 AI 분석/제안 단계를 추가해, 신고를 자동 분류하고 데이터셋 수정안을 GitHub PR로 제안한다. 운영자는 PR 리뷰만 한다.

## 결정사항 요약

| 항목 | 결정 |
|---|---|
| Dify 에이전트 역할 | 단일 신고 분석 + GitHub PR 자동 생성 |
| PR 가능 수정 영역 | comment / answer / problem 전체 |
| 무효 신고 처리 | PR 미생성, Slack 회신만 |
| PR 머지 정책 | 항상 사람이 리뷰 후 수동 머지 |
| Discord 알림 | 기존 Next.js 로직 그대로 유지 |
| Slack 알림 | n8n이 신규 추가 (분석 결과 포함) |
| n8n 호스팅 | n8n.cloud |
| Dify 호스팅 | Dify Cloud |
| 결과 영속화 | Supabase `report_analysis` 신규 테이블 + 관리자 대시보드 통합 |

## 전체 아키텍처

```
사용자 → POST /api/analytics/event
              ↓
Next.js API Route (기존)
  1. Supabase analytics_events insert (기존)
  2. Discord webhook 알림 (기존, 유지)
  3. NEW: n8n webhook POST (enriched payload)
              ↓
n8n.cloud Workflow (cbt-report-handler)
  1. Webhook Trigger
  2. IF: X-Webhook-Secret 검증
  3. Slack: 1차 알림 게시 → thread_ts 캡처
  4. HTTP: Dify Workflow API 호출
  5. Set: Dify 응답 파싱
  6. Supabase: report_analysis insert
  7. Switch: verdict 분기
     ├─ valid_fix → GitHub Get/Edit/PR → Slack 스레드에 PR 링크 → Supabase update
     ├─ invalid_report → Slack 스레드에 "무효 신고" 회신
     └─ needs_human → Slack 스레드에 "사람 판단 필요" 멘션 회신
  8. Respond 200
```

## 1. Next.js 측 변경

### 1.1 신규 환경변수 (`.env`)
```
N8N_REPORT_WEBHOOK_URL=https://<your>.app.n8n.cloud/webhook/cbt-report
N8N_REPORT_WEBHOOK_SECRET=<openssl rand -hex 32>
```

### 1.2 신규 헬퍼: `lib/reportEnrichment.js`
- `loadProblemFull(sessionId, problemNumber)` → `datasets/problem{year}/{round}/{problem|answer|comment}{N}.json`에서 해당 문항 추출 후 병합 객체 반환
- 못 찾으면 `null` (호출 측에서 n8n 송신 스킵)
- 경로 매핑: 기존 `SESSION_LABELS`와 정합. 정합성 검증 필요 (4/5 중복 키)

### 1.3 `app/api/analytics/event/route.js` 수정
기존 Discord 호출 다음에 n8n 송신 함수 fire-and-forget으로 추가:
```js
const enriched = event.type === 'report_problem'
  ? await loadProblemFull(originSessionId, originProblemNumber).catch(() => null)
  : null;
sendToN8n(event, enriched).catch(() => {});
```

송신 payload 구조:
```json
{
  "report_id": "...",
  "reported_at": "ISO8601",
  "reporter": { "email": "...", "name": "...", "ip": "..." },
  "origin": { "session_id": "...", "problem_number": 1, "exam_type": "objective|practical|sqld" },
  "report": { "reason": "...", "user_message": "..." },
  "problem": {
    "question_text": "...",
    "options": ["..."],
    "correct_answer_index": 0,
    "correct_answer_text": "...",
    "current_comment": "..."
  },
  "dataset_path": "datasets/problem2024/first"
}
```

### 1.4 보안
- `X-Webhook-Secret` 헤더로 n8n 측에서 검증
- 신고자 이메일은 Supabase 원본 저장 OK, Slack/PR 노출 시 `user@****` 마스킹
- IP는 Slack/PR 어디에도 노출 금지

## 2. n8n 워크플로 (`cbt-report-handler`)

n8n.cloud에서 사용자가 직접 구축. 노드 순서:

| # | 노드 | 핵심 설정 |
|---|---|---|
| 1 | Webhook Trigger | POST `/webhook/cbt-report`, Response Mode `Last Node` |
| 2 | IF | `$headers["x-webhook-secret"] === $env.WEBHOOK_SECRET`, FALSE면 401 응답 |
| 3 | Slack Post Message | Channel `#cbt-reports`, 1차 알림 본문 (회차/문항/사유/신고자/⏳분석중), `ts` 캡처 |
| 4 | HTTP Request → Dify | `POST https://api.dify.ai/v1/workflows/run`, Bearer 인증, Timeout 90s, `response_mode: "blocking"` |
| 5 | Set | `$json.data.outputs.{verdict, target_field, target_file, problem_number, new_value, reasoning, confidence}` 파싱 |
| 6 | Supabase Insert | `report_analysis` 테이블에 upsert (`on conflict (report_id)`) |
| 7 | Switch (verdict) | `valid_fix` / `invalid_report` / `needs_human` 분기 |
| 8a | GitHub Get File | path = `target_file`, ref = `main` |
| 8a-2 | Function/Code | JSON 파싱 → `problem_number` 매칭 → 필드 교체 → newContent 생성 |
| 8a-3 | GitHub Create Branch | `bot/report-{report_id}` from `main` |
| 8a-4 | GitHub Edit File | 위 newContent로 update, 같은 브랜치 |
| 8a-5 | GitHub Create PR | base `main`, head `bot/report-{report_id}`, labels `report-bot,needs-review` |
| 8a-6 | Slack Reply In Thread | `thread_ts` 사용, "✅ PR 생성됨: <url|#N>" |
| 8a-7 | Supabase Update | `pr_number`, `pr_url`, `pr_state='open'` |
| 8b | Slack Reply In Thread | "🟡 무효 신고: {reasoning}" |
| 8c | Slack Reply In Thread | "🔴 <@admin> 사람 판단 필요: {reasoning}" |
| 9 | Respond to Webhook | 200 `{ok, report_id, verdict}` |

### n8n 환경변수
```
WEBHOOK_SECRET=<Next.js와 동일값>
DIFY_API_KEY=app-xxxxx
DIFY_WORKFLOW_URL=https://api.dify.ai/v1/workflows/run
SUPABASE_URL=https://<proj>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GH_OWNER=<github-user>
GH_REPO=jchsanGi
SLACK_REPORT_CHANNEL=#cbt-reports
SLACK_ADMIN_USER_ID=U01XXX
REPORT_DRY_RUN=false
RATE_LIMIT_HOURS=24
```

## 3. Dify 워크플로 (`cbt-report-judge`)

### 3.1 Start 노드 입력 변수
| 변수 | 타입 |
|---|---|
| `report_id` | string |
| `question_text` | paragraph |
| `options_json` | string |
| `correct_answer_index` | number |
| `correct_answer_text` | string |
| `current_comment` | paragraph |
| `report_reason` | string |
| `user_message` | paragraph |

### 3.2 LLM 노드
- 모델: Claude Sonnet 4.6 (또는 Haiku 4.5 비용 절감)
- Temperature: 0.2
- Response Format: JSON
- Max tokens: 1500

시스템 프롬프트는 다음 JSON 스키마를 강제:
```json
{
  "verdict": "valid_fix" | "invalid_report" | "needs_human",
  "target_field": "comment" | "answer" | "problem" | null,
  "new_value": <field에 따라 string | {index,text} | {question_text, options[]}> | null,
  "reasoning": "한국어 2~4문장",
  "confidence": 0.0~1.0
}
```

`new_value` 형식:
- `comment` → string (개선된 해설 전문)
- `answer` → `{"correct_answer_index": int, "correct_answer_text": string}`
- `problem` → `{"question_text": string, "options": [4개 string]}`

### 3.3 Code 노드 (Python) — 파싱 + 안전장치
- 코드펜스 제거 후 `json.loads`
- 실패 시 verdict='needs_human'으로 강등
- `valid_fix`인데 `target_field` 누락 → needs_human 강등
- confidence < 0.6 → needs_human 강등

### 3.4 End 노드
위 dict 필드를 개별 변수로 출력

## 4. GitHub PR 전략

### 4.1 사전 준비
- Fine-grained PAT: 이 repo만, `Contents R/W`, `Pull requests R/W`, `Metadata R`
- 라벨 추가: `report-bot`, `needs-review`

### 4.2 브랜치/커밋 규칙
| 항목 | 규칙 |
|---|---|
| 브랜치명 | `bot/report-{report_id}` |
| 커밋 메시지 | `fix(dataset): {origin_label} {N}번 {target_field} 수정 (report:{report_id})` |
| 베이스 | `main` |
| 1 PR = 1 신고 | 묶지 않음 |
| 들여쓰기 | 2칸, 끝줄 개행 1개 (기존 포맷 유지) |

### 4.3 파일 수정 로직 (n8n Function 노드)
- 파일 JSON 파싱
- `section.{problems|answers|comments}` 배열에서 `problem_number` 매칭
- 인덱스 의존 금지
- 해당 필드만 교체

### 4.4 PR 본문 템플릿
신고 정보 + Dify 판단(verdict/confidence/근거) + 리뷰 체크리스트 + 자동 생성 안내문구

### 4.5 안전장치
- **Dry-run**: `REPORT_DRY_RUN=true`면 PR 미생성, Slack에 "would-create" 출력만 (초기 1~2주)
- **레이트 리밋**: 같은 `(session, problem)` 24h 내 open PR 있으면 PR 생성 스킵, 기존 PR 링크만 회신
- **사이즈 가드**: comment 5자 미만 또는 5000자 초과 → needs_human 강등

## 5. Supabase 스키마

`scripts/supabase-report-analysis.sql` 신규:
```sql
create table if not exists public.report_analysis (
  report_id text primary key,
  origin_session_id text not null,
  origin_problem_number int not null,
  verdict text not null check (verdict in ('valid_fix','invalid_report','needs_human')),
  target_field text null check (target_field in ('comment','answer','problem')),
  target_file text null,
  confidence numeric(3,2) null,
  reasoning text null,
  new_value jsonb null,
  pr_number int null,
  pr_url text null,
  pr_state text null check (pr_state in ('open','closed','merged','skipped','dry_run')),
  slack_thread_ts text null,
  dify_workflow_run_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- indexes: verdict, (origin_session_id, origin_problem_number), created_at, pr_state
-- trigger: updated_at 자동 갱신
```

RLS off (Service Role Key 사용).

## 6. 관리자 대시보드 변경 (Phase 4)

- 신고 리스트에 컬럼 추가: AI 판정 / Confidence / PR 링크
- `app/api/admin/report-analysis/route.js` 신규 — report_id 리스트로 LEFT JOIN 조회
- 권한: 기존 `getAdminSession()` 재사용
- 필터/탭은 데이터 모인 후 추가 (YAGNI)

## 7. 에러 처리 / 멱등성

| 실패 지점 | 동작 |
|---|---|
| Next.js → n8n | fire-and-forget catch, 신고 자체는 보존됨 |
| n8n Webhook 인증 실패 | 401 + 종료, 알림 X |
| Slack 1차 알림 실패 | Continue On Fail, thread_ts 없으면 후속은 새 메시지 폴백 |
| Dify 실패/타임아웃 | 재시도 1회 → Slack에 "🔴 Dify 분석 실패" + needs_human insert |
| GitHub Get File 404 | dataset_path 오류 → Slack 알림 + needs_human |
| GitHub PR 생성 실패 | 재시도 1회 → Slack 회신 + pr_state='skipped' |
| Supabase 쓰기 실패 | Continue On Fail (n8n 실행 로그로만 추적) |

멱등성:
- `report_id` 기준 upsert
- 같은 `(session, problem)` 24h open PR 있으면 신규 PR 스킵
- 별도 Error Trigger 워크플로로 unhandled error를 `#cbt-reports-errors` 채널에 알림

## 8. Phasing

| Phase | 목표 | 종료 기준 |
|---|---|---|
| 0. 준비 | 계정/시크릿 수집 | 아래 체크리스트 완료 |
| 1. MVP | comment 수정만 자동화 + Dry-run | Slack에 분석 결과가 일관되게 표시 |
| 2. PR 활성화 | comment-only 실제 PR 생성 | 실제 PR 1건 머지 |
| 3. 영역 확대 | answer/problem PR 활성화 | 각 1건 머지 |
| 4. 대시보드 통합 | Supabase 조인 + 컬럼 표시 | 관리자 페이지에서 AI 판정 보임 |
| 5. (선택) 운영 강화 | GitHub Webhook 역동기화, 멱등성 가드 강화 | 필요해질 때 |

### Phase 0 체크리스트 (사용자 작업)
- [ ] n8n.cloud 계정 + 워크스페이스 URL
- [ ] Dify Cloud 계정
- [ ] Slack 워크스페이스 + 봇(`chat:write`, `chat:write.public`) + 채널 초대
- [ ] Slack Bot User OAuth Token
- [ ] Slack 본인 User ID (멘션용)
- [ ] (Phase 2) GitHub Fine-grained PAT
- [ ] (Phase 2) GitHub 라벨 `report-bot`, `needs-review`
- [ ] (Phase 2) `SESSION_LABELS` ↔ 데이터셋 폴더 매핑 검증 (4/5 중복 키 확인)

### 코드/문서 산출물 (claude 작업)
1. `lib/reportEnrichment.js` (신규)
2. `app/api/analytics/event/route.js` (수정)
3. `scripts/supabase-report-analysis.sql` (신규)
4. `.env.example` (업데이트)
5. `docs/n8n/cbt-report-handler.md` (신규) — n8n 단계별 구축 가이드
6. `docs/dify/cbt-report-judge.md` (신규) — Dify 단계별 구축 가이드
7. `docs/github/pr-template-report-bot.md` (신규)
8. (Phase 4) 관리자 대시보드 변경 + `/api/admin/report-analysis`

## 미해결 / 확인 필요

1. **데이터셋 경로 매핑**: `SESSION_LABELS`에 `4→2024년 2회차`, `5→2024년 3회차` 중복. 실제 폴더 매핑 검증 필요.
2. **exam_type 분기**: 필기/실기/SQLD 데이터셋 폴더 구조 차이. `loadProblemFull`이 세 타입 모두 지원해야 함.
3. **실기(practical) 문항 신고**: 입력형 채점이라 정답 구조가 다름. Phase 3에서 별도 검토.
4. **Slack 봇 이름/아이콘**: 사용자 결정 영역.
