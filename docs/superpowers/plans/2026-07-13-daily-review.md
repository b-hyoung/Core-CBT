# 오늘의 복습 (Daily Review) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 틀린 실기 문제의 LLM 변형을 다음날 재출제하는 개인화 복습 루프 (스펙: `docs/superpowers/specs/2026-07-13-daily-review-design.md`)

**Architecture:** 오답 조회(기존 userProblemsStore) → 개념 태그 기반 앵커 선정 → OpenAI 직접 호출로 변형 생성(스키마 게이트 + 심판 + 재생성 예산 2회) → Supabase `generated_problems` 저장 → `/practical/daily-review` 페이지가 due 문제를 PracticalQuizV2에 주입(high-wrong 패턴) → 기존 finish_exam 애널리틱스 훅에서 결과 반영.

**Tech Stack:** Next.js App Router, Supabase PostgREST(REST fetch 패턴), OpenAI `/v1/responses` (생성 gpt-4.1 / 심판 gpt-4.1-mini — 자기선호 편향 회피), vitest.

**중요 설계 결정:** 생성 백엔드는 coach의 agent 서버(localhost:8001)가 아니라 **OpenAI 직접 호출** (레포 기존 패턴: `app/api/gpt/objection/route.js:243`). 이유: (a) 정답·해설을 응답에 포함시키는 계약을 우리가 통제 → 로컬 채점 가능, (b) OPENAI_API_KEY는 프로덕션(Netlify)에도 있어 생성이 어디서나 동작, (c) 하네스 전체를 이 레포에서 테스트 가능.

**전제 조건:** `.env`에 `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 존재(확인됨). psql/supabase CLI 없음 — DDL은 사용자가 Supabase SQL Editor에서 수동 실행.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `supabase/migrations/20260713000001_generated_problems.sql` | 생성 문제 저장 테이블 DDL (수동 실행) |
| `lib/kstDate.js` | KST 날짜 문자열 헬퍼 (순수함수) |
| `lib/generatedProblemsStore.js` | generated_problems CRUD + 퀴즈 주입용 row 매핑 |
| `lib/conceptTags.js` | 개념 태그 로드 + 앵커 선정 순수함수 (확장/커버리지) |
| `lib/variantGeneration.js` | 하네스 순수함수: 검증 게이트, 근사중복, 인터리빙, 배치 계획, 프롬프트 |
| `scripts/generate-concept-tags.mjs` | 기출 전체 개념 태깅 1회성 스크립트 |
| `datasets/practicalIndustrial/conceptTags.json` | 태깅 결과 (커밋 대상) |
| `app/api/daily-review/generate/route.js` | 생성 오케스트레이션 (OpenAI 호출 + 게이트 + 심판 + 예산) |
| `app/practical/daily-review/page.js` | 복습 풀이 페이지 (SSR, PracticalQuizV2 주입) |
| `app/practical/daily-review/GenerateButton.js` | 빈 상태의 생성 버튼 (클라이언트) |
| Modify: `lib/userProblemsStore.js` | `forceRemote` 옵션 + `getUserOutcomeSummary` 추가 |
| Modify: `app/api/analytics/event/route.js` | finish_exam/report_problem → 결과 반영/폐기 훅 |
| Modify: `app/practical/_lib/practicalData.js:8` | SYNTHETIC_SESSIONS에 `'daily-review'` 추가 |
| Modify: `app/practical/PracticalSelectionPageClient.js` | 오늘의 복습 카드 추가 |
| Test: `tests/kstDate.test.js`, `tests/variantGeneration.test.js`, `tests/conceptTags.test.js`, `tests/generatedProblemsStore.test.js` | 순수함수 TDD |

테스트 실행 명령(레포 컨벤션): `npx vitest run tests/<파일> --silent=false`

---

### Task 0: 사전 검증 — PracticalQuiz 결과 이벤트가 origin 참조를 쓰는지 확인

결과 반영 훅(Task 8)은 finish_exam의 `problemOutcomes[].sessionId`가 주입 문제의 **원본 세션 ID**(예: `practical-industrial-2024-1`)라는 가정에 의존한다. high-wrong 풀이 결과가 기출 sid로 `problem_outcomes`에 쌓여 있으므로 사실일 가능성이 높지만, 반드시 확인한다.

- [ ] **Step 1: PracticalQuiz의 outcome 생성부 확인**

Run: `grep -n "problemOutcomes" "app/practical/[sessionId]/PracticalQuiz.js" | head -20`
그 결과 라인 주변을 Read로 열어 outcome 객체의 `sessionId` 필드가 어떻게 채워지는지 확인.

Expected: `originSessionId || sessionId` 또는 유사 패턴 (문제 객체의 `originSessionId`/`originProblemNumber` 우선).

- [ ] **Step 2: 판정**

- origin 우선이면 → 계획 그대로 진행.
- **아니면 (event.sessionId 그대로 기록)** → STOP. 사용자에게 보고하고 Task 8을 조정해야 함 (대안: 주입 문제에 origin 필드를 추가하는 PracticalQuiz 수정 검토). 이 계획의 나머지 태스크(1~7)는 영향 없음.

---

### Task 1: Supabase 마이그레이션 — `generated_problems` 테이블

**Files:**
- Create: `supabase/migrations/20260713000001_generated_problems.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 오늘의 복습: LLM 생성 변형 문제 저장
-- 설계: docs/superpowers/specs/2026-07-13-daily-review-design.md
-- 실행: Supabase SQL Editor에서 수동 실행 (CLI 없음)

CREATE TABLE IF NOT EXISTS public.generated_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  source_session_id text NOT NULL,
  source_problem_number int NOT NULL,
  kind text NOT NULL DEFAULT 'variant',        -- variant | expansion | coverage
  concept_tag text,
  problem jsonb NOT NULL,                      -- 데이터셋 problem 객체 shape
  answer text NOT NULL,
  accepted_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  comment text NOT NULL DEFAULT '',
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',      -- pending | done | discarded
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_result_at timestamptz
);

-- due 조회 (풀이 페이지의 핵심 쿼리)
CREATE INDEX IF NOT EXISTS idx_generated_problems_due
  ON public.generated_problems (user_email, status, due_date);

-- origin 매칭 (결과 반영·중복 생성 방지)
CREATE INDEX IF NOT EXISTS idx_generated_problems_origin
  ON public.generated_problems (user_email, source_session_id, source_problem_number, status);
```

- [ ] **Step 2: 사용자에게 SQL Editor 실행 요청**

사용자에게 위 SQL을 Supabase SQL Editor에서 실행해 달라고 요청하고 완료 확인을 받는다. (이후 태스크는 로컬 유닛테스트 위주라 병렬 진행 가능하나, Task 7 이후의 실제 호출 검증 전에는 반드시 완료되어야 함.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260713000001_generated_problems.sql
git commit -m "feat(daily-review): generated_problems 테이블 마이그레이션"
```

---

### Task 2: KST 날짜 헬퍼

**Files:**
- Create: `lib/kstDate.js`
- Test: `tests/kstDate.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { describe, it, expect } from 'vitest';
import { kstDateString, addDaysToDateString } from '@/lib/kstDate';

describe('kstDate', () => {
  it('UTC 자정 직전 시각을 KST 날짜로 변환한다 (UTC+9)', () => {
    // 2026-07-13T16:00:00Z == 2026-07-14T01:00 KST
    expect(kstDateString(new Date('2026-07-13T16:00:00Z'))).toBe('2026-07-14');
    // 2026-07-13T14:59:00Z == 2026-07-13T23:59 KST
    expect(kstDateString(new Date('2026-07-13T14:59:00Z'))).toBe('2026-07-13');
  });

  it('날짜 문자열에 일수를 더한다', () => {
    expect(addDaysToDateString('2026-07-13', 1)).toBe('2026-07-14');
    expect(addDaysToDateString('2026-07-31', 1)).toBe('2026-08-01');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/kstDate.test.js --silent=false`
Expected: FAIL — `Cannot find module '@/lib/kstDate'` 계열 에러

