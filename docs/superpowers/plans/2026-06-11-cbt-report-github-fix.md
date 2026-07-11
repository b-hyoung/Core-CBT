# CBT 신고 자동 수정 (GitHub PR 반영) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** valid_fix 판정 시 n8n이 `repository_dispatch`를 발송하고, GitHub Action이 데이터셋 JSON을 수정해 PR을 자동 생성한다.

**Architecture:** n8n(판정·발송) / GitHub Action(수정·PR) 역할 분리(B안). 수정 로직은 순수 함수로 분리해 vitest로 검증. 자동 수정은 comment/hint/correct_answer_index 3종 필드만.

**Tech Stack:** Node 22 (.mjs), vitest(이미 설치됨), GitHub Actions, n8n instance-level MCP, Dify

**Spec:** `docs/superpowers/specs/2026-06-11-cbt-report-github-fix-design.md`

**전제 (이미 존재하는 것):**
- 프론트엔드 `sendToN8n` + `dataset_path` 전송: `app/api/analytics/event/route.js` (미커밋 상태)
- Dify 구축 가이드: `docs/dify/cbt-report-judge.md`
- PR 본문 템플릿 초안: `docs/github/pr-template-report-bot.md` (A안 기준이라 Action용으로 변환 필요)
- n8n "GitHub account" 자격증명, instance-level MCP 연결

**데이터셋 JSON 구조 (실측):**
- `comment*.json`: `[{ title, comments: [{ problem_number, comment }] }]`
- `hint*.json`: `[{ problem_number, hint_body }]` (평면 배열)
- `answer*.json`: `[{ title, answers: [{ problem_number, correct_answer_index, correct_answer_text }] }]`

**new_value 계약:**
- `comment` → 문자열 (새 해설)
- `hint` → 문자열 (새 힌트)
- `correct_answer_index` → 객체 `{ correct_answer_index: number, correct_answer_text: string }` (둘은 항상 같이 변경)

---

### Task 1: 수정 적용 순수 함수 (TDD)

**Files:**
- Create: `scripts/applyReportFix.lib.mjs`
- Test: `tests/applyReportFix.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/applyReportFix.test.js
import { describe, it, expect } from 'vitest';
import { applyFix, selectTargetFile } from '../scripts/applyReportFix.lib.mjs';

const commentDoc = [{ title: 't', comments: [{ problem_number: 7, comment: 'old' }] }];
const hintDoc = [{ problem_number: 7, hint_body: 'old hint' }];
const answerDoc = [{ title: 't', answers: [{ problem_number: 7, correct_answer_index: 0, correct_answer_text: 'A' }] }];

describe('applyFix', () => {
  it('comment 필드를 교체한다', () => {
    const out = applyFix(structuredClone(commentDoc), 'comment', 7, '새 해설');
    expect(out[0].comments[0].comment).toBe('새 해설');
  });

  it('hint_body 필드를 교체한다 (평면 배열)', () => {
    const out = applyFix(structuredClone(hintDoc), 'hint', 7, '새 힌트');
    expect(out[0].hint_body).toBe('새 힌트');
  });

  it('정답은 index와 text를 함께 교체한다', () => {
    const out = applyFix(structuredClone(answerDoc), 'correct_answer_index', 7,
      { correct_answer_index: 2, correct_answer_text: 'C' });
    expect(out[0].answers[0].correct_answer_index).toBe(2);
    expect(out[0].answers[0].correct_answer_text).toBe('C');
  });

  it('problem_number가 없으면 throw', () => {
    expect(() => applyFix(structuredClone(commentDoc), 'comment', 99, 'x')).toThrow(/not found/);
  });

  it('comment에 문자열이 아닌 값이 오면 throw', () => {
    expect(() => applyFix(structuredClone(commentDoc), 'comment', 7, { a: 1 })).toThrow(/string/);
  });

  it('정답 new_value에 index가 정수가 아니면 throw', () => {
    expect(() => applyFix(structuredClone(answerDoc), 'correct_answer_index', 7,
      { correct_answer_index: '2', correct_answer_text: 'C' })).toThrow(/integer/);
  });

  it('지원하지 않는 target_field면 throw', () => {
    expect(() => applyFix(structuredClone(commentDoc), 'question_text', 7, 'x')).toThrow(/unsupported/);
  });
});

describe('selectTargetFile', () => {
  it('problem_number를 포함한 파일 하나를 고른다', () => {
    const files = [
      { name: 'comment1.json', doc: commentDoc },
      { name: 'comment2.json', doc: [{ title: 't', comments: [{ problem_number: 80, comment: 'x' }] }] },
    ];
    expect(selectTargetFile(files, 'comment', 7)).toBe('comment1.json');
  });

  it('해당 문항을 포함한 파일이 없으면 throw', () => {
    expect(() => selectTargetFile([{ name: 'comment1.json', doc: commentDoc }], 'comment', 99))
      .toThrow(/no file contains/);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/applyReportFix.test.js`
