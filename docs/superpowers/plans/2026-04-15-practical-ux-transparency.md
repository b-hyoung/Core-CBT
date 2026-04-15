# 실기 UX 투명성 · 결과 피드백 강화 구현 계획 (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실기 풀이에서 (a) 입력 전 포맷 힌트 표시, (b) 채점 직후 내 답 vs 정답 diff + 관대 채점 이유 뱃지를 제공한다.

**Architecture:** 기존 `isPracticalAnswerMatch` 로직을 `_lib/gradePracticalAnswer.js`로 추출하면서 반환형을 `{ matched, reasons, fieldResults, diff }`로 확장한다. Supabase 테이블 `practical_hint_overrides`로 관리자 힌트 덮어쓰기를 저장하고, SSR에서 원본 JSON과 병합해 내려준다. UI는 `AnswerHint` · `ResultFeedback` 컴포넌트 2개만 추가하고 PracticalQuiz.js 본체는 삽입 지점만 수정한다.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Supabase REST API · Vitest (신규) · NextAuth.

**Spec:** `docs/superpowers/specs/2026-04-15-practical-ux-transparency-design.md`

---

## File Structure

**신규 생성**
- `app/practical/[sessionId]/_lib/gradePracticalAnswer.js` — 채점 로직(normalizers + matcher + diff)
- `app/practical/[sessionId]/_lib/inferAnswerFormat.js` — 자동 포맷 추론
- `app/practical/[sessionId]/_lib/fetchHintOverrides.js` — Supabase override 조회
- `app/practical/[sessionId]/_lib/computeDiff.js` — LCS 문자/단어 diff
- `app/practical/[sessionId]/components/AnswerHint.js`
- `app/practical/[sessionId]/components/ResultFeedback.js`
- `app/api/practical-hints/route.js` — 공용 GET
- `app/api/admin/practical-hints/route.js` — 관리자 PUT/DELETE
- `app/admin/practical-hints/page.js` + `PracticalHintsClient.js`
- `tests/gradePracticalAnswer.test.js`
- `tests/inferAnswerFormat.test.js`
- `tests/computeDiff.test.js`
- `vitest.config.js`
- `docs/supabase/practical_hint_overrides.sql` — 마이그레이션 SQL

**수정**
- `app/practical/[sessionId]/PracticalQuiz.js` — GPT 상태 effect 루프 방어, ResultFeedback/AnswerHint 삽입
- `app/practical/[sessionId]/_lib/practicalData.js` — override 병합
- `package.json` — vitest devDependency + scripts

---

## Task 0: 선제 버그 수정 (P0)

**Files:**
- Modify: `app/practical/[sessionId]/PracticalQuiz.js:82-117` (buildGptStatePayloadWithPrune)
- Modify: `app/practical/[sessionId]/PracticalQuiz.js:1094-1105` (GPT save effect)

- [ ] **Step 1: P0 #1 — GPT save effect 무한 루프 방어**

현재 코드(`1094-1105`)는 `saved.conversations !== gptConversationsByProblem` 참조 비교로 setState를 호출하는데, `buildGptStatePayloadWithPrune`이 **매번 새 객체 ref를 반환**하므로 prune이 없어도 false positive 가능.

아래와 같이 `prunedCount > 0`일 때만 setState 하도록 변경:

```js
useEffect(() => {
  try {
    const saved = saveGptStateToLocalStorage(gptStateStorageKey, {
      usedProblems: gptUsedProblems,
      conversations: gptConversationsByProblem,
    });
    if (saved?.prunedCount > 0) {
      setGptConversationsByProblem(saved.conversations);
      setGptUsedProblems(saved.usedProblems);
    }
  } catch {}
}, [gptConversationsByProblem, gptStateStorageKey, gptUsedProblems]);
```

그리고 `saveGptStateToLocalStorage`가 `prunedCount`를 항상 리턴하도록 확인 (현재 `pruned: firstPass.prunedCount > 0` 외에 `prunedCount`도 노출).

- [ ] **Step 2: P0 #2 — prune 시 usedProblems 무차별 삭제 방어**

현재 `buildGptStatePayloadWithPrune`(line 97-100)은 conversations 키로 `nextUsed[key]`를 같이 삭제. 두 맵의 키 스키마가 다를 수 있으므로 **conversations에 존재하는 키만 정리**하고, `nextUsed`는 별도 루프에서 독립 prune.

```js
function buildGptStatePayloadWithPrune({
  usedProblems,
  conversations,
  softLimitBytes = GPT_LOCAL_STATE_SOFT_LIMIT_BYTES,
}) {
  const nextUsed = { ...(usedProblems && typeof usedProblems === 'object' ? usedProblems : {}) };
  const nextConversations = { ...(conversations && typeof conversations === 'object' ? conversations : {}) };
  let payload = { usedProblems: nextUsed, conversations: nextConversations };
  let serialized = JSON.stringify(payload);
  if (estimateLocalStorageBytes(serialized) <= softLimitBytes) {
    return { payload, serialized, prunedCount: 0 };
  }

  let prunedCount = 0;
  for (const key of Object.keys(nextConversations)) {
    delete nextConversations[key];
    prunedCount += 1;
    payload = { usedProblems: nextUsed, conversations: nextConversations };
    serialized = JSON.stringify(payload);
    if (estimateLocalStorageBytes(serialized) <= softLimitBytes) {
      return { payload, serialized, prunedCount };
    }
  }

  for (const key of Object.keys(nextUsed)) {
    delete nextUsed[key];
    prunedCount += 1;
    payload = { usedProblems: nextUsed, conversations: nextConversations };
    serialized = JSON.stringify(payload);
    if (estimateLocalStorageBytes(serialized) <= softLimitBytes) break;
  }

  return { payload, serialized, prunedCount };
}
```

`nextUsed[key]` 삭제를 conversations 루프에서 제거.

- [ ] **Step 3: dev 서버 실행해 회귀 없음 확인**

Run: `npm run dev`
실기 세션 한 개 열어 GPT 기능(해설 요청) 1회 호출 후 브라우저 콘솔 에러 없음/무한 리렌더 없음 확인. Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add app/practical/[sessionId]/PracticalQuiz.js
git commit -m "fix: GPT 상태 저장 effect 무한 루프 및 usedProblems 오삭제 방어"
```

---

## Task 1: Vitest 테스트 러너 도입

**Files:**
- Create: `vitest.config.js`
- Modify: `package.json`

- [ ] **Step 1: devDependency 추가**

```bash
npm install -D vitest @vitest/ui
```

- [ ] **Step 2: `vitest.config.js` 작성**

```js
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
```

- [ ] **Step 3: `package.json` scripts에 test 추가**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: smoke test**

`tests/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.js tests/smoke.test.js
git commit -m "chore: vitest 테스트 러너 도입"
```

---

## Task 2: Supabase 테이블 마이그레이션 문서

**Files:**
- Create: `docs/supabase/practical_hint_overrides.sql`

- [ ] **Step 1: SQL 파일 작성**

```sql
-- Run in Supabase SQL editor before deploying GET /api/practical-hints