- [ ] **Step 3: 구현**

```js
// lib/kstDate.js — 서버는 UTC(Netlify)일 수 있으므로 KST 고정 오프셋으로 날짜 계산
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstDateString(date = new Date()) {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

export function addDaysToDateString(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function kstTodayString() {
  return kstDateString(new Date());
}

export function kstTomorrowString() {
  return addDaysToDateString(kstTodayString(), 1);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/kstDate.test.js --silent=false`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/kstDate.js tests/kstDate.test.js
git commit -m "feat(daily-review): KST 날짜 헬퍼"
```

---

### Task 3: generated_problems 스토어

**Files:**
- Create: `lib/generatedProblemsStore.js`
- Test: `tests/generatedProblemsStore.test.js` (순수함수 `toQuizProblem`만 유닛테스트; fetch 부분은 Task 11 수동 E2E)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { describe, it, expect } from 'vitest';
import { toQuizProblem } from '@/lib/generatedProblemsStore';

const ROW = {
  id: 'uuid-1',
  user_email: 'me@test.com',
  source_session_id: 'practical-industrial-2024-1',
  source_problem_number: 7,
  kind: 'variant',
  concept_tag: 'SQL-집계그룹',
  problem: {
    question_text: '다음 SQL의 실행 결과를 쓰시오.',
    examples: 'SELECT 부서, AVG(급여) FROM 사원 GROUP BY 부서;',
    input_type: 'single',
    category: 'SQL',
    subcategory: 'query',
  },
  answer: '영업',
  accepted_answers: ['영업', '영업부'],
  comment: 'GROUP BY는 부서별로 묶는다.',
};

describe('toQuizProblem', () => {
  it('row를 PracticalQuizV2 주입용 문제 객체로 변환한다', () => {
    const p = toQuizProblem(ROW, 3);
    expect(p.problem_number).toBe(3);
    expect(p.question_text).toBe(ROW.problem.question_text);
    expect(p.accepted_answers).toEqual(['영업', '영업부']);
    expect(p.originSessionId).toBe('practical-industrial-2024-1');
    expect(p.originProblemNumber).toBe(7);
    expect(p.sectionTitle).toBe('오늘의 복습');
    expect(p.category).toBe('SQL');
  });

  it('accepted_answers가 비어 있으면 answer로 채운다', () => {
    const p = toQuizProblem({ ...ROW, accepted_answers: [] }, 1);
    expect(p.accepted_answers).toEqual(['영업']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/generatedProblemsStore.test.js --silent=false`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```js
// lib/generatedProblemsStore.js
// Supabase 전용 스토어 (파일 폴백 없음 — dev/prod 모두 Supabase 사용)
import { practicalSessionLabel } from '@/app/practical/_lib/practicalSessions';
import { kstTomorrowString } from '@/lib/kstDate';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = 'generated_problems';

export function hasGeneratedProblemsConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function baseUrl() {
  return `${SUPABASE_URL}/rest/v1/${TABLE}`;
}

export async function insertGeneratedProblems(rows) {
  if (!hasGeneratedProblemsConfig() || rows.length === 0) return 0;
  const response = await fetch(baseUrl(), {
    method: 'POST',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`generated_problems insert failed: ${response.status}`);
  return rows.length;
}

export async function fetchDueGeneratedProblems(userEmail, dateStr) {
  if (!hasGeneratedProblemsConfig()) return [];
  const url =
    `${baseUrl()}?select=*` +
    `&user_email=eq.${encodeURIComponent(userEmail)}` +
    `&status=eq.pending&due_date=lte.${dateStr}` +
    `&order=created_at.asc`;
  const response = await fetch(url, { headers: headers(), cache: 'no-store' });
  if (!response.ok) throw new Error(`generated_problems due query failed: ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

// 중복 생성 방지: pending 상태인 origin 키 집합
export async function fetchPendingOriginKeys(userEmail) {
  if (!hasGeneratedProblemsConfig()) return new Set();
  const url =
    `${baseUrl()}?select=source_session_id,source_problem_number` +
    `&user_email=eq.${encodeURIComponent(userEmail)}&status=eq.pending`;
  const response = await fetch(url, { headers: headers(), cache: 'no-store' });
  if (!response.ok) throw new Error(`generated_problems pending query failed: ${response.status}`);
  const rows = await response.json();
  return new Set(
    (Array.isArray(rows) ? rows : []).map(
      (r) => `${r.source_session_id}:${r.source_problem_number}`,
    ),
  );
}

// 풀이 결과 반영: 맞힘 → done / 틀림·모름 → 내일 재출제
// outcomes: [{ sessionId, problemNumber, isCorrect, isUnknown }] (origin 참조)
export async function applyDailyReviewOutcomes(userEmail, outcomes) {
  if (!hasGeneratedProblemsConfig()) return;
  for (const o of outcomes) {
    const sid = String(o?.sessionId || '').trim();
    const num = Number(o?.problemNumber);
    if (!sid || !Number.isFinite(num)) continue;
    const patch = o?.isCorrect
      ? { status: 'done', last_result_at: new Date().toISOString() }
      : { due_date: kstTomorrowString(), last_result_at: new Date().toISOString() };
    const url =
      `${baseUrl()}?user_email=eq.${encodeURIComponent(userEmail)}` +
      `&source_session_id=eq.${encodeURIComponent(sid)}` +
      `&source_problem_number=eq.${num}&status=eq.pending`;
    await fetch(url, { method: 'PATCH', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(patch) });
  }
}

export async function discardPendingByOrigin(userEmail, sourceSessionId, sourceProblemNumber) {
  if (!hasGeneratedProblemsConfig()) return;
  const url =
    `${baseUrl()}?user_email=eq.${encodeURIComponent(userEmail)}` +
    `&source_session_id=eq.${encodeURIComponent(String(sourceSessionId))}` +
    `&source_problem_number=eq.${Number(sourceProblemNumber)}&status=eq.pending`;
  await fetch(url, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ status: 'discarded', last_result_at: new Date().toISOString() }),
  });
}