Expected: FAIL — `Cannot find module '../scripts/applyReportFix.lib.mjs'`

- [ ] **Step 3: 최소 구현**

```js
// scripts/applyReportFix.lib.mjs
// CBT 신고 자동 수정: 데이터셋 JSON에서 problem_number 항목의 필드를 교체하는 순수 로직.
// I/O 없음 — Action 환경과 vitest에서 동일하게 동작해야 한다.

function findInNested(doc, listKey, problemNumber) {
  for (const block of doc) {
    const item = (block?.[listKey] ?? []).find((x) => x.problem_number === problemNumber);
    if (item) return item;
  }
  return null;
}

export function applyFix(doc, targetField, problemNumber, newValue) {
  if (targetField === 'comment') {
    if (typeof newValue !== 'string' || !newValue.trim()) throw new Error('comment new_value must be a non-empty string');
    const item = findInNested(doc, 'comments', problemNumber);
    if (!item) throw new Error(`problem_number ${problemNumber} not found in comments`);
    item.comment = newValue;
    return doc;
  }
  if (targetField === 'hint') {
    if (typeof newValue !== 'string' || !newValue.trim()) throw new Error('hint new_value must be a non-empty string');
    const item = doc.find((x) => x.problem_number === problemNumber);
    if (!item) throw new Error(`problem_number ${problemNumber} not found in hints`);
    item.hint_body = newValue;
    return doc;
  }
  if (targetField === 'correct_answer_index') {
    if (!Number.isInteger(newValue?.correct_answer_index) || newValue.correct_answer_index < 0) {
      throw new Error('correct_answer_index must be a non-negative integer');
    }
    if (typeof newValue?.correct_answer_text !== 'string' || !newValue.correct_answer_text.trim()) {
      throw new Error('correct_answer_text must be a non-empty string');
    }
    const item = findInNested(doc, 'answers', problemNumber);
    if (!item) throw new Error(`problem_number ${problemNumber} not found in answers`);
    item.correct_answer_index = newValue.correct_answer_index;
    item.correct_answer_text = newValue.correct_answer_text;
    return doc;
  }
  throw new Error(`unsupported target_field: ${targetField}`);
}

const FILE_PREFIX = { comment: 'comment', hint: 'hint', correct_answer_index: 'answer' };

function containsProblem(doc, targetField, problemNumber) {
  if (targetField === 'hint') return doc.some((x) => x.problem_number === problemNumber);
  const listKey = targetField === 'comment' ? 'comments' : 'answers';
  return findInNested(doc, listKey, problemNumber) !== null;
}

export function selectTargetFile(files, targetField, problemNumber) {
  const prefix = FILE_PREFIX[targetField];
  if (!prefix) throw new Error(`unsupported target_field: ${targetField}`);
  const matches = files
    .filter((f) => f.name.startsWith(prefix) && f.name.endsWith('.json'))
    .filter((f) => containsProblem(f.doc, targetField, problemNumber));
  if (matches.length === 0) throw new Error(`no file contains problem_number ${problemNumber} for ${targetField}`);
  if (matches.length > 1) throw new Error(`ambiguous: ${matches.map((f) => f.name).join(', ')}`);
  return matches[0].name;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/applyReportFix.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: 커밋**

```bash
git add scripts/applyReportFix.lib.mjs tests/applyReportFix.test.js
git commit -m "feat(report-fix): 데이터셋 JSON 필드 교체 순수 함수 + 테스트"
```

---

### Task 2: CLI 스크립트 (파일 I/O + payload 검증 + PR 본문 생성)

**Files:**
- Create: `scripts/apply-report-fix.mjs`

- [ ] **Step 1: 구현**

```js
// scripts/apply-report-fix.mjs
// 사용법: PAYLOAD='{"report_id":...}' node scripts/apply-report-fix.mjs
// repository_dispatch의 client_payload를 받아 대상 JSON을 수정하고 PR 본문을 생성한다.
// 검증 실패 시 아무 파일도 수정하지 않고 exit 1.
import fs from 'node:fs';
import path from 'node:path';
import { applyFix, selectTargetFile } from './applyReportFix.lib.mjs';