create table if not exists practical_hint_overrides (
  id              bigserial primary key,
  session_id      text not null,
  problem_number  int  not null,
  hint_text       text not null,
  updated_at      timestamptz not null default now(),
  updated_by      text,
  unique (session_id, problem_number)
);

create index if not exists practical_hint_overrides_session_idx
  on practical_hint_overrides (session_id);

alter table practical_hint_overrides enable row level security;

-- Public read
create policy "practical_hint_overrides_select_all"
  on practical_hint_overrides
  for select
  using (true);

-- Writes via service role only (no anon insert/update/delete policies)
```

- [ ] **Step 2: Commit**

```bash
git add docs/supabase/practical_hint_overrides.sql
git commit -m "docs: practical_hint_overrides 마이그레이션 SQL"
```

*(실제 Supabase 실행은 배포 체크리스트 단계에서 수동으로 진행)*

---

## Task 3: `computeDiff` 순수 함수 + 테스트

**Files:**
- Create: `app/practical/[sessionId]/_lib/computeDiff.js`
- Create: `tests/computeDiff.test.js`

- [ ] **Step 1: 실패 테스트 작성**

```js
// tests/computeDiff.test.js
import { describe, it, expect } from 'vitest';
import { computeDiff } from '@/app/practical/[sessionId]/_lib/computeDiff';

describe('computeDiff', () => {
  it('returns a single equal segment when strings are identical', () => {
    const result = computeDiff('HTTP', 'HTTP');
    expect(result.segments).toEqual([{ type: 'equal', text: 'HTTP' }]);
  });

  it('marks removed and added segments on mismatch', () => {
    const result = computeDiff('HTTPS', 'HTTP');
    const types = result.segments.map((s) => s.type);
    expect(types).toContain('equal');
    expect(types).toContain('removed');
  });

  it('handles empty user answer', () => {
    const result = computeDiff('', 'HTTP');
    expect(result.segments).toEqual([{ type: 'added', text: 'HTTP' }]);
  });

  it('falls back to word granularity over 200 chars', () => {
    const long = 'x'.repeat(250);
    const result = computeDiff(long, long);
    expect(result.granularity).toBe('word');
  });
});
```

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 2: 구현**

```js
// app/practical/[sessionId]/_lib/computeDiff.js
const CHAR_THRESHOLD = 200;

function tokenize(text, granularity) {
  if (granularity === 'word') return String(text).split(/(\s+)/);
  return Array.from(String(text));
}

function lcsTable(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function buildSegments(userTokens, correctTokens, dp) {
  const segments = [];
  let i = userTokens.length;
  let j = correctTokens.length;
  const push = (type, text) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.text += text;
    else segments.push({ type, text });
  };
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && userTokens[i - 1] === correctTokens[j - 1]) {
      push('equal', userTokens[i - 1]);
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      push('added', correctTokens[j - 1]);
      j -= 1;
    } else {
      push('removed', userTokens[i - 1]);
      i -= 1;
    }
  }
  return segments.reverse();
}

export function computeDiff(userText, correctText) {
  const u = String(userText ?? '');
  const c = String(correctText ?? '');
  const granularity = Math.max(u.length, c.length) > CHAR_THRESHOLD ? 'word' : 'char';
  const userTokens = tokenize(u, granularity);
  const correctTokens = tokenize(c, granularity);
  const dp = lcsTable(userTokens, correctTokens);
  const segments = buildSegments(userTokens, correctTokens, dp);
  return { user: u, correct: c, granularity, segments };
}
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `npm test -- computeDiff`
Expected: 4 passed.

- [ ] **Step 4: Commit**

```bash
git add app/practical/[sessionId]/_lib/computeDiff.js tests/computeDiff.test.js
git commit -m "feat(practical): LCS 기반 computeDiff 모듈 추가"
```

---

## Task 4: `inferAnswerFormat` 순수 함수 + 테스트

**Files:**
- Create: `app/practical/[sessionId]/_lib/inferAnswerFormat.js`
- Create: `tests/inferAnswerFormat.test.js`

- [ ] **Step 1: 실패 테스트 작성**

```js
// tests/inferAnswerFormat.test.js
import { describe, it, expect } from 'vitest';
import { inferAnswerFormat } from '@/app/practical/[sessionId]/_lib/inferAnswerFormat';

describe('inferAnswerFormat', () => {
  it('recognizes fixed-length uppercase English', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, 'HTTP')).toBe('영문 대문자 4글자');
  });
  it('recognizes uppercase English without fixed length', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, 'SELECT')).toBe('영문 대문자');
  });
  it('recognizes numeric single token', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, '4')).toBe('숫자');
  });
  it('recognizes comma or slash separated', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, 'ㄱ, ㄷ')).toBe('쉼표로 구분');
  });
  it('recognizes mixed korean and english', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, '평균/AVG')).toBe('한글 또는 영문 약어 모두 인정');
  });
  it('returns fallback for multi_blank', () => {
    expect(inferAnswerFormat({ input_type: 'multi_blank' }, '① 3 ② 4')).toBe('각 라벨 옆에 답을 입력하세요');
  });
  it('returns fallback for ordered_sequence', () => {
    expect(inferAnswerFormat({ input_type: 'ordered_sequence' }, 'ㄱ, ㄴ, ㄷ')).toBe('순서대로 기호를 입력하세요');
  });
  it('returns fallback for unordered_symbol_set', () => {
    expect(inferAnswerFormat({ input_type: 'unordered_symbol_set' }, 'ㄱ, ㄷ')).toBe('옳은 기호만 골라 입력하세요');
  });
  it('returns fallback for textarea', () => {
    expect(inferAnswerFormat({ input_type: 'textarea' }, 'result')).toBe('실행 결과를 그대로 입력하세요');
  });
  it('returns empty string when nothing infers', () => {
    expect(inferAnswerFormat({ input_type: 'single' }, '')).toBe('');
  });
});
```

Run: `npm test -- inferAnswerFormat` → FAIL.

- [ ] **Step 2: 구현**