// row → PracticalQuizV2 주입용 문제 객체 (high-wrong/page.js:75-89 패턴과 동일 shape)
export function toQuizProblem(row, displayNumber) {
  const accepted = Array.isArray(row.accepted_answers) && row.accepted_answers.length > 0
    ? row.accepted_answers.map(String)
    : [String(row.answer)];
  return {
    ...(row.problem || {}),
    problem_number: displayNumber,
    accepted_answers: accepted,
    sectionTitle: '오늘의 복습',
    originSessionId: row.source_session_id,
    originProblemNumber: Number(row.source_problem_number),
    originSourceKey: practicalSessionLabel(row.source_session_id),
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/generatedProblemsStore.test.js --silent=false`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/generatedProblemsStore.js tests/generatedProblemsStore.test.js
git commit -m "feat(daily-review): generated_problems Supabase 스토어"
```

---

### Task 4: userProblemsStore에 forceRemote + 시도 요약 추가

로컬 dev에서 `fetchUserFinishEvents`는 Supabase를 건너뛴다(`lib/userProblemsStore.js:64` `NODE_ENV !== 'development'` 가드). 생성 라우트는 로컬에서도 프로덕션 오답을 봐야 하므로 옵션이 필요하다.

**Files:**
- Modify: `lib/userProblemsStore.js`

- [ ] **Step 1: `fetchUserFinishEvents`에 옵션 추가**

`lib/userProblemsStore.js:63-73`을 다음으로 교체:

```js
export async function fetchUserFinishEvents(userEmail, { forceRemote = false } = {}) {
  const remoteAllowed =
    SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY &&
    (forceRemote || process.env.NODE_ENV !== 'development');
  if (remoteAllowed) {
    try {
      const results = await fetchFromSupabase(userEmail);
      if (results.length > 0) return results;
    } catch {
      // fallback
    }
  }
  return fetchFromFile(userEmail);
}
```

- [ ] **Step 2: `getUserOutcomeSummary` 추가 (파일 끝)**

기존 `getUserWrongProblems`/`getUserUnknownProblems`는 건드리지 않는다 (surgical). 생성 라우트 전용으로 오답 + 시도 키 집합을 한 번의 fetch로 반환:

```js
// daily-review 생성용: 오답 목록 + 시도한 문제 키 집합을 한 번에 계산
// (같은 2-pass latest-wins 규칙 — getUserWrongProblems 참조)
export async function getUserOutcomeSummary(userEmail, { forceRemote = false } = {}) {
  const events = await fetchUserFinishEvents(userEmail, { forceRemote });
  const latest = new Map();
  for (const event of events) {
    const outcomes = Array.isArray(event?.payload?.problemOutcomes) ? event.payload.problemOutcomes : [];
    for (const o of outcomes) {
      const sourceSessionId = String(o?.sessionId || '').trim();
      const sourceProblemNumber = Number(o?.problemNumber);
      if (!sourceSessionId || !Number.isFinite(sourceProblemNumber) || sourceProblemNumber <= 0) continue;
      const key = `${sourceSessionId}:${sourceProblemNumber}`;
      if (latest.has(key)) continue; // desc → 먼저 본 것이 최신
      latest.set(key, { sourceSessionId, sourceProblemNumber, outcome: o });
    }
  }
  const wrongProblems = [];
  const attemptedKeys = new Set();
  for (const [key, { sourceSessionId, sourceProblemNumber, outcome }] of latest.entries()) {
    attemptedKeys.add(key);
    if (!outcome.isCorrect) {
      wrongProblems.push({ sourceSessionId, sourceProblemNumber });
    }
  }
  return { wrongProblems, attemptedKeys };
}
```

주의: 여기서는 `isUnknown`(모름)도 오답에 포함한다 — 복습 대상이므로 `getUserWrongProblems`(모름 제외)와 의도적으로 다르다.

- [ ] **Step 3: 기존 테스트 회귀 확인**

Run: `npx vitest run --silent=false`
Expected: 전체 PASS (기존 테스트 깨짐 없음)

- [ ] **Step 4: Commit**

```bash
git add lib/userProblemsStore.js
git commit -m "feat(daily-review): forceRemote 옵션 + getUserOutcomeSummary"
```

---

### Task 5: 개념 태깅 스크립트 + 실행

**Files:**
- Create: `scripts/generate-concept-tags.mjs`
- Create(실행 결과): `datasets/practicalIndustrial/conceptTags.json`

- [ ] **Step 1: 스크립트 작성**

```js
// scripts/generate-concept-tags.mjs
// 기출 전체에 개념 태그 1회 배치 부여 → datasets/practicalIndustrial/conceptTags.json
// 실행: node scripts/generate-concept-tags.mjs   (OPENAI_API_KEY 필요)
// 재실행 안전: 이미 태깅된 키는 건너뜀 (체크포인트 방식)
import fs from 'fs/promises';
import path from 'path';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OUT_PATH = path.join(process.cwd(), 'datasets', 'practicalIndustrial', 'conceptTags.json');

// app/ 코드를 import하지 않고 세션 목록을 복제하면 이중 관리가 되므로 동적 import 사용
const { PRACTICAL_SESSION_CONFIG } = await import('../app/practical/_lib/practicalSessions.js');

export const SQL_TAGS = [
  'SQL-DCL권한', 'SQL-집계그룹', 'SQL-조인', 'SQL-서브쿼리',
  'SQL-DML', 'SQL-DDL', 'SQL-트랜잭션', 'SQL-뷰인덱스', 'SQL-기타',
];
export const CODE_TAGS = [
  'Code-제어흐름', 'Code-배열문자열', 'Code-함수포인터', 'Code-OOP', 'Code-연산자', 'Code-기타',
];

function stripBom(s) { return String(s || '').replace(/^﻿/, ''); }

async function tagWithLLM(problem, tags) {
  const prompt = [
    '다음 시험 문제가 측정하는 핵심 개념을 아래 태그 목록에서 정확히 하나 골라 태그 문자열만 출력하세요.',
    `태그 목록: ${tags.join(', ')}`,
    '',
    '[문제]', String(problem.question_text || ''),
    '[보기/코드]', String(problem.examples || '').slice(0, 1500),
  ].join('\n');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'gpt-4.1-mini', input: prompt, max_output_tokens: 30 }),
  });
  if (!response.ok) throw new Error(`openai failed: ${response.status}`);
  const data = await response.json();
  const text = (data.output || [])
    .flatMap((item) => item?.content || [])
    .map((c) => c?.text || '')
    .join('')
    .trim();
  return tags.find((t) => text.includes(t)) || tags[tags.length - 1]; // 미매칭 → '-기타'
}

async function main() {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY 필요');
  let tagsMap = {};
  try { tagsMap = JSON.parse(stripBom(await fs.readFile(OUT_PATH, 'utf8'))); } catch {}

  for (const [sessionId, cfg] of Object.entries(PRACTICAL_SESSION_CONFIG)) {
    const problemPath = path.join(process.cwd(), ...cfg.basePath, 'problem1.json');
    let sections;
    try { sections = JSON.parse(stripBom(await fs.readFile(problemPath, 'utf8'))); } catch { continue; }

    for (const section of sections || []) {
      for (const p of section?.problems || []) {
        const key = `${sessionId}:${Number(p.problem_number)}`;
        if (tagsMap[key]) continue; // 체크포인트

        const category = String(p.category || '').trim();
        if (category === 'SQL') {
          tagsMap[key] = await tagWithLLM(p, SQL_TAGS);
        } else if (category === 'Code') {
          tagsMap[key] = await tagWithLLM(p, CODE_TAGS);
        } else {
          // 이론: 기존 subcategory가 이미 개념 수준 → LLM 불필요
          tagsMap[key] = `이론-${String(p.subcategory || '기타').trim()}`;
        }
        console.log(`${key} → ${tagsMap[key]}`);
      }
    }
    // 세션마다 저장 (중단해도 재개 가능)
    await fs.writeFile(OUT_PATH, JSON.stringify(tagsMap, null, 2), 'utf8');
  }
  console.log(`완료: ${Object.keys(tagsMap).length}건 → ${OUT_PATH}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 실행**

Run: `node scripts/generate-concept-tags.mjs`
Expected: 세션별 `key → 태그` 로그가 흐르고, 마지막에 `완료: N건` (N ≈ 세션 13개 × 약 20문항 = 200~300). SQL/Code만 LLM 호출이라 수 분 소요.

주의: `app/practical/_lib/practicalSessions.js`가 ESM import 가능해야 함. import 에러가 나면 스크립트 상단 동적 import를 제거하고 `PRACTICAL_SESSION_CONFIG` 객체를 스크립트에 인라인 복사(주석으로 원본 경로 명시)로 폴백.

- [ ] **Step 3: 결과 샘플 검수**

Run: `head -30 datasets/practicalIndustrial/conceptTags.json`
Expected: `"practical-industrial-2022-1:1": "이론-..."` 형태. SQL 문제 3~4개를 원문과 대조해 태그가 타당한지 눈으로 확인. 명백히 틀린 태그는 JSON에서 직접 수정.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-concept-tags.mjs datasets/practicalIndustrial/conceptTags.json
git commit -m "feat(daily-review): 기출 개념 태깅 스크립트 + 태그 데이터"
```

---

### Task 6: conceptTags 라이브러리 — 태그 로드 + 앵커 선정

**Files:**
- Create: `lib/conceptTags.js`
- Test: `tests/conceptTags.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { describe, it, expect } from 'vitest';
import { pickExpansionAnchors, pickCoverageAnchors } from '@/lib/conceptTags';

// problemIndex: 기출 전체 [{ key, sessionId, problemNumber, concept, category }]
const INDEX = [
  { key: 'a:1', sessionId: 'a', problemNumber: 1, concept: 'SQL-집계그룹', category: 'SQL' },
  { key: 'a:2', sessionId: 'a', problemNumber: 2, concept: 'SQL-집계그룹', category: 'SQL' },
  { key: 'a:3', sessionId: 'a', problemNumber: 3, concept: 'SQL-DCL권한', category: 'SQL' },
  { key: 'b:1', sessionId: 'b', problemNumber: 1, concept: 'SQL-조인', category: 'SQL' },
  { key: 'b:2', sessionId: 'b', problemNumber: 2, concept: '이론-네트워크', category: '이론' },
];

describe('pickExpansionAnchors', () => {
  it('약한 개념의 미시도 문제를 뽑는다 (오답 원본·pending 제외)', () => {
    const picked = pickExpansionAnchors({
      weakConcepts: ['SQL-집계그룹'],
      problemIndex: INDEX,
      attemptedKeys: new Set(['a:1']),   // a:1은 이미 풀었음(오답)
      excludeKeys: new Set(['a:1']),     // 오답 원본은 변형 슬롯이 담당
      count: 2,
    });
    // 같은 개념(집계그룹)의 안 푼 문제는 a:2 뿐
    expect(picked.map((p) => p.key)).toEqual(['a:2']);
  });
});

describe('pickCoverageAnchors', () => {
  it('한 번도 시도 안 한 개념을 우선한다', () => {
    const picked = pickCoverageAnchors({
      problemIndex: INDEX,
      attemptedKeys: new Set(['a:1', 'a:2']), // 집계그룹은 시도됨
      excludeKeys: new Set(),
      count: 2,
      random: () => 0, // 결정론적 테스트용
    });
    const concepts = picked.map((p) => p.concept);
    // 미시도 개념(DCL권한, 조인, 이론-네트워크)에서만 뽑힘
    expect(concepts).not.toContain('SQL-집계그룹');
    expect(picked.length).toBe(2);
  });

  it('개념당 1문제씩 라운드로빈으로 뽑는다', () => {
    const picked = pickCoverageAnchors({
      problemIndex: INDEX,
      attemptedKeys: new Set(),
      excludeKeys: new Set(),
      count: 3,
      random: () => 0,
    });
    const conceptSet = new Set(picked.map((p) => p.concept));
    expect(conceptSet.size).toBe(3); // 서로 다른 개념 3개
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/conceptTags.test.js --silent=false`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```js
// lib/conceptTags.js
import fs from 'fs/promises';
import path from 'path';
import { PRACTICAL_SESSION_CONFIG } from '@/app/practical/_lib/practicalSessions';

const TAGS_PATH = path.join(process.cwd(), 'datasets', 'practicalIndustrial', 'conceptTags.json');
const stripBom = (s) => String(s || '').replace(/^﻿/, '');

export async function loadConceptTags() {
  try {
    const raw = await fs.readFile(TAGS_PATH, 'utf8');
    return JSON.parse(stripBom(raw));
  } catch {
    return {};
  }
}

// 기출 전체 인덱스: [{ key, sessionId, problemNumber, concept, category }]
export async function buildProblemIndex(tagsMap) {
  const index = [];
  for (const [sessionId, cfg] of Object.entries(PRACTICAL_SESSION_CONFIG)) {
    const problemPath = path.join(process.cwd(), ...cfg.basePath, 'problem1.json');
    let sections;
    try {
      sections = JSON.parse(stripBom(await fs.readFile(problemPath, 'utf8')));
    } catch {
      continue;
    }
    for (const section of sections || []) {
      for (const p of section?.problems || []) {
        const problemNumber = Number(p.problem_number);
        if (!Number.isFinite(problemNumber)) continue;
        const key = `${sessionId}:${problemNumber}`;
        index.push({
          key,
          sessionId,
          problemNumber,
          concept: String(tagsMap[key] || `${String(p.category || '기타')}-기타`),
          category: String(p.category || '기타'),
        });
      }
    }
  }
  return index;
}

// 확장: 약한 개념 순서대로, 그 개념의 미시도 문제를 라운드로빈으로 선정
export function pickExpansionAnchors({ weakConcepts, problemIndex, attemptedKeys, excludeKeys, count }) {
  const picked = [];
  const used = new Set(excludeKeys);
  for (const concept of weakConcepts) {
    if (picked.length >= count) break;
    const candidate = problemIndex.find(
      (p) => p.concept === concept && !attemptedKeys.has(p.key) && !used.has(p.key),
    );
    if (candidate) {
      picked.push(candidate);
      used.add(candidate.key);
    }
  }
  return picked;
}

// 커버리지: 미시도 개념 우선 → 개념당 1문제 라운드로빈
export function pickCoverageAnchors({ problemIndex, attemptedKeys, excludeKeys, count, random = Math.random }) {
  const attemptedConcepts = new Set(
    problemIndex.filter((p) => attemptedKeys.has(p.key)).map((p) => p.concept),
  );
  const byConcept = new Map();
  for (const p of problemIndex) {
    if (attemptedKeys.has(p.key) || excludeKeys.has(p.key)) continue;
    if (!byConcept.has(p.concept)) byConcept.set(p.concept, []);
    byConcept.get(p.concept).push(p);
  }
  // 미시도 개념 먼저, 그다음 시도된 개념
  const concepts = [...byConcept.keys()].sort((a, b) => {
    const aUntried = attemptedConcepts.has(a) ? 1 : 0;
    const bUntried = attemptedConcepts.has(b) ? 1 : 0;
    return aUntried - bUntried;
  });
  const picked = [];
  for (const concept of concepts) {
    if (picked.length >= count) break;
    const pool = byConcept.get(concept);
    picked.push(pool[Math.floor(random() * pool.length)]);
  }
  return picked;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/conceptTags.test.js --silent=false`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/conceptTags.js tests/conceptTags.test.js
git commit -m "feat(daily-review): 개념 태그 로드 + 확장/커버리지 앵커 선정"
```

---

### Task 7: variantGeneration 하네스 — 게이트·인터리빙·배치 계획·프롬프트

**Files:**
- Create: `lib/variantGeneration.js`
- Test: `tests/variantGeneration.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { describe, it, expect } from 'vitest';
import {
  validateGeneratedProblem,
  isNearDuplicate,
  interleaveByCategory,
  planGenerationBatch,
  parseModelJson,
} from '@/lib/variantGeneration';

const ORIGINAL = {
  question_text: '다음 SQL의 실행 결과를 쓰시오.',
  examples: 'SELECT 학과, COUNT(*) FROM 학생 GROUP BY 학과 HAVING COUNT(*) >= 3;',
  category: 'SQL',
};

const GOOD_GEN = {
  question_text: '다음 SQL을 실행했을 때 조회되는 부서명을 쓰시오.',
  examples: 'SELECT 부서, AVG(급여) FROM 사원 GROUP BY 부서 HAVING AVG(급여) >= 3000;',
  input_type: 'single',
  category: 'SQL',
  subcategory: 'query',
  answer: '영업',
  accepted_answers: ['영업', '영업부'],
  comment: 'HAVING은 그룹 집계 결과를 필터링한다.',
};

describe('validateGeneratedProblem', () => {
  it('정상 생성물은 통과한다', () => {
    expect(validateGeneratedProblem(GOOD_GEN, ORIGINAL).ok).toBe(true);
  });

  it('필수 필드가 비면 거부한다', () => {
    const r = validateGeneratedProblem({ ...GOOD_GEN, answer: ' ' }, ORIGINAL);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('answer');
  });

  it('정답이 문제 본문에 노출되면 거부한다', () => {
    const leaked = { ...GOOD_GEN, question_text: '정답이 영업인 이유를 쓰시오.' };
    expect(validateGeneratedProblem(leaked, ORIGINAL).ok).toBe(false);
  });

  it('한 글자 답은 노출 검사를 건너뛴다 (오탐 방지)', () => {
    const shortAns = { ...GOOD_GEN, answer: '3', accepted_answers: ['3'] };
    expect(validateGeneratedProblem(shortAns, ORIGINAL).ok).toBe(true);
  });

  it('원본과 사실상 동일하면 거부한다', () => {
    const dup = { ...GOOD_GEN, question_text: ORIGINAL.question_text, examples: ORIGINAL.examples };
    expect(validateGeneratedProblem(dup, ORIGINAL).ok).toBe(false);
  });
});

describe('isNearDuplicate', () => {
  it('공백·대소문자만 다른 텍스트는 중복이다', () => {
    expect(isNearDuplicate('SELECT  A FROM B;', 'select a from b;')).toBe(true);
  });
  it('실질적으로 다른 텍스트는 중복이 아니다', () => {
    expect(isNearDuplicate(GOOD_GEN.examples, ORIGINAL.examples)).toBe(false);
  });
});

describe('interleaveByCategory', () => {
  it('같은 카테고리가 연속 2개를 넘지 않게 섞는다 (가능한 경우)', () => {
    const items = [
      { category: 'SQL' }, { category: 'SQL' }, { category: 'SQL' },
      { category: 'Code' }, { category: 'Code' }, { category: '이론' },
    ];
    const out = interleaveByCategory(items, () => 0);
    expect(out.length).toBe(6);
    for (let i = 0; i < out.length - 1; i += 1) {
      // 인접 2개가 같아도 3연속은 없어야 함
      if (i < out.length - 2) {
        const same3 =
          out[i].category === out[i + 1].category && out[i + 1].category === out[i + 2].category;
        expect(same3).toBe(false);
      }
    }
  });
});

describe('planGenerationBatch', () => {
  it('변형 N + 확장/커버리지 ceil(N×0.25) 구성으로 계획한다', () => {
    const plan = planGenerationBatch({
      wrongs: [
        { sourceSessionId: 'a', sourceProblemNumber: 1 },
        { sourceSessionId: 'a', sourceProblemNumber: 3 },
        { sourceSessionId: 'b', sourceProblemNumber: 1 },
        { sourceSessionId: 'b', sourceProblemNumber: 2 },
      ],
      pendingKeys: new Set(['a:3']), // 이미 pending → 변형 스킵
      tagsMap: { 'a:1': 'SQL-집계그룹', 'a:3': 'SQL-조인', 'b:1': 'SQL-집계그룹', 'b:2': '이론-네트워크' },
      problemIndex: [
        { key: 'a:1', sessionId: 'a', problemNumber: 1, concept: 'SQL-집계그룹', category: 'SQL' },
        { key: 'a:2', sessionId: 'a', problemNumber: 2, concept: 'SQL-집계그룹', category: 'SQL' },
        { key: 'a:3', sessionId: 'a', problemNumber: 3, concept: 'SQL-조인', category: 'SQL' },
        { key: 'b:1', sessionId: 'b', problemNumber: 1, concept: 'SQL-집계그룹', category: 'SQL' },
        { key: 'b:2', sessionId: 'b', problemNumber: 2, concept: '이론-네트워크', category: '이론' },
        { key: 'b:3', sessionId: 'b', problemNumber: 3, concept: 'SQL-DCL권한', category: 'SQL' },
      ],
      attemptedKeys: new Set(['a:1', 'a:3', 'b:1', 'b:2']),
      random: () => 0,
    });
    const variants = plan.filter((p) => p.kind === 'variant');
    const extras = plan.filter((p) => p.kind !== 'variant');
    expect(variants.length).toBe(3); // a:3은 pending이라 제외
    expect(extras.length).toBe(1);   // ceil(3 × 0.25) = 1
    // 확장 후보: 약한 개념(집계그룹 빈도 최다)의 미시도 문제 a:2
    expect(extras[0].key).toBe('a:2');
  });
});

describe('parseModelJson', () => {
  it('코드펜스로 감싼 JSON도 파싱한다', () => {
    const text = '```json\n{"answer": "영업"}\n```';
    expect(parseModelJson(text)).toEqual({ answer: '영업' });
  });
  it('파싱 불가면 null을 반환한다', () => {
    expect(parseModelJson('말로 된 답변')).toBe(null);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/variantGeneration.test.js --silent=false`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```js
// lib/variantGeneration.js — 생성 하네스의 순수함수 계층 (OpenAI 호출은 route가 담당)
import { pickExpansionAnchors, pickCoverageAnchors } from '@/lib/conceptTags';

const normalize = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');

// ---------- 게이트 1: 스키마 + 정답 노출 + 근사중복 ----------
export function validateGeneratedProblem(gen, original) {
  if (!gen || typeof gen !== 'object') return { ok: false, reason: 'not-an-object' };
  if (!String(gen.question_text || '').trim()) return { ok: false, reason: 'question_text empty' };
  if (!String(gen.answer || '').trim()) return { ok: false, reason: 'answer empty' };
  if (!['single', 'sequence', 'multi'].includes(String(gen.input_type || 'single'))) {
    return { ok: false, reason: `input_type invalid: ${gen.input_type}` };
  }

  // 정답 노출: 2글자 이상 답만 검사 (숫자 한 글자 답의 오탐 방지)
  const body = normalize(`${gen.question_text} ${gen.examples || ''}`);
  const answers = [String(gen.answer), ...(Array.isArray(gen.accepted_answers) ? gen.accepted_answers : [])];
  for (const a of answers) {
    const na = normalize(a);
    if (na.length >= 2 && body.includes(na)) {
      return { ok: false, reason: `answer leaked in body: ${a}` };
    }
  }

  const genText = `${gen.question_text} ${gen.examples || ''}`;
  const origText = `${original?.question_text || ''} ${original?.examples || ''}`;
  if (isNearDuplicate(genText, origText)) {
    return { ok: false, reason: 'near-duplicate of original' };
  }
  return { ok: true, reason: '' };
}

// 근사중복: 정규화 일치 또는 문자 3-gram Jaccard > 0.85
export function isNearDuplicate(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const grams = (s) => {
    const set = new Set();
    for (let i = 0; i <= s.length - 3; i += 1) set.add(s.slice(i, i + 3));
    return set;
  };
  const ga = grams(na);
  const gb = grams(nb);
  if (ga.size === 0 || gb.size === 0) return na === nb;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter += 1;
  const union = ga.size + gb.size - inter;
  return inter / union > 0.85;
}

// ---------- 인터리빙: 같은 카테고리 3연속 금지 (그리디) ----------
export function interleaveByCategory(items, random = Math.random) {
  const pool = [...items].sort(() => random() - 0.5);
  const out = [];
  while (pool.length > 0) {
    const lastCat = out.length >= 2 &&
      out[out.length - 1].category === out[out.length - 2].category
      ? out[out.length - 1].category
      : null;
    let idx = lastCat ? pool.findIndex((p) => p.category !== lastCat) : 0;
    if (idx === -1) idx = 0; // 남은 게 전부 같은 카테고리면 어쩔 수 없음
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// ---------- 배치 계획: 변형 N + 확장/커버리지 ceil(N×0.25) ----------
export function planGenerationBatch({
  wrongs, pendingKeys, tagsMap, problemIndex, attemptedKeys, random = Math.random, maxAnchors = 20,
}) {
  const wrongKeys = wrongs.map((w) => `${w.sourceSessionId}:${w.sourceProblemNumber}`);

  // 변형 슬롯: pending이 없는 오답만
  const variants = wrongs
    .filter((w, i) => !pendingKeys.has(wrongKeys[i]))
    .slice(0, maxAnchors)
    .map((w) => ({
      kind: 'variant',
      key: `${w.sourceSessionId}:${w.sourceProblemNumber}`,
      sessionId: w.sourceSessionId,
      problemNumber: w.sourceProblemNumber,
      concept: tagsMap[`${w.sourceSessionId}:${w.sourceProblemNumber}`] || null,
    }));

  const extraCount = Math.ceil(variants.length * 0.25);
  if (extraCount === 0) return variants;

  // 약한 개념: 오답 빈도 내림차순
  const conceptFreq = new Map();
  for (const key of wrongKeys) {
    const c = tagsMap[key];
    if (c) conceptFreq.set(c, (conceptFreq.get(c) || 0) + 1);
  }
  const weakConcepts = [...conceptFreq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);

  const excludeKeys = new Set([...wrongKeys, ...pendingKeys, ...variants.map((v) => v.key)]);
  const expansion = pickExpansionAnchors({
    weakConcepts, problemIndex, attemptedKeys, excludeKeys, count: extraCount,
  }).map((p) => ({ ...p, kind: 'expansion' }));

  for (const e of expansion) excludeKeys.add(e.key);
  const coverage = pickCoverageAnchors({
    problemIndex, attemptedKeys, excludeKeys, count: extraCount - expansion.length, random,
  }).map((p) => ({ ...p, kind: 'coverage' }));

  return [...variants, ...expansion, ...coverage];
}

// ---------- 프롬프트 ----------
export function buildGeneratorPrompt({ original, answer, comment, concept, failureReasons = [] }) {
  return [
    '당신은 정보처리산업기사 실기 문제 출제자입니다. 아래 원본 문제의 "변형"을 1개 만드세요.',
    '',
    '규칙:',
    `- 측정 개념(${concept || '원본과 동일 개념'})은 반드시 유지`,
    '- 표면(테이블명·컬럼·값·소재)과 구조(함수·조건 등)는 다양하게 변경 — 원본을 외운 사람이 못 풀고, 개념을 아는 사람만 풀 수 있게',
    '- 난이도는 원본과 동급 (더 쉽게 만들지 말 것)',
    '- 정답이 문제 본문이나 보기에 절대 드러나지 않게',
    '- 실제로 풀 수 있는 완결된 문제여야 함 (SQL이면 보기의 테이블 데이터로 정답이 유일하게 결정되어야 함)',
    '',
    '아래 JSON 형식으로만 출력 (설명 금지):',
    '{"question_text": "...", "examples": "...(코드/테이블/보기, 없으면 빈 문자열)", "input_type": "single", "category": "...", "subcategory": "...", "answer": "...", "accepted_answers": ["...", "동의어/허용표기"], "comment": "왜 이 답인지 1~3문장 해설"}',
    '',
    '[원본 문제]', String(original.question_text || ''),
    '[원본 보기/코드]', String(original.examples || '없음'),
    `[원본 정답] ${String(answer || '')}`,
    '[원본 해설]', String(comment || '없음'),
    ...(failureReasons.length > 0
      ? ['', '[이전 생성 실패 사유 — 반드시 해결할 것]', ...failureReasons.map((r) => `- ${r}`)]
      : []),
  ].join('\n');
}

export function buildJudgePrompt({ gen, original, answer }) {
  return [
    '당신은 시험 문제 품질 심사관입니다. 아래 "생성 문제"를 회의적으로 심사하세요.',
    '확신이 없으면 false를 주세요.',
    '',
    '심사 기준 (각각 true/false):',
    '- concept_same: 원본과 같은 개념을 측정하는가',
    '- answer_correct: 제시된 정답이 문제 조건에서 유일하고 실제로 옳은가 (SQL이면 직접 계산해볼 것)',
    '- no_leak: 정답이 문제 본문·보기에 드러나지 않는가',
    '- difficulty_ok: 원본과 비슷한 난이도인가 (현저히 쉬우면 false)',
    '',
    'JSON만 출력: {"concept_same": bool, "answer_correct": bool, "no_leak": bool, "difficulty_ok": bool, "reason": "실패 시 구체 사유"}',
    '',
    '[원본 문제]', String(original.question_text || ''),
    '[원본 보기]', String(original.examples || '없음'),
    `[원본 정답] ${String(answer || '')}`,
    '',
    '[생성 문제]', String(gen.question_text || ''),
    '[생성 보기]', String(gen.examples || '없음'),
    `[생성 정답] ${String(gen.answer || '')} (허용: ${(gen.accepted_answers || []).join(', ')})`,
  ].join('\n');
}

// 모델 출력에서 JSON 추출 (코드펜스 허용)
export function parseModelJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/variantGeneration.test.js --silent=false`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/variantGeneration.js tests/variantGeneration.test.js
git commit -m "feat(daily-review): 생성 하네스 — 게이트/인터리빙/배치계획/프롬프트"
```

---

### Task 8: 생성 API 라우트

**Files:**
- Create: `app/api/daily-review/generate/route.js`

- [ ] **Step 1: 구현**

```js
// app/api/daily-review/generate/route.js
// 오답 → 앵커 계획 → 생성(게이트+심판+재생성 예산 2회) → generated_problems 저장
import { auth } from '@/auth';
import { classifySessionId } from '@/lib/examType';
import { getUserOutcomeSummary } from '@/lib/userProblemsStore';
import { loadConceptTags, buildProblemIndex } from '@/lib/conceptTags';
import { loadPracticalDatasetMaps } from '@/app/practical/_lib/practicalData';
import {
  planGenerationBatch, validateGeneratedProblem,
  buildGeneratorPrompt, buildJudgePrompt, parseModelJson,
} from '@/lib/variantGeneration';
import {
  hasGeneratedProblemsConfig, insertGeneratedProblems, fetchPendingOriginKeys,
} from '@/lib/generatedProblemsStore';
import { kstTomorrowString, kstTodayString } from '@/lib/kstDate';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 배치 생성이라 길게

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GENERATOR_MODEL = 'gpt-4.1';        // 생성
const JUDGE_MODEL = 'gpt-4.1-mini';       // 심판 (자기선호 편향 회피용 별도 모델)
const MAX_REGEN = 2;                      // 재생성 예산 (초기 1회 + 재생성 2회)

async function callOpenAI(model, input, maxTokens) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model, input, max_output_tokens: maxTokens }),
  });
  if (!response.ok) throw new Error(`openai ${model} failed: ${response.status}`);
  const data = await response.json();
  return (data.output || [])
    .flatMap((item) => item?.content || [])
    .map((c) => c?.text || '')
    .join('')
    .trim();
}

// 앵커 1건 → 검증 통과한 생성물 1건 (실패 시 null + 사유)
async function generateOne(anchor, datasetCache) {
  if (!datasetCache.has(anchor.sessionId)) {
    datasetCache.set(anchor.sessionId, await loadPracticalDatasetMaps(anchor.sessionId));
  }
  const ds = datasetCache.get(anchor.sessionId);
  const original = ds?.problemsByNo?.get(Number(anchor.problemNumber));
  if (!original) return { row: null, reasons: ['original problem not found'] };
  const answer = ds.answersByNo.get(Number(anchor.problemNumber)) || '';
  const comment = ds.commentsByNo.get(Number(anchor.problemNumber)) || '';

  const reasons = [];
  for (let attempt = 0; attempt <= MAX_REGEN; attempt += 1) {
    const prompt = buildGeneratorPrompt({
      original, answer, comment, concept: anchor.concept, failureReasons: reasons,
    });
    let gen;
    try {
      gen = parseModelJson(await callOpenAI(GENERATOR_MODEL, prompt, 1500));
    } catch (e) {
      reasons.push(`openai error: ${String(e?.message || e)}`);
      continue;
    }
    if (!gen) { reasons.push('output was not valid JSON'); continue; }

    // 게이트 1: 결정론적 검증 (스키마·정답노출·근사중복)
    const gate = validateGeneratedProblem(gen, original);
    if (!gate.ok) { reasons.push(gate.reason); continue; }

    // 게이트 2: 별도 모델 rubric 심판
    let verdict = null;
    try {
      verdict = parseModelJson(
        await callOpenAI(JUDGE_MODEL, buildJudgePrompt({ gen, original, answer }), 300),
      );
    } catch { /* 심판 호출 실패 → 아래 null 처리 */ }
    if (!verdict) { reasons.push('judge output unparsable'); continue; }
    const pass = verdict.concept_same && verdict.answer_correct && verdict.no_leak && verdict.difficulty_ok;
    if (!pass) { reasons.push(`judge rejected: ${verdict.reason || 'no reason'}`); continue; }

    return {
      row: {
        source_session_id: anchor.sessionId,
        source_problem_number: Number(anchor.problemNumber),
        kind: anchor.kind,
        concept_tag: anchor.concept || null,
        problem: {
          question_text: String(gen.question_text),
          examples: String(gen.examples || ''),
          input_type: String(gen.input_type || 'single'),
          input_labels: Array.isArray(gen.input_labels) ? gen.input_labels : undefined,
          answer_format_hint: gen.answer_format_hint ? String(gen.answer_format_hint) : null,
          category: String(gen.category || original.category || ''),
          subcategory: String(gen.subcategory || original.subcategory || ''),
        },
        answer: String(gen.answer),
        accepted_answers: [String(gen.answer), ...(Array.isArray(gen.accepted_answers) ? gen.accepted_answers.map(String) : [])]
          .filter(Boolean)
          .filter((v, i, arr) => arr.indexOf(v) === i),
        comment: String(gen.comment || ''),
        status: 'pending',
      },
      reasons,
    };
  }
  return { row: null, reasons };
}

export async function POST(request) {
  const session = await auth();
  const email = String(session?.user?.email || '').trim().toLowerCase();
  if (!email) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!OPENAI_API_KEY) return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
  if (!hasGeneratedProblemsConfig()) return Response.json({ error: 'supabase not configured' }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const dueDate = body?.dueToday ? kstTodayString() : kstTomorrowString(); // dueToday는 수동 테스트용

  // 1) 오답 + 시도 이력 (로컬 dev에서도 Supabase 강제)
  const { wrongProblems, attemptedKeys } = await getUserOutcomeSummary(email, { forceRemote: true });
  const practicalWrongs = wrongProblems.filter(
    (w) => classifySessionId(w.sourceSessionId) === 'practical',
  );

  // 2) 배치 계획
  const [tagsMap, pendingKeys] = await Promise.all([loadConceptTags(), fetchPendingOriginKeys(email)]);
  const problemIndex = await buildProblemIndex(tagsMap);
  const anchors = planGenerationBatch({
    wrongs: practicalWrongs, pendingKeys, tagsMap, problemIndex, attemptedKeys,
  });
  if (anchors.length === 0) {
    return Response.json({ generated: 0, rejected: 0, message: '생성할 오답이 없거나 모두 pending 상태입니다.' });
  }

  // 3) 순차 생성 (rate limit 배려) + 요약
  const datasetCache = new Map();
  const rows = [];
  const rejectedReasons = [];
  for (const anchor of anchors) {
    const { row, reasons } = await generateOne(anchor, datasetCache);
    if (row) {
      rows.push({ ...row, user_email: email, due_date: dueDate });
    } else {
      rejectedReasons.push({ anchor: anchor.key, reasons });
    }
  }

  await insertGeneratedProblems(rows);
  return Response.json({
    generated: rows.length,
    rejected: rejectedReasons.length,
    dueDate,
    byKind: rows.reduce((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] || 0) + 1 }), {}),
    rejectedReasons,
  });
}
```

- [ ] **Step 2: 렌트 확인 (lint/컴파일)**

Run: `npx next lint --file app/api/daily-review/generate/route.js` (프로젝트에 lint 스크립트가 없으면 `npm run dev` 기동 후 라우트 임포트 에러 없는지 확인)
Expected: 에러 없음

- [ ] **Step 3: 실제 호출 스모크 테스트 (Task 1의 마이그레이션 실행 완료 후)**

dev 서버(포트 3001) 기동 상태에서 로그인 세션으로 실행해야 하므로, 브라우저 콘솔에서:

```js
fetch('/api/daily-review/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dueToday: true }),  // 오늘 날짜로 넣어 바로 확인
}).then((r) => r.json()).then(console.log);
```

Expected: `{ generated: N, rejected: M, byKind: {...}, rejectedReasons: [...] }`. Supabase 대시보드에서 rows 확인. rejected가 전부라면 rejectedReasons를 보고 프롬프트/게이트 조정.

- [ ] **Step 4: Commit**

```bash
git add app/api/daily-review/generate/route.js
git commit -m "feat(daily-review): 생성 API — 게이트+심판+재생성 예산 하네스"
```

---

### Task 9: 결과 반영 훅 — analytics 라우트

**Files:**
- Modify: `app/api/analytics/event/route.js` (POST 핸들러, `await appendEvent(event);` 직후 — 현재 `:193`)

- [ ] **Step 1: import 추가**

파일 상단 import 블록에 추가:

```js
import { applyDailyReviewOutcomes, discardPendingByOrigin } from '@/lib/generatedProblemsStore';
```

- [ ] **Step 2: 훅 삽입**

`await appendEvent(event);` (현재 `:193`) 바로 다음에 추가:

```js
    // 오늘의 복습: 풀이 결과 반영 (맞힘→done, 틀림→내일 재출제)
    if (event.type === 'finish_exam' && String(event.sessionId) === 'practical-daily-review') {
      const outcomes = Array.isArray(event.payload?.problemOutcomes) ? event.payload.problemOutcomes : [];
      const email = String(event.payload?.__meta?.userEmail || '').trim().toLowerCase();
      if (email && outcomes.length > 0) {
        applyDailyReviewOutcomes(email, outcomes).catch(() => {
          // 복습 상태 갱신 실패가 이벤트 기록을 막으면 안 됨
        });
      }
    }

    // 오늘의 복습: "문제 이상해요" 신고 → 해당 변형 폐기 (다음 생성 때 새 변형)
    if (event.type === 'report_problem' && String(event.sessionId) === 'practical-daily-review') {
      const email = String(event.payload?.__meta?.userEmail || '').trim().toLowerCase();
      const sid = String(event.payload?.originSessionId || '');
      const num = Number(event.payload?.originProblemNumber || 0);
      if (email && sid && num > 0) {
        discardPendingByOrigin(email, sid, num).catch(() => {});
      }
    }