const payload = JSON.parse(process.env.PAYLOAD ?? 'null');
if (!payload) { console.error('PAYLOAD env is required'); process.exit(1); }

const { report_id, dataset_path, problem_number, target_field, new_value, reasoning, confidence } = payload;

// --- 검증 (커밋 전 전부 통과해야 함) ---
if (!report_id || typeof report_id !== 'string') fail('report_id is required');
if (!Number.isInteger(problem_number)) fail('problem_number must be an integer');
const normalized = path.posix.normalize(String(dataset_path ?? ''));
if (!normalized.startsWith('datasets/') || normalized.includes('..')) fail(`invalid dataset_path: ${dataset_path}`);
if (!fs.existsSync(normalized) || !fs.statSync(normalized).isDirectory()) fail(`dataset_path not found: ${normalized}`);

// --- 대상 파일 선택 + 수정 ---
const files = fs.readdirSync(normalized)
  .filter((name) => name.endsWith('.json'))
  .map((name) => ({ name, doc: JSON.parse(fs.readFileSync(path.join(normalized, name), 'utf8')) }));

const fileName = selectTargetFile(files, target_field, problem_number);
const doc = files.find((f) => f.name === fileName).doc;
applyFix(doc, target_field, problem_number, new_value);

const filePath = path.join(normalized, fileName);
fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + '\n');
console.log(`modified: ${filePath}`);

// --- PR 본문 생성 (Action의 gh pr create --body-file 에서 사용) ---
const prBody = `> :robot: 이 PR은 신고 처리 봇(cbt-report-handler)이 자동 생성했습니다. 반드시 사람이 리뷰 후 머지하세요.

## 신고 정보
- **report_id**: \`${report_id}\`
- **대상**: \`${normalized}\` / 문항 ${problem_number}

## Dify 판단
- **target_field**: \`${target_field}\`
- **confidence**: ${confidence ?? '-'}
- **근거**: ${reasoning || '-'}

## 변경 내용
- **파일**: \`${filePath}\`
- **변경 후 값**:
\`\`\`json
${JSON.stringify(new_value, null, 2)}
\`\`\`
`;
fs.writeFileSync(process.env.PR_BODY_PATH ?? '/tmp/pr-body.md', prBody);
console.log(`modified_file=${filePath}`);

function fail(msg) { console.error(`validation failed: ${msg}`); process.exit(1); }
```

- [ ] **Step 2: 로컬 검증 (실제 파일로, 커밋 없이)**

```bash
PAYLOAD='{"report_id":"local-test-1","dataset_path":"datasets/practicalIndustrial/2022-third","problem_number":3,"target_field":"comment","new_value":"로컬 테스트 해설입니다.","reasoning":"테스트","confidence":1}' \
PR_BODY_PATH=/tmp/pr-body.md node scripts/apply-report-fix.mjs
git diff --stat   # comment1.json 1개만 변경됐는지 확인
cat /tmp/pr-body.md
git checkout -- datasets/   # 원복
```

Expected: `modified: datasets/practicalIndustrial/2022-third/comment1.json`, diff에 해당 파일만 표시

- [ ] **Step 3: 잘못된 payload 거부 확인**

```bash
PAYLOAD='{"report_id":"x","dataset_path":"../etc","problem_number":3,"target_field":"comment","new_value":"y"}' node scripts/apply-report-fix.mjs; echo "exit=$?"
```

Expected: `validation failed: invalid dataset_path: ../etc`, `exit=1`, `git status` 깨끗함

- [ ] **Step 4: 커밋**

```bash
git add scripts/apply-report-fix.mjs
git commit -m "feat(report-fix): dispatch payload 적용 CLI + PR 본문 생성"
```

---

### Task 3: GitHub Action 워크플로우

**Files:**
- Create: `.github/workflows/cbt-report-fix.yml`

- [ ] **Step 1: 워크플로우 작성**

```yaml
name: CBT Report Fix
on:
  repository_dispatch:
    types: [cbt-report-fix]