```js
// app/practical/[sessionId]/_lib/inferAnswerFormat.js

const FALLBACKS = {
  multi_blank: '각 라벨 옆에 답을 입력하세요',
  ordered_sequence: '순서대로 기호를 입력하세요',
  unordered_symbol_set: '옳은 기호만 골라 입력하세요',
  textarea: '실행 결과를 그대로 입력하세요',
  single: '',
};

function inferSingleToken(answer) {
  const trimmed = String(answer || '').trim();
  if (!trimmed) return '';
  if (/[,\/]/.test(trimmed)) return '쉼표로 구분';
  const hasKor = /[가-힣]/.test(trimmed);
  const hasEng = /[A-Za-z]/.test(trimmed);
  if (hasKor && hasEng) return '한글 또는 영문 약어 모두 인정';
  if (/^[A-Z]+$/.test(trimmed)) {
    return `영문 대문자 ${trimmed.length}글자`.replace(/ \d+글자$/, (m) => (trimmed.length <= 6 ? m : '')) || '영문 대문자';
  }
  if (/^\d+$/.test(trimmed)) return '숫자';
  return '';
}

export function inferAnswerFormat(problem, correctAnswer) {
  const inputType = String(problem?.input_type || 'single');
  if (inputType === 'single') {
    const result = inferSingleToken(correctAnswer);
    return result || FALLBACKS.single;
  }
  return FALLBACKS[inputType] ?? '';
}
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `npm test -- inferAnswerFormat`
Expected: 10 passed. 만약 "영문 대문자 4글자" 케이스와 "SELECT" 케이스 로직이 꼬이면 `inferSingleToken`을 다음과 같이 수정:

```js
if (/^[A-Z]+$/.test(trimmed)) {
  return trimmed.length <= 6 ? `영문 대문자 ${trimmed.length}글자` : '영문 대문자';
}
```

- [ ] **Step 4: Commit**

```bash
git add app/practical/[sessionId]/_lib/inferAnswerFormat.js tests/inferAnswerFormat.test.js
git commit -m "feat(practical): 답안 포맷 자동 추론 모듈 추가"
```

---

## Task 5: `gradePracticalAnswer` — 채점 모듈 뼈대 + 호환 래퍼

**Files:**
- Create: `app/practical/[sessionId]/_lib/gradePracticalAnswer.js`
- Create: `tests/gradePracticalAnswer.test.js`

이 태스크에서는 **기존 `PracticalQuiz.js`의 8개 normalizer + `isPracticalAnswerMatch` + `buildAcceptedPracticalAnswers`를 그대로 복사 이관**하고, 반환형만 `{ matched, reasons }` 로 확장한다. `fieldResults`/`diff`는 Task 7에서 추가.

- [ ] **Step 1: 실패 테스트 작성 (핵심 경로만)**

```js
// tests/gradePracticalAnswer.test.js
import { describe, it, expect } from 'vitest';
import { gradePracticalAnswer } from '@/app/practical/[sessionId]/_lib/gradePracticalAnswer';

const problem = (over = {}) => ({
  input_type: 'single',
  accepted_answers: [],
  examples: '',
  question_text: '',
  input_labels: undefined,
  ...over,
});

describe('gradePracticalAnswer - single', () => {
  it('exact match', () => {
    const r = gradePracticalAnswer({ userAnswer: 'HTTP', correctAnswer: 'HTTP', problem: problem() });
    expect(r.matched).toBe(true);
    expect(r.reasons).toContain('exact');
  });
  it('case insensitive', () => {
    const r = gradePracticalAnswer({ userAnswer: 'http', correctAnswer: 'HTTP', problem: problem() });
    expect(r.matched).toBe(true);
    expect(r.reasons).toContain('case_insensitive');
  });
  it('whitespace ignored', () => {
    const r = gradePracticalAnswer({ userAnswer: '  HTTP ', correctAnswer: 'HTTP', problem: problem() });
    expect(r.matched).toBe(true);
    expect(r.reasons).toEqual(expect.arrayContaining(['whitespace_ignored']));
  });
  it('accepted_alternative', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'HyperText Transfer Protocol',
      correctAnswer: 'HTTP',
      problem: problem({ accepted_answers: ['HyperText Transfer Protocol'] }),
    });
    expect(r.matched).toBe(true);
    expect(r.reasons).toContain('accepted_alternative');
  });
  it('no match', () => {
    const r = gradePracticalAnswer({ userAnswer: 'FTP', correctAnswer: 'HTTP', problem: problem() });
    expect(r.matched).toBe(false);
    expect(r.reasons).toEqual([]);
  });
  it('rejects UNKNOWN_OPTION', () => {
    const r = gradePracticalAnswer({ userAnswer: '__UNKNOWN_OPTION__', correctAnswer: 'HTTP', problem: problem() });
    expect(r.matched).toBe(false);
  });
});

describe('gradePracticalAnswer - unordered_symbol_set', () => {
  it('matches regardless of order', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'ㄴ, ㄱ',
      correctAnswer: 'ㄱ, ㄴ',
      problem: problem({ input_type: 'unordered_symbol_set' }),
    });
    expect(r.matched).toBe(true);
    expect(r.reasons).toContain('order_independent');
  });
  it('rejects with extra symbol', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'ㄱ, ㄴ, ㄷ',
      correctAnswer: 'ㄱ, ㄴ',
      problem: problem({ input_type: 'unordered_symbol_set' }),
    });
    expect(r.matched).toBe(false);
  });
});
```

Run: `npm test -- gradePracticalAnswer` → FAIL (module not found).

- [ ] **Step 2: 기존 PracticalQuiz.js 60-990에서 아래 함수를 그대로 복사 후 `export` 조정**

복사 대상(출처 = `app/practical/[sessionId]/PracticalQuiz.js`):
- `getSequenceMeta` (152)
- `getMultiBlankMeta` (202)
- `inferNamedPairLabelsFromAnswer` (252)
- `parsePracticalSymbolChoices` (283)
- `splitSequenceDraft` (311)
- `splitMultiBlankDraft` (319)
- `sanitizeSequenceToken` (364)
- `normalizePracticalAnswer` (401)
- `normalizeLabelToken` (411)
- `getLabeledTokenMatches` (432)
- `normalizeSequenceLikeAnswer` (451)
- `normalizeUnorderedSymbolSetAnswer` (484)
- `normalizeLabeledMultiBlankAnswer` (505)
- `normalizeLabeledMultiBlankValuesOnly` (530)
- `parseLabeledMultiBlankValues` (549)
- `parseLabeledMultiBlankValuesByKnownLabels` (566)
- `buildFlexibleFieldVariants` (614)
- `normalizeCommaSeparatedTermSet` (655)
- `isEquivalentMultiBlankFieldValue` (666)
- `buildAcceptedPracticalAnswers` (687)
- `isPracticalAnswerMatch` (754)
- `parseLabeledAnswerPairs` (845)

모두 `app/practical/[sessionId]/_lib/gradePracticalAnswer.js` 상단에 `function ...`로 옮긴다. `UNKNOWN_OPTION` 상수도 복사.

- [ ] **Step 3: `gradePracticalAnswer` public API 구현**

파일 하단에 다음을 추가:

```js
const UNKNOWN_OPTION = '__UNKNOWN_OPTION__';

function addReason(arr, reason) {
  if (!arr.includes(reason)) arr.push(reason);
}