```

주의: Task 0에서 확인한 outcome의 `sessionId` 의미(origin 참조)와 일치해야 한다. finish_exam 이벤트의 최상위 `event.sessionId`는 퀴즈 세션 ID(`practical-daily-review`), `problemOutcomes[].sessionId`는 각 문제의 origin — 두 층위가 다름에 유의.

- [ ] **Step 3: 기존 테스트 회귀 확인**

Run: `npx vitest run --silent=false`
Expected: 전체 PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/analytics/event/route.js
git commit -m "feat(daily-review): finish_exam/report_problem 훅으로 복습 상태 반영"
```

---

### Task 10: 풀이 페이지 + 생성 버튼

**Files:**
- Create: `app/practical/daily-review/page.js`
- Create: `app/practical/daily-review/GenerateButton.js`
- Modify: `app/practical/_lib/practicalData.js:8-16` (SYNTHETIC_SESSIONS)

- [ ] **Step 1: SYNTHETIC_SESSIONS에 추가**

`app/practical/_lib/practicalData.js:8-16`의 Set에 `'daily-review',` 항목 추가 (`'my-unknown',` 다음 줄).

- [ ] **Step 2: GenerateButton 클라이언트 컴포넌트**

```js
// app/practical/daily-review/GenerateButton.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GenerateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setSummary(null);
    try {
      const response = await fetch('/api/daily-review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || '생성 실패');
      setSummary(data);
      router.refresh();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? '변형 생성 중... (1~2분 소요)' : '오답 변형 생성하기'}
      </button>
      {summary && (
        <p className="mt-3 text-sm text-slate-600">
          {summary.generated}문제 생성 완료 ({summary.dueDate}에 출제)
          {summary.rejected > 0 ? ` · ${summary.rejected}건 품질 미달로 제외` : ''}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: 페이지 (high-wrong/page.js 패턴)**

```js
// app/practical/daily-review/page.js
import Link from 'next/link';
import { auth } from '@/auth';
import PracticalQuizV2 from '../[sessionId]/PracticalQuizV2';
import { fetchDueGeneratedProblems, toQuizProblem } from '@/lib/generatedProblemsStore';
import { interleaveByCategory } from '@/lib/variantGeneration';
import { kstTodayString } from '@/lib/kstDate';
import GenerateButton from './GenerateButton';