permissions:
  contents: write
  pull-requests: write

concurrency:
  group: cbt-report-fix-${{ github.event.client_payload.report_id }}

jobs:
  apply-fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Apply fix
        env:
          PAYLOAD: ${{ toJson(github.event.client_payload) }}
          PR_BODY_PATH: /tmp/pr-body.md
        run: node scripts/apply-report-fix.mjs

      - name: Create PR
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REPORT_ID: ${{ github.event.client_payload.report_id }}
          TARGET_FIELD: ${{ github.event.client_payload.target_field }}
          PROBLEM_NUMBER: ${{ github.event.client_payload.problem_number }}
        run: |
          BRANCH="report-fix/${REPORT_ID}"
          git config user.name "cbt-report-bot"
          git config user.email "bot@users.noreply.github.com"
          git checkout -b "$BRANCH"
          git add datasets/
          git commit -m "fix(report): ${TARGET_FIELD} 수정 — 문항 ${PROBLEM_NUMBER} (report ${REPORT_ID})"
          git push -f origin "$BRANCH"
          gh pr create --base master --head "$BRANCH" \
            --title "fix(report): ${TARGET_FIELD} 수정 — 문항 ${PROBLEM_NUMBER}" \
            --body-file /tmp/pr-body.md \
            || echo "PR already exists for $BRANCH (updated by force-push)"
```

- [ ] **Step 2: 커밋 + 푸시** (Action은 master에 있어야 dispatch를 수신함)

```bash
git add .github/workflows/cbt-report-fix.yml
git commit -m "feat(report-fix): repository_dispatch 수신 GitHub Action"
git push origin master
```

- [ ] **Step 3: 수동 dispatch로 Action 단독 테스트**

```bash
gh api repos/b-hyoung/Core-CBT/dispatches \
  -f event_type=cbt-report-fix \
  -F 'client_payload[report_id]=manual-test-1' \
  -F 'client_payload[dataset_path]=datasets/practicalIndustrial/2022-third' \
  -F 'client_payload[problem_number]=3' \
  -F 'client_payload[target_field]=comment' \
  -F 'client_payload[new_value]=수동 dispatch 테스트 해설' \
  -F 'client_payload[reasoning]=Action 단독 테스트' \
  -F 'client_payload[confidence]=1'