// 내부: isPracticalAnswerMatch를 reason-tracking 버전으로 변환
// 가장 빠른 길은 isPracticalAnswerMatch를 복붙한 뒤 각 true-반환 직전에
// reasons.push(...)를 삽입하는 것. 단계별로 아래와 같이 분기한다.
function matchWithReasons(userAnswer, correctAnswer, problem) {
  const reasons = [];
  if (userAnswer === null || userAnswer === UNKNOWN_OPTION) return { matched: false, reasons };

  const rawUser = String(userAnswer ?? '').trim();
  const rawCorrect = String(correctAnswer ?? '').trim();
  if (!rawUser) return { matched: false, reasons };

  // 1. exact
  if (rawUser === rawCorrect) {
    addReason(reasons, 'exact');
    return { matched: true, reasons };
  }

  // 2. case-insensitive exact
  if (rawUser.toLowerCase() === rawCorrect.toLowerCase()) {
    addReason(reasons, 'case_insensitive');
    return { matched: true, reasons };
  }

  // 3. whitespace-ignored normalized equal
  const nu = normalizePracticalAnswer(rawUser);
  const nc = normalizePracticalAnswer(rawCorrect);
  if (nu && nu === nc) {
    addReason(reasons, 'whitespace_ignored');
    addReason(reasons, 'punctuation_ignored');
    return { matched: true, reasons };
  }

  // 4. accepted_alternative
  const accepted = buildAcceptedPracticalAnswers(rawCorrect, problem);
  for (const candidate of accepted) {
    if (normalizePracticalAnswer(candidate) === nu) {
      addReason(reasons, 'accepted_alternative');
      return { matched: true, reasons };
    }
  }

  // 5. unordered_symbol_set
  const inputType = String(problem?.input_type || '');
  if (inputType === 'unordered_symbol_set' || /(모두\s*고르|모두\s*골라)/.test(String(problem?.question_text || ''))) {
    const ua = normalizeUnorderedSymbolSetAnswer(rawUser);
    const ca = normalizeUnorderedSymbolSetAnswer(rawCorrect);
    if (ua && ua === ca) {
      addReason(reasons, 'order_independent');
      return { matched: true, reasons };
    }
  }

  // 6. ordered_sequence
  if (inputType === 'ordered_sequence') {
    const ua = normalizeSequenceLikeAnswer(rawUser);
    const ca = normalizeSequenceLikeAnswer(rawCorrect);
    if (ua && ua === ca) {
      addReason(reasons, 'label_normalized');
      return { matched: true, reasons };
    }
  }

  // 7. multi_blank labeled
  if (inputType === 'multi_blank') {
    const ua = normalizeLabeledMultiBlankAnswer(rawUser);
    const ca = normalizeLabeledMultiBlankAnswer(rawCorrect);
    if (ua && ua === ca) {
      addReason(reasons, 'label_normalized');
      return { matched: true, reasons };
    }
    const uv = normalizeLabeledMultiBlankValuesOnly(rawUser);
    const cv = normalizeLabeledMultiBlankValuesOnly(rawCorrect);
    if (uv && uv === cv) {
      addReason(reasons, 'label_normalized');
      return { matched: true, reasons };
    }
  }

  // 8. fall back to legacy isPracticalAnswerMatch (covers edge cases we didn't enumerate)
  if (isPracticalAnswerMatch(rawUser, rawCorrect, problem)) {
    addReason(reasons, 'accepted_alternative');
    return { matched: true, reasons };
  }

  return { matched: false, reasons: [] };
}

export function gradePracticalAnswer({ userAnswer, correctAnswer, problem }) {
  return matchWithReasons(userAnswer, correctAnswer, problem);
}

// 호환 래퍼: 기존 호출부 무수정 유지용
export { isPracticalAnswerMatch };
```

**주의**: `matchWithReasons`는 **추가 진단 레이어**일 뿐이고, 최종 matched 판정은 기존 `isPracticalAnswerMatch` 결과와 일치해야 한다. `fall back` 단계가 그 계약을 유지.

- [ ] **Step 4: 테스트 통과**

Run: `npm test -- gradePracticalAnswer`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add app/practical/[sessionId]/_lib/gradePracticalAnswer.js tests/gradePracticalAnswer.test.js
git commit -m "feat(practical): gradePracticalAnswer 모듈 추출 + reasons 반환"
```

---

## Task 6: Grading P1 버그 수정

**Files:**
- Modify: `app/practical/[sessionId]/_lib/gradePracticalAnswer.js`
- Modify: `tests/gradePracticalAnswer.test.js`

- [ ] **Step 1: P1 #4 — `parseLabeledMultiBlankValuesByKnownLabels` 라벨 경계 보강 (실패 테스트)**

```js
describe('P1: multi_blank label boundary', () => {
  it('does not confuse 가 with 가격', () => {
    const r = gradePracticalAnswer({
      userAnswer: '가: 가격 나: 수량',
      correctAnswer: '가: 가격 나: 수량',
      problem: { input_type: 'multi_blank', accepted_answers: [], input_labels: ['가', '나'] },
    });
    expect(r.matched).toBe(true);
  });
});
```

기존 `parseLabeledMultiBlankValuesByKnownLabels`의 `text.indexOf(label)`을 정규식 `new RegExp('(?:^|[^가-힣A-Za-z0-9])(' + escape(label) + ')\\s*[:\\-]\\s*', 'g')` 기반으로 교체.

`escape`는 함수 내부에 추가:
```js
function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
```

Run test, 통과 확인.

- [ ] **Step 2: P1 #5 — `getSequenceMeta` ordered 모드 markers=0 대응 (실패 테스트)**

```js
describe('P1: ordered_sequence markers fallback', () => {
  it('derives count from correct answer tokens when examples have no markers', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'ㄱ, ㄴ',
      correctAnswer: 'ㄱ, ㄴ',
      problem: { input_type: 'ordered_sequence', accepted_answers: [], examples: '' },
    });
    expect(r.matched).toBe(true);
  });
});
```

`getSequenceMeta`의 `count` 계산부에 `explicitInputLabels.length || markers.length || tokensFromAnswer(answerText).length || 2` 로 fallback 추가.

```js
function tokensFromAnswer(text) {
  return String(text || '').split(/[,\s→\-]+/).filter(Boolean);
}
```

- [ ] **Step 3: P1 #6 — `splitMultiBlankDraft` 다문자 한글 라벨 파싱 (실패 테스트 + fix)**

```js
it('parses labels without surrounding whitespace (카디널리티:4)', () => {
  const r = gradePracticalAnswer({
    userAnswer: '차수:3,카디널리티:4',
    correctAnswer: '차수: 3 카디널리티: 4',
    problem: { input_type: 'multi_blank', accepted_answers: [], input_labels: ['차수', '카디널리티'] },
  });
  expect(r.matched).toBe(true);
});
```

`splitMultiBlankDraft`에서 labels 배열을 길이 내림차순 정렬 후 alternation. escape 적용. colon/dash/쉼표 기준 분리.

- [ ] **Step 4: P1 #8 — `buildAcceptedPracticalAnswers` paren 분할 SQL 서브쿼리 방어**

```js
it('does not split SELECT subqueries into accepted alternatives', () => {
  const accepted = /* ... 내부 함수이므로 gradePracticalAnswer로 우회 테스트 */;
  const r = gradePracticalAnswer({
    userAnswer: 'SELECT * FROM (SELECT id FROM t)',
    correctAnswer: 'SELECT * FROM (SELECT id FROM t)',
    problem: { input_type: 'textarea', accepted_answers: [], examples: '', question_text: '' },
  });
  expect(r.matched).toBe(true);
  expect(r.reasons).toContain('exact');
});
```

`buildAcceptedPracticalAnswers`의 paren-분리 로직에서 `/^([^()]+)\(([^()]+)\)\s*$/` 로 **anchored + no-nested** 제한. SQL 서브쿼리는 중첩/다중 괄호이므로 매칭 안 됨.

- [ ] **Step 5: 모든 테스트 통과 확인 + Commit**