export const dynamic = 'force-dynamic';

export default async function DailyReviewPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const initialProblemNumberRaw = Number(sp?.p);
  const initialProblemNumber = Number.isNaN(initialProblemNumberRaw) ? null : initialProblemNumberRaw;
  const shouldResume = String(sp?.resume || '') === '1';

  const session = await auth();
  const userEmail = String(session?.user?.email || '').trim().toLowerCase();

  if (!userEmail) {
    return (
      <EmptyShell title="오늘의 복습">
        <p className="mb-6 text-slate-600">로그인하면 어제 틀린 문제의 변형을 복습할 수 있습니다.</p>
        <Link href="/practical" className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
          실기 회차 선택으로 돌아가기
        </Link>
      </EmptyShell>
    );
  }

  const rows = await fetchDueGeneratedProblems(userEmail, kstTodayString());

  if (rows.length === 0) {
    return (
      <EmptyShell title="오늘의 복습">
        <p className="mb-2 text-slate-600">오늘 복습할 문제가 없습니다.</p>
        <p className="mb-4 text-sm text-slate-500">
          기출을 풀어 오답이 쌓이면, 아래 버튼으로 변형 문제를 만들 수 있어요. 만든 문제는 다음날 여기에 나옵니다.
        </p>
        <GenerateButton />
        <div className="mt-6">
          <Link href="/practical" className="text-sm font-semibold text-emerald-700 hover:underline">
            ← 실기 회차 선택으로
          </Link>
        </div>
      </EmptyShell>
    );
  }

  // 인터리빙 셔플 후 renumber (셔플은 요청마다 달라져도 무방 — resume은 문항 번호 기준이라
  // 같은 날 재방문 시 순서가 바뀌면 혼란 가능 → 정렬 시드 대신 created_at 정렬 + 인터리빙의
  // 결정론 버전 사용: random에 고정값)
  const ordered = interleaveByCategory(
    rows.map((row) => ({ row, category: String(row.problem?.category || '') })),
    () => 0.5, // 결정론: 같은 due 목록이면 항상 같은 순서
  );

  const picked = [];
  const answersMap = {};
  const commentsMap = {};
  for (const { row } of ordered) {
    const newNo = picked.length + 1;
    picked.push(toQuizProblem(row, newNo));
    answersMap[newNo] = String(row.answer ?? '');
    commentsMap[newNo] = String(row.comment ?? '');
  }

  return (
    <PracticalQuizV2
      problems={picked}
      answersMap={answersMap}
      commentsMap={commentsMap}
      session={{
        title: `오늘의 복습 (${picked.length}문제)`,
        reviewOnly: true,
        lobbySubtitle: '어제 틀린 문제의 변형 · 맞히면 졸업, 틀리면 내일 새 변형',
      }}
      sessionId="practical-daily-review"
      initialProblemNumber={initialProblemNumber}
      shouldResume={shouldResume}
    />
  );
}