gh run list --workflow cbt-report-fix.yml --limit 1   # 실행 확인
gh run watch                                           # 완료 대기
gh pr list --head report-fix/manual-test-1             # PR 생성 확인
```

Expected: Action success, PR 1건 생성 (comment1.json의 3번 문항 해설 변경 diff)

- [ ] **Step 4: 테스트 PR 정리**

```bash
gh pr close report-fix/manual-test-1 --delete-branch
```

---

### Task 4: 프론트엔드 기존 미커밋 구현 검증 + 커밋

**Files:**
- Modify(검증): `app/api/analytics/event/route.js` (미커밋 +68줄), `.env.example` (+6줄)
- 참조: `lib/reportEnrichment.js:124` (dataset_path 생성부)

- [ ] **Step 1: 미커밋 diff 검토**

Run: `git diff app/api/analytics/event/route.js .env.example`
확인 사항:
- `sendToN8n`이 `dataset_path`를 보냄 (현재 top-level — n8n에서 `body.dataset_path`로 참조하므로 위치 무관, 스펙의 `origin.dataset_path`와 다른 점만 인지)
- 시크릿 헤더 이름이 `X-Webhook-Secret`인지 (n8n Verify Secret은 `x-webhook-secret` 소문자 비교지만 HTTP 헤더는 대소문자 무관)
- `await fetch`가 신고 응답을 막지 않는지 (실패해도 신고 자체는 저장되어야 함 — try/catch 또는 fire-and-forget 확인. 없으면 `.catch(() => {})` 추가)

- [ ] **Step 2: dataset_path 형식 확인**

Run: `grep -n -B5 "dataset_path" lib/reportEnrichment.js | head -20`
Expected: `datasets/...`로 시작하는 저장소 상대 경로. 아니면 `datasets/` 프리픽스가 되도록 수정.

- [ ] **Step 3: 전체 테스트 + 커밋**

```bash
npm test
git add app/api/analytics/event/route.js .env.example
git commit -m "feat(report): n8n 신고 웹훅 전송 + dataset_path 포함"
```

- [ ] **Step 4: 배포 환경변수 확인 (사용자 작업)**

배포 환경(Railway 등)에 `N8N_REPORT_WEBHOOK_URL`, `N8N_REPORT_WEBHOOK_SECRET` 설정 필요. `.env.example` 참고.

---

### Task 5: n8n 워크플로우 수정 (instance-level MCP로 적용)

**대상:** `cbt-report-handler` (uRc4aH89U3lTTLT7)

- [ ] **Step 1: 최신 워크플로우 조회** — `get_workflow_details`로 현재 노드/연결 확인 (이전 조회 이후 변경 가능성)

- [ ] **Step 2: `update_workflow`로 노드 3개 추가 + 연결 변경**

추가 노드:

```json
[
  { "name": "Check Dry Run", "type": "n8n-nodes-base.if", "typeVersion": 2.2,
    "position": [1700, 540],
    "parameters": { "conditions": { "options": { "version": 2 }, "combinator": "and",
      "conditions": [{ "leftValue": "={{ $('Config').item.json.REPORT_DRY_RUN }}",
        "rightValue": true, "operator": { "type": "boolean", "operation": "true", "singleValue": true } }] } } },

  { "name": "GH: Dispatch Fix", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
    "position": [1920, 620],
    "parameters": {
      "method": "POST",
      "url": "=https://api.github.com/repos/{{ $('Config').item.json.GH_OWNER }}/{{ $('Config').item.json.GH_REPO }}/dispatches",
      "authentication": "predefinedCredentialType", "nodeCredentialType": "githubApi",
      "sendHeaders": true,
      "headerParameters": { "parameters": [{ "name": "Accept", "value": "application/vnd.github+json" }] },
      "sendBody": true, "specifyBody": "json",
      "jsonBody": "={{ ({ event_type: 'cbt-report-fix', client_payload: { report_id: $('Parse Dify').item.json.report_id, dataset_path: $('Report Webhook').item.json.body.dataset_path, problem_number: $('Report Webhook').item.json.body.origin.problem_number, target_field: $('Parse Dify').item.json.target_field, new_value: $('Parse Dify').item.json.new_value, reasoning: $('Parse Dify').item.json.reasoning, confidence: $('Parse Dify').item.json.confidence } }) }}" },
    "credentials": { "githubApi": { "id": "S02rPq2m4muGrbKS", "name": "GitHub account" } } },

  { "name": "Slack: PR Requested", "type": "n8n-nodes-base.slack", "typeVersion": 2.2,
    "position": [2140, 620],
    "parameters": { "select": "channel",
      "channelId": { "__rl": true, "mode": "name", "value": "={{ $('Config').item.json.SLACK_REPORT_CHANNEL }}" },
      "text": "=:hammer_and_wrench: *수정 PR 생성 요청됨*\n대상: {{ $('Report Webhook').item.json.body.dataset_path }} / 문항 {{ $('Report Webhook').item.json.body.origin.problem_number }}\n필드: {{ $('Parse Dify').item.json.target_field }}\nPR: https://github.com/{{ $('Config').item.json.GH_OWNER }}/{{ $('Config').item.json.GH_REPO }}/pulls",
      "otherOptions": { "thread_ts": { "replyValues": { "thread_ts": "={{ $('Parse Dify').item.json.slack_thread_ts }}" } } } }
]
```

연결 변경:
- 제거: `Route by Verdict[valid_fix]` → `Slack: Dry Run Notice`
- 추가: `Route by Verdict[valid_fix]` → `Check Dry Run`
- 추가: `Check Dry Run[true]` → `Slack: Dry Run Notice` (기존 노드 재사용)
- 추가: `Check Dry Run[false]` → `GH: Dispatch Fix` → `Slack: PR Requested` → `Respond OK`

기존 Slack 자격증명(`oYjynKknMSW20WcK`)을 Slack: PR Requested에 연결.

- [ ] **Step 3: `get_workflow_details`로 적용 결과 재확인** — 노드/연결이 의도대로인지

- [ ] **Step 4: `publish_workflow`로 게시** — `REPORT_DRY_RUN`은 아직 `true` 유지 (E2E 전까지 dispatch 안 나감)

- [ ] **Step 5: 드라이런 회귀 테스트** — 시크릿 포함 테스트 신고 발송 → 기존처럼 드라이런/무효 알림 동작 확인 (`search_executions`로 success 확인)

---

### Task 6: Dify 프롬프트 적용 + 출력 검증 (사용자 협업)

**참조:** `docs/dify/cbt-report-judge.md`

- [ ] **Step 1 (사용자):** Dify 앱이 가이드 문서와 일치하는지 확인 — 특히:
  - 출력 변수 5개(verdict/target_field/new_value/reasoning/confidence)가 End 노드에 매핑됐는지 (**현재 reasoning이 빈 값으로 나오는 원인 추정 지점**)
  - 프롬프트에 가중치 규칙 포함: "comment/hint/correct_answer_index 수정으로 해결되면 valid_fix, 문제 지문·보기 자체를 바꿔야 하면 needs_human"
  - `new_value` 계약: comment/hint는 문자열, correct_answer_index는 `{correct_answer_index, correct_answer_text}` 객체

- [ ] **Step 2: 무효 신고 테스트** — 기존 테스트 payload 재발송 → Slack 무효 알림에 **근거(reasoning)가 채워져 나오는지** 확인

- [ ] **Step 3: valid_fix 유도 테스트 (드라이런)** — 해설이 명백히 틀린 payload 발송:

```bash
curl -s -X POST "https://b-hyoung.app.n8n.cloud/webhook/cbt-report" \
  -H 'Content-Type: application/json' -H "x-webhook-secret: $SECRET" \
  -d '{"report_id":"dryrun-validfix-1",
       "dataset_path":"datasets/practicalIndustrial/2022-third",
       "origin":{"session_id":"2022-third","problem_number":3},
       "problem":{"question_text":"10진수 11을 2진수로 변환하면?","options":[],
                  "correct_answer_index":0,"correct_answer_text":"00001011",
                  "current_comment":"10진수 11은 2진수로 00001010이다."},
       "report":{"reason":"해설의 2진수 값이 정답과 다릅니다. 00001011이 맞습니다."},
       "reporter":{"email":"test@example.com"}}'