Run: `npm test`
Expected: all passed.

```bash
git add app/practical/[sessionId]/_lib/gradePracticalAnswer.js tests/gradePracticalAnswer.test.js
git commit -m "fix(practical): 채점 모듈 라벨 경계·paren·시퀀스 폴백 버그 수정"
```

---

## Task 7: `gradePracticalAnswer` — fieldResults + diff 확장

**Files:**
- Modify: `app/practical/[sessionId]/_lib/gradePracticalAnswer.js`
- Modify: `tests/gradePracticalAnswer.test.js`

- [ ] **Step 1: fieldResults 테스트 작성**

```js
describe('gradePracticalAnswer - fieldResults', () => {
  it('produces per-label results for multi_blank', () => {
    const r = gradePracticalAnswer({
      userAnswer: '① 3 ② 5',
      correctAnswer: '① 3 ② 4',
      problem: { input_type: 'multi_blank', accepted_answers: [], input_labels: ['①', '②'] },
    });
    expect(r.matched).toBe(false);
    expect(r.fieldResults).toHaveLength(2);
    expect(r.fieldResults[0]).toMatchObject({ label: '①', matched: true });
    expect(r.fieldResults[1]).toMatchObject({ label: '②', matched: false });
  });

  it('produces per-slot results for ordered_sequence', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'ㄱ, ㄷ, ㄴ',
      correctAnswer: 'ㄱ, ㄴ, ㄷ',
      problem: { input_type: 'ordered_sequence', accepted_answers: [] },
    });
    expect(r.fieldResults).toHaveLength(3);
    expect(r.fieldResults[0].matched).toBe(true);
    expect(r.fieldResults[1].matched).toBe(false);
    expect(r.fieldResults[2].matched).toBe(false);
  });

  it('includes diff for single', () => {
    const r = gradePracticalAnswer({
      userAnswer: 'HTTPS',
      correctAnswer: 'HTTP',
      problem: { input_type: 'single', accepted_answers: [] },
    });
    expect(r.diff).toBeDefined();
    expect(r.diff.segments.some((s) => s.type !== 'equal')).toBe(true);
  });
});
```

- [ ] **Step 2: 구현 — fieldResults 계산**

`gradePracticalAnswer` 내부, final return 직전에:

```js
import { computeDiff } from './computeDiff';

function computeFieldResults(userAnswer, correctAnswer, problem) {
  const inputType = String(problem?.input_type || '');
  if (inputType === 'multi_blank') {
    const labels = Array.isArray(problem?.input_labels) && problem.input_labels.length
      ? problem.input_labels
      : getMultiBlankMeta(problem, correctAnswer)?.labels || [];
    if (!labels.length) return undefined;
    const userMap = parseLabeledMultiBlankValuesByKnownLabels(String(userAnswer || ''), labels) || {};
    const correctMap = parseLabeledMultiBlankValuesByKnownLabels(String(correctAnswer || ''), labels) || {};
    return labels.map((label) => {
      const u = String(userMap[label] ?? '');
      const c = String(correctMap[label] ?? '');
      const sub = matchWithReasons(u, c, { input_type: 'single', accepted_answers: [] });
      return { label, userValue: u, correctValue: c, matched: sub.matched, reasons: sub.reasons };
    });
  }
  if (inputType === 'ordered_sequence') {
    const userTokens = normalizeSequenceLikeAnswer(String(userAnswer || '')).split(',').filter(Boolean);
    const correctTokens = normalizeSequenceLikeAnswer(String(correctAnswer || '')).split(',').filter(Boolean);
    const count = Math.max(userTokens.length, correctTokens.length);
    return Array.from({ length: count }).map((_, idx) => {
      const u = userTokens[idx] || '';
      const c = correctTokens[idx] || '';
      return { label: String(idx + 1), userValue: u, correctValue: c, matched: u === c && !!u, reasons: u === c && !!u ? ['exact'] : [] };
    });
  }
  return undefined;
}

function computeMaybeDiff(userAnswer, correctAnswer, inputType) {
  if (inputType !== 'single' && inputType !== 'textarea') return undefined;
  return computeDiff(String(userAnswer ?? ''), String(correctAnswer ?? ''));
}
```

그리고 `gradePracticalAnswer` 본체를:

```js
export function gradePracticalAnswer({ userAnswer, correctAnswer, problem }) {
  const base = matchWithReasons(userAnswer, correctAnswer, problem);
  const inputType = String(problem?.input_type || 'single');
  const fieldResults = computeFieldResults(userAnswer, correctAnswer, problem);
  const diff = computeMaybeDiff(userAnswer, correctAnswer, inputType);
  return { ...base, fieldResults, diff };
}
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `npm test`
Expected: all passed.

- [ ] **Step 4: Commit**

```bash
git add app/practical/[sessionId]/_lib/gradePracticalAnswer.js tests/gradePracticalAnswer.test.js
git commit -m "feat(practical): gradePracticalAnswer fieldResults/diff 확장"
```

---

## Task 8: Supabase hint override fetch 헬퍼

**Files:**
- Create: `app/practical/[sessionId]/_lib/fetchHintOverrides.js`

- [ ] **Step 1: 헬퍼 구현 (기존 `analyticsStore` REST 패턴 따름)**

```js
// app/practical/[sessionId]/_lib/fetchHintOverrides.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = process.env.SUPABASE_HINT_OVERRIDES_TABLE || 'practical_hint_overrides';

function hasConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function headers() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

function restUrl(path = '') {
  return `${SUPABASE_URL}/rest/v1/${TABLE}${path}`;
}