function EmptyShell({ title, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-3 text-2xl font-extrabold text-slate-900">{title}</h1>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 화면 확인**

Run: dev 서버에서 `http://localhost:3001/practical/daily-review` 접속
Expected: 비로그인 → 로그인 안내 / 로그인 + due 없음 → 생성 버튼 화면 / (Task 8 Step 3에서 `dueToday: true`로 생성했다면) 퀴즈 화면에 변형 문제 렌더.

- [ ] **Step 5: Commit**

```bash
git add app/practical/daily-review/ app/practical/_lib/practicalData.js
git commit -m "feat(daily-review): 복습 풀이 페이지 + 생성 버튼"
```

---

### Task 11: 실기 선택 페이지에 카드 추가

**Files:**
- Modify: `app/practical/PracticalSelectionPageClient.js`

- [ ] **Step 1: utilityModes 배열 위치 확인**

Run: `grep -n "utilityModes" app/practical/PracticalSelectionPageClient.js | head -5`
그 정의부를 Read로 열어 항목 객체의 실제 필드(title/desc/href/resumeKey/availabilityKey 등)를 확인.

- [ ] **Step 2: 항목 추가**

utilityModes 배열 **맨 앞**에 기존 항목과 같은 shape으로 추가 (아래는 예상 필드 — Step 1에서 확인한 실제 필드명에 맞출 것):

```js
  {
    title: '오늘의 복습',
    desc: '틀린 문제의 변형을 매일 다시 — 맞히면 졸업, 틀리면 새 변형',
    href: '/practical/daily-review',
    resumeKey: 'practical-daily-review',
    availabilityKey: null, // 항상 진입 가능 (빈 상태는 페이지가 안내)
  },
```

`availabilityKey`가 null일 때 `utilityAvailability[null]`이 undefined가 되는데, 렌더 코드(`:190`)가 `mode.availabilityKey ? utilityAvailability[mode.availabilityKey] : 'ready'`로 이미 방어하고 있으므로 안전. resume 갱신 배열(`:157-162`)에는 `'practical-daily-review'`가 이미 포함되어 있지 않으므로 `'practical-high-wrong',` 앞에 추가.

- [ ] **Step 3: 화면 확인**

Run: `http://localhost:3001/practical` 접속
Expected: 특수 모드 섹션 맨 위에 "오늘의 복습" 카드. 클릭 시 `/practical/daily-review` 이동.

- [ ] **Step 4: Commit**

```bash
git add app/practical/PracticalSelectionPageClient.js
git commit -m "feat(daily-review): 실기 선택 페이지에 오늘의 복습 카드"
```

---

### Task 12: 전체 검증 + E2E + 배포

- [ ] **Step 1: 전체 테스트**

Run: `npx vitest run --silent=false`
Expected: 전체 PASS

- [ ] **Step 2: 수동 E2E (전체 루프 1회전)**

1. (전제) Task 1 마이그레이션 실행 완료
2. 로그인 상태로 기출 한 회차에서 일부러 2~3문제 틀리고 제출
3. `/practical/daily-review` → 생성 버튼 (스모크용으로 브라우저 콘솔에서 `dueToday: true` 호출도 가능)
4. Supabase 대시보드에서 rows 확인 (kind 분포: variant + expansion/coverage)
5. `dueToday: true`로 생성한 경우 페이지 새로고침 → 변형 문제 풀이 → 제출
6. Supabase에서 맞힌 행 `status='done'`, 틀린 행 `due_date=내일`로 바뀌었는지 확인
7. 문제 신고 버튼 → 해당 행 `status='discarded'` 확인

- [ ] **Step 3: 푸시 (사용자 확인 후)**

```bash
git push
```

Netlify 자동 배포. 배포 후 프로덕션에서 생성 버튼 1회 실행해 OPENAI_API_KEY 동작 확인.

---

## Self-Review 결과

- **스펙 커버리지**: 테이블(Task 1)·생성+하네스(7,8)·변형 폭 정책 80/20+개념확장+미시도 커버리지(6,7)·개념 태깅(5)·풀이 페이지+인터리빙(10)·결과 반영/재스케줄(9)·신고 폐기(9)·진입 카드(11) — 스펙 전 항목 매핑됨. 스펙의 "agent 서버 생성"은 OpenAI 직접 호출로 변경(사유는 문서 상단 설계 결정 참조 — 스펙 대비 의도적 변경이며 사용자에게 고지할 것).
- **미구현으로 남긴 것 (YAGNI)**: SQL 실행 검증(agent 서버 자산 — 심판의 answer_correct로 대체, 시험 후 통합), 힌트 사다리, "안 풀어본 개념 N개" 카운터.
- **리스크**: (a) Task 0의 outcome origin 가정 — 확인 실패 시 Task 9 재설계, (b) gpt-4.1 생성 품질 — rejectedReasons 로그로 프롬프트 튜닝 루프 확보, (c) `maxDuration=300`은 Netlify 플랜에 따라 무시될 수 있음 — 오답이 많으면 `maxAnchors=20` 캡이 보호.