```

Expected: Slack에 ":white_check_mark: valid_fix 판단됨 (DRY RUN)" + target_field=`comment` + new_value에 교정된 해설

---

### Task 7: E2E 실전 전환

- [ ] **Step 1: `update_workflow`로 Config의 `REPORT_DRY_RUN`을 `false`로 변경 + `publish_workflow`**

- [ ] **Step 2: Task 6-Step 3과 동일 payload를 `report_id: "e2e-validfix-1"`로 발송**

- [ ] **Step 3: 파이프라인 추적**

```bash
gh run list --workflow cbt-report-fix.yml --limit 1   # Action 실행 확인
gh pr list --head report-fix/e2e-validfix-1           # PR 생성 확인
```

Expected: Slack "수정 PR 생성 요청됨" + Action success + PR diff가 comment1.json 3번 문항 해설만 변경

- [ ] **Step 4: 테스트 PR 정리 + 운영 상태 결정**

```bash
gh pr close report-fix/e2e-validfix-1 --delete-branch
```

`REPORT_DRY_RUN` 최종값을 사용자에게 확인 (실전 운영 시작이면 false 유지, 더 지켜보려면 true 복귀).

- [ ] **Step 5: 로컬 커밋 푸시**

```bash
git push origin master
```

---

## Self-Review 결과

- 스펙 커버리지: ①프론트(Task 4) ②Dify(Task 6) ③n8n(Task 5) ④Action+스크립트(Task 1-3) ⑤E2E(Task 7) — 전부 매핑됨
- 스펙과 차이: `dataset_path`가 스펙은 `origin.dataset_path`, 실제 기존 구현은 top-level `dataset_path` — 기존 구현을 따르고 n8n 표현식도 `body.dataset_path`로 통일함 (Task 5 jsonBody에 반영됨)
- 타입 일관성: `new_value` 계약(문자열/객체)이 lib 검증, Dify 가이드, 테스트에서 동일