/** @returns {Promise<Map<number, string>>} */
export async function fetchHintOverrides(sessionIds) {
  if (!hasConfig()) return new Map();
  const ids = Array.isArray(sessionIds) ? sessionIds.filter(Boolean) : [sessionIds].filter(Boolean);
  if (!ids.length) return new Map();
  const inClause = ids.map((s) => `"${s}"`).join(',');
  const url = `${restUrl()}?session_id=in.(${inClause})&select=session_id,problem_number,hint_text`;
  try {
    const res = await fetch(url, { headers: headers(), cache: 'no-store' });
    if (!res.ok) return new Map();
    const rows = await res.json();
    const map = new Map();
    for (const row of rows) {
      map.set(`${row.session_id}:${row.problem_number}`, row.hint_text);
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function upsertHintOverride({ sessionId, problemNumber, hintText, updatedBy }) {
  if (!hasConfig()) throw new Error('Supabase not configured');
  const url = `${restUrl()}?on_conflict=session_id,problem_number`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([{ session_id: sessionId, problem_number: problemNumber, hint_text: hintText, updated_by: updatedBy, updated_at: new Date().toISOString() }]),
  });
  if (!res.ok) throw new Error(`upsert failed: ${res.status}`);
  return res.json();
}

export async function deleteHintOverride({ sessionId, problemNumber }) {
  if (!hasConfig()) throw new Error('Supabase not configured');
  const url = `${restUrl()}?session_id=eq.${encodeURIComponent(sessionId)}&problem_number=eq.${problemNumber}`;
  const res = await fetch(url, { method: 'DELETE', headers: headers() });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
  return true;
}

export async function listHintOverrides(sessionId) {
  if (!hasConfig()) return [];
  const where = sessionId ? `?session_id=eq.${encodeURIComponent(sessionId)}` : '';
  const url = `${restUrl()}${where}${where ? '&' : '?'}select=session_id,problem_number,hint_text,updated_at,updated_by&order=updated_at.desc&limit=500`;
  try {
    const res = await fetch(url, { headers: headers(), cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/practical/[sessionId]/_lib/fetchHintOverrides.js
git commit -m "feat(practical): Supabase hint override fetch 헬퍼 추가"
```

---

## Task 9: `practicalData.js` — override 병합

**Files:**
- Modify: `app/practical/[sessionId]/_lib/practicalData.js`

- [ ] **Step 1: 현재 구조 확인**

Read `app/practical/[sessionId]/_lib/practicalData.js` 전체. `loadPracticalQuizData(sessionId)` 시그니처와 반환 `{ problems, answersMap, commentsMap }` 형태 파악.

- [ ] **Step 2: 병합 로직 추가**

`loadPracticalQuizData` 말미에 아래 적용:

```js
import { fetchHintOverrides } from './fetchHintOverrides';

// 합성 세션 여부
const SYNTHETIC_SESSIONS = new Set(['random', '100', 'high-wrong', 'high-unknown', 'my-wrong', 'my-unknown', 'random22']);

export async function loadPracticalQuizData(sessionId) {
  // ... 기존 로직으로 problems, answersMap, commentsMap 생성 ...

  const isSynthetic = SYNTHETIC_SESSIONS.has(String(sessionId));
  // 합성 세션이면 각 문제의 source_session_id를 모아 한 번에 조회
  const lookupIds = isSynthetic
    ? Array.from(new Set(problems.map((p) => p.source_session_id).filter(Boolean)))
    : [String(sessionId)];
  const overrides = await fetchHintOverrides(lookupIds);

  const mergedProblems = problems.map((p) => {
    const sid = isSynthetic ? (p.source_session_id || '') : String(sessionId);
    const pnum = isSynthetic ? (p.source_problem_number || p.problem_number) : p.problem_number;
    const override = overrides.get(`${sid}:${pnum}`);
    return {
      ...p,
      answer_format_hint: override ?? p.answer_format_hint ?? null,
      hint_source: override ? 'override' : (p.answer_format_hint ? 'dataset' : null),
    };
  });

  return { problems: mergedProblems, answersMap, commentsMap };
}
```

- [ ] **Step 3: dev 서버 smoke (Supabase 미설정 환경도 정상 — `fetchHintOverrides`가 빈 Map 반환)**

Run: `npm run dev`, 실기 세션 열어 에러 없음 확인. Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add app/practical/[sessionId]/_lib/practicalData.js
git commit -m "feat(practical): 문제 로드 시 hint override 병합"
```

---

## Task 10: `AnswerHint` 컴포넌트

**Files:**
- Create: `app/practical/[sessionId]/components/AnswerHint.js`

- [ ] **Step 1: 구현**

```jsx
// app/practical/[sessionId]/components/AnswerHint.js
'use client';

import { inferAnswerFormat } from '../_lib/inferAnswerFormat';

export default function AnswerHint({ problem, correctAnswer }) {
  const explicit = problem?.answer_format_hint;
  const source = problem?.hint_source;
  const text = explicit || inferAnswerFormat(problem, correctAnswer);
  if (!text) return null;

  const isAuto = !explicit;
  const sourceLabel = isAuto ? '자동 추론' : source === 'override' ? '관리자 힌트' : '기본 힌트';

  return (
    <div className="mb-2 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
      <span aria-hidden className="text-base leading-none">💡</span>
      <div className="flex-1">
        <div>{text}</div>
      </div>
      {isAuto ? (
        <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {sourceLabel}
        </span>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: PracticalQuiz.js에 삽입**

`app/practical/[sessionId]/PracticalQuiz.js` line 3225 근처 (답안 입력 label 바로 아래)를 찾아:

```jsx
<label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">답안 입력</label>
<AnswerHint problem={currentProblem} correctAnswer={correctAnswer} />
```

import 추가 (파일 상단):
```js
import AnswerHint from './components/AnswerHint';
```

- [ ] **Step 3: dev 수동 확인**

Run: `npm run dev`, 실기 세션 진입 후 첫 문항에서 💡 힌트 박스 보임을 확인. Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add app/practical/[sessionId]/components/AnswerHint.js app/practical/[sessionId]/PracticalQuiz.js
git commit -m "feat(practical): 답안 입력 힌트 컴포넌트 추가"
```

---

## Task 11: `ResultFeedback` 컴포넌트 — 기본 구조 + single/textarea diff

**Files:**
- Create: `app/practical/[sessionId]/components/ResultFeedback.js`

- [ ] **Step 1: 기본 구조 + 판정 헤더 + reasons 뱃지**

```jsx
// app/practical/[sessionId]/components/ResultFeedback.js
'use client';

const REASON_LABELS = {
  exact: '완전 일치',
  case_insensitive: '대소문자 무관 인정',
  whitespace_ignored: '공백 무시 인정',
  punctuation_ignored: '구두점 무시 인정',
  korean_english_pair: '한/영 동의어 인정',
  label_normalized: '라벨 형식 정규화',
  accepted_alternative: '허용 표현 인정',
  order_independent: '순서 무시 인정',
};

function DiffText({ segments }) {
  if (!segments) return null;
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === 'equal') return <span key={i}>{seg.text}</span>;
        if (seg.type === 'removed') return <span key={i} className="bg-rose-100 text-rose-800 line-through dark:bg-rose-900/40 dark:text-rose-200">{seg.text}</span>;
        return <span key={i} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">{seg.text}</span>;
      })}
    </div>
  );
}

export default function ResultFeedback({ grade, inputType }) {
  if (!grade) return null;
  const matched = grade.matched;
  const reasons = (grade.reasons || []).filter((r) => r !== 'exact' || (grade.reasons || []).length > 1);
  const showReasons = matched && reasons.length > 0 && !(reasons.length === 1 && reasons[0] === 'exact');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`text-base font-bold ${matched ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {matched ? '✓ 정답입니다' : '✗ 오답입니다'}
        </span>
        {showReasons ? reasons.map((r) => (
          <span key={r} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
            {REASON_LABELS[r] || r}
          </span>
        )) : null}
      </div>

      {(inputType === 'single' || inputType === 'textarea') && grade.diff ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">내 답</div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
              <DiffText segments={grade.diff.segments.filter((s) => s.type !== 'added')} />
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">정답</div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
              <DiffText segments={grade.diff.segments.filter((s) => s.type !== 'removed')} />
            </div>
          </div>
        </div>
      ) : null}

      {grade.fieldResults && (inputType === 'multi_blank' || inputType === 'ordered_sequence') ? (
        <div className="mt-1 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">{inputType === 'ordered_sequence' ? '순서' : '라벨'}</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">내 답</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">정답</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">판정</th>
              </tr>
            </thead>
            <tbody>
              {grade.fieldResults.map((f, i) => (
                <tr key={i} className={f.matched ? '' : 'bg-rose-50/60 dark:bg-rose-900/10'}>
                  <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{f.label}</td>
                  <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{f.userValue || <span className="text-slate-400">(빈칸)</span>}</td>
                  <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{f.correctValue || <span className="text-slate-400">-</span>}</td>
                  <td className="px-3 py-2 text-center">{f.matched ? <span className="text-emerald-600">✓</span> : <span className="text-rose-600">✗</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Commit (해설 영역은 기존 로직 유지 — 아래 Task에서 연결)**

```bash
git add app/practical/[sessionId]/components/ResultFeedback.js
git commit -m "feat(practical): ResultFeedback 컴포넌트 추가 (판정/reasons/diff/fieldResults)"
```

---

## Task 12: PracticalQuiz.js에서 ResultFeedback 연결

**Files:**
- Modify: `app/practical/[sessionId]/PracticalQuiz.js`

- [ ] **Step 1: import 및 grade 계산**

파일 상단에 추가:
```js
import { gradePracticalAnswer } from './_lib/gradePracticalAnswer';
import ResultFeedback from './components/ResultFeedback';
```

현재 정답/오답 블록이 렌더되는 위치(파일 내 `isChecked`·`isCorrect` 관련 블록)를 찾고, `gradePracticalAnswer` 호출 결과를 컴포넌트에 전달:

```jsx
{isChecked ? (
  <ResultFeedback
    grade={gradePracticalAnswer({
      userAnswer: selectedAnswer,
      correctAnswer,
      problem: currentProblem,
    })}
    inputType={practicalInputType}
  />
) : null}
```

**기존 "정답입니다!/오답입니다!" 텍스트 블록은 유지** (이중 표시 방지를 위해 제거). 해설 블록(`showExplanationWhenCorrect`/`Incorrect`)은 `ResultFeedback` 아래에 그대로 둔다.

- [ ] **Step 2: dev 확인**

Run: `npm run dev`.
- single 문항에서 오답 입력 → diff 표시 확인
- multi_blank 문항에서 부분 오답 입력 → per-field 표 확인
- 정답 시 뱃지 숨겨짐 확인

Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add app/practical/[sessionId]/PracticalQuiz.js
git commit -m "feat(practical): ResultFeedback 연결 + 기존 정오 텍스트 통합"
```

---

## Task 13: 공용 GET API `/api/practical-hints`

**Files:**
- Create: `app/api/practical-hints/route.js`

- [ ] **Step 1: 라우트 구현**

```js
// app/api/practical-hints/route.js
import { NextResponse } from 'next/server';
import { listHintOverrides } from '@/app/practical/[sessionId]/_lib/fetchHintOverrides';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ hints: {} });
  const rows = await listHintOverrides(sessionId);
  const hints = {};
  for (const r of rows) {
    hints[r.problem_number] = r.hint_text;
  }
  return NextResponse.json({ hints });
}
```

- [ ] **Step 2: smoke — Supabase 미설정 환경에서 `{ hints: {} }` 정상 반환**

Run: `npm run dev`, `curl 'http://localhost:3000/api/practical-hints?sessionId=2025-first'` → `{"hints":{}}`. Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add app/api/practical-hints/route.js
git commit -m "feat: 공용 practical-hints GET 라우트"
```

---

## Task 14: 관리자 PUT/DELETE API

**Files:**
- Create: `app/api/admin/practical-hints/route.js`

- [ ] **Step 1: 라우트 구현 (가드 포함)**

```js
// app/api/admin/practical-hints/route.js
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import {
  upsertHintOverride,
  deleteHintOverride,
  listHintOverrides,
} from '@/app/practical/[sessionId]/_lib/fetchHintOverrides';
import { PRACTICAL_SESSION_CONFIG } from '@/app/practical/_lib/practicalData';

const HINT_MAX_LEN = 200;

function validSessionId(sessionId) {
  return Object.prototype.hasOwnProperty.call(PRACTICAL_SESSION_CONFIG, String(sessionId));
}

export async function GET(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId') || '';
  const rows = await listHintOverrides(sessionId);
  return NextResponse.json({ rows });
}

export async function PUT(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const sessionId = String(body?.sessionId || '');
  const problemNumber = Number(body?.problemNumber);
  const hintText = String(body?.hintText || '').trim();
  if (!validSessionId(sessionId)) return NextResponse.json({ error: 'invalid sessionId' }, { status: 400 });
  if (!Number.isInteger(problemNumber) || problemNumber <= 0) return NextResponse.json({ error: 'invalid problemNumber' }, { status: 400 });
  if (!hintText || hintText.length > HINT_MAX_LEN) return NextResponse.json({ error: 'invalid hintText' }, { status: 400 });
  await upsertHintOverride({
    sessionId,
    problemNumber,
    hintText,
    updatedBy: String(session?.user?.email || ''),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const sessionId = String(body?.sessionId || '');
  const problemNumber = Number(body?.problemNumber);
  if (!validSessionId(sessionId)) return NextResponse.json({ error: 'invalid sessionId' }, { status: 400 });
  if (!Number.isInteger(problemNumber) || problemNumber <= 0) return NextResponse.json({ error: 'invalid problemNumber' }, { status: 400 });
  await deleteHintOverride({ sessionId, problemNumber });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/practical-hints/route.js
git commit -m "feat(admin): practical-hints PUT/DELETE/GET 가드 라우트"
```

---

## Task 15: 관리자 UI — 리스트

**Files:**
- Create: `app/admin/practical-hints/page.js`
- Create: `app/admin/practical-hints/PracticalHintsClient.js`

- [ ] **Step 1: 서버 페이지 + 가드**

```jsx
// app/admin/practical-hints/page.js
import { getAdminSession } from '@/lib/adminAccess';
import { redirect } from 'next/navigation';
import PracticalHintsClient from './PracticalHintsClient';
import { PRACTICAL_SESSION_CONFIG } from '@/app/practical/_lib/practicalData';

export default async function Page() {
  const session = await getAdminSession();
  if (!session) redirect('/');
  const sessionIds = Object.keys(PRACTICAL_SESSION_CONFIG);
  return <PracticalHintsClient sessionIds={sessionIds} />;
}
```

- [ ] **Step 2: 클라이언트 컴포넌트 — 필터 + 리스트**

```jsx
// app/admin/practical-hints/PracticalHintsClient.js
'use client';

import { useEffect, useState } from 'react';

export default function PracticalHintsClient({ sessionIds }) {
  const [sessionId, setSessionId] = useState(sessionIds[0] || '');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async (sid) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/practical-hints?sessionId=${encodeURIComponent(sid)}`);
      const data = await res.json();
      setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (sessionId) load(sessionId); }, [sessionId]);

  const onSave = async ({ problemNumber, hintText }) => {
    await fetch('/api/admin/practical-hints', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, problemNumber, hintText }),
    });
    setEditing(null);
    load(sessionId);
  };

  const onDelete = async (problemNumber) => {
    if (!window.confirm('이 override를 삭제하면 자동 추론 또는 원본 힌트로 돌아갑니다. 계속?')) return;
    await fetch('/api/admin/practical-hints', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, problemNumber }),
    });
    load(sessionId);
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-xl font-bold">실기 힌트 override</h1>
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm font-semibold">회차</label>
        <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="rounded border px-2 py-1 text-sm">
          {sessionIds.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div>불러오는 중...</div> : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-3 py-2 text-left">번호</th>
              <th className="px-3 py-2 text-left">힌트</th>
              <th className="px-3 py-2 text-left">수정자</th>
              <th className="px-3 py-2 text-left">수정 시각</th>
              <th className="px-3 py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-500">저장된 override 없음</td></tr>
            ) : rows.map((r) => (
              <tr key={r.problem_number} className="border-b">
                <td className="px-3 py-2 font-mono">{r.problem_number}</td>
                <td className="px-3 py-2">{r.hint_text}</td>
                <td className="px-3 py-2 text-slate-500">{r.updated_by || '-'}</td>
                <td className="px-3 py-2 text-slate-500">{new Date(r.updated_at).toLocaleString('ko-KR')}</td>
                <td className="px-3 py-2">
                  <button onClick={() => setEditing(r)} className="mr-2 rounded border px-2 py-1 text-xs">수정</button>
                  <button onClick={() => onDelete(r.problem_number)} className="rounded border px-2 py-1 text-xs text-rose-600">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 rounded border border-slate-200 p-3 text-sm">
        <div className="mb-2 font-semibold">새 override 추가</div>
        <NewOverrideForm onSave={onSave} />
      </div>

      {editing ? (
        <EditModal row={editing} onCancel={() => setEditing(null)} onSave={onSave} />
      ) : null}
    </div>
  );
}

function NewOverrideForm({ onSave }) {
  const [problemNumber, setProblemNumber] = useState('');
  const [hintText, setHintText] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave({ problemNumber: Number(problemNumber), hintText }); setProblemNumber(''); setHintText(''); }}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="number" min={1} value={problemNumber} onChange={(e) => setProblemNumber(e.target.value)} placeholder="번호" className="w-20 rounded border px-2 py-1" required />
      <input type="text" maxLength={200} value={hintText} onChange={(e) => setHintText(e.target.value)} placeholder="힌트 텍스트" className="flex-1 rounded border px-2 py-1" required />
      <button type="submit" className="rounded bg-slate-800 px-3 py-1 text-white">저장</button>
    </form>
  );
}

function EditModal({ row, onCancel, onSave }) {
  const [hintText, setHintText] = useState(row.hint_text);
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-4">
        <div className="mb-2 font-semibold">문항 {row.problem_number} 수정</div>
        <textarea value={hintText} onChange={(e) => setHintText(e.target.value)} maxLength={200} rows={4} className="w-full rounded border p-2" />
        <div className="mt-2 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded border px-3 py-1">취소</button>
          <button onClick={() => onSave({ problemNumber: row.problem_number, hintText })} className="rounded bg-slate-800 px-3 py-1 text-white">저장</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: dev 확인**

Run: `npm run dev`.
- `/admin/practical-hints` 접속 → 관리자가 아니면 `/`로 redirect
- 관리자 로그인 상태에서 접속 → 리스트 조회 정상 (비어있어도 "override 없음" 표시)

Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add app/admin/practical-hints/page.js app/admin/practical-hints/PracticalHintsClient.js
git commit -m "feat(admin): 실기 힌트 override 관리 UI"
```

---

## Task 16: 관리자 네비 링크 추가

**Files:**
- Modify: 기존 admin layout/nav 파일

- [ ] **Step 1: admin nav 탐색**

```bash
grep -r "admin" /Users/bobs/Desktop/bobs_project/jchsanGi/app/admin --include="*.js" -l | head
```
`/admin` 루트 페이지 또는 layout에 네비 링크 있는 곳에 "실기 힌트" 링크 추가. 기존 탭 톤 그대로.

```jsx
<Link href="/admin/practical-hints" className="...">실기 힌트</Link>
```

- [ ] **Step 2: dev 확인**

Run: `npm run dev`, `/admin`에서 "실기 힌트" 링크 클릭 → 페이지 이동. Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add app/admin
git commit -m "feat(admin): 실기 힌트 탭 네비 링크 추가"
```

---

## Task 17: 수동 QA 체크 + 최종 커밋

**Files:** 없음 (수동 검증)

- [ ] **Step 1: 수동 QA 시나리오**

회귀 확인 (기존 기능):
- [ ] 객관식 필기 세션 1회 풀이 정상 (PracticalQuiz와 별개지만 공통 컴포넌트 영향 확인)
- [ ] 실기 2025-first 세션 진입 → 16문항 풀이 → 최종 결과 화면 정상

신규 기능:
- [ ] single 문항(예: 1번 HTTP) — AnswerHint "자동 추론 · 영문 대문자 4글자" 표시 / 오답 제출 시 diff 글자 단위 하이라이트
- [ ] multi_blank 문항(예: 3번 Degree/Cardinality) — AnswerHint 표시 / 부분 오답 시 per-label ✓/✗ 표
- [ ] ordered_sequence 문항 존재 시 — 슬롯별 판정 표 정상
- [ ] unordered_symbol_set 문항 — 판정 뱃지 "순서 무시 인정" 표시
- [ ] textarea 문항(Java 실행 결과 등) — diff 표시

관리자:
- [ ] `/admin/practical-hints` 진입 → 회차 선택 → 새 override 저장 → 즉시 해당 문항 풀이로 이동하면 힌트 반영 (SSR 캐시 영향 시 강력 새로고침 필요)
- [ ] override 수정 / 삭제 → 원본 힌트 또는 자동 추론으로 폴백

모바일:
- [ ] iPhone safari 또는 chrome devtools mobile 뷰에서 ResultFeedback 표가 가로 스크롤 없이 표시

- [ ] **Step 2: 테스트 전체 실행 + lint**

```bash
npm test
npm run lint
```
Expected: 둘 다 통과.

- [ ] **Step 3: Supabase 테이블 실제 생성 체크리스트**

README 또는 배포 메모에 다음 항목 추가:
- Supabase SQL editor에서 `docs/supabase/practical_hint_overrides.sql` 실행
- 환경변수 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 Vercel 프로덕션에 설정되어 있음을 확인

- [ ] **Step 4: 브랜치 푸시 (선택)**

```bash
git push -u origin feat/practical-ux-revamp
```

---

## Done 체크리스트

- [ ] P0 버그 2건 수정 완료
- [ ] vitest 테스트 러너 도입
- [ ] 채점 모듈 분리 완료 + 테스트 그린
- [ ] P1 버그 4건 수정 + 테스트
- [ ] AnswerHint · ResultFeedback 표시
- [ ] Supabase 테이블 SQL 문서화
- [ ] 공용 GET + 관리자 PUT/DELETE 가드 통과
- [ ] 관리자 UI 리스트/수정/삭제 동작
- [ ] 수동 QA 체크리스트 통과
- [ ] `npm test` · `npm run lint` 통과

Phase 2(impeccable 패스)는 이 브랜치가 main에 머지된 후 별도 브랜치에서 진행.
