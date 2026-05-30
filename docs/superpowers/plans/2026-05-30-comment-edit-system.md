# 해설 수정 제안/승인 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 사이트에서 해설(comment)을 수정 제안하고, 관리자가 Discord 봇 + 사이트 큐에서 검토·승인·재수정·거부한 뒤 라운드 단위 GitHub PR로 묶어 머지하는 시스템 구축.

**Architecture:** Next.js 16 App Router + Supabase REST + Discord Application + GitHub REST API. 정적 JSON 해설 파일은 그대로 source of truth; 수정 흐름은 DB → PR → main 머지 → Vercel 재배포로 반영.

**Tech Stack:** Next.js 16 (App Router), NextAuth, Supabase REST (`fetch` 기반, 기존 패턴), Discord Interactions (ed25519 검증), GitHub REST API, Tailwind v4 (sky/slate 토큰), lucide-react 아이콘.

**Spec 참조:** `docs/superpowers/specs/2026-05-30-comment-edit-system-design.md`

**검증 방식:** 프로젝트에 테스트 프레임워크가 없으므로 각 태스크는 dev 서버 + `curl` + 브라우저로 수동 검증한다. 신규 의존성 없음.

---

## File Structure

### 신규 파일

| 파일 | 책임 |
|---|---|
| `lib/commentPath.js` | `(subject, sessionKey) → datasets 경로` 빌더 + 화이트리스트 검증 |
| `lib/commentEditStore.js` | Supabase REST CRUD (insert/get/update) |
| `lib/discordNotify.js` | Discord webhook 전송, 메시지 PATCH |
| `lib/discordVerify.js` | ed25519 서명 검증 (Web Crypto API) |
| `lib/githubPr.js` | GitHub REST 브랜치/파일/PR 생성 |
| `lib/problemUrlMap.js` | `(subject, sessionKey, problemNumber) → 사이트 URL` |
| `app/api/edits/route.js` | `POST` 제출 |
| `app/api/edits/[key]/route.js` | `GET` 문제별 contributors + 본인 pending |
| `app/api/admin/edits/route.js` | `GET` 큐 리스트 |
| `app/api/admin/edits/[id]/decide/route.js` | `POST` 승인/거부 (재수정 포함) |
| `app/api/admin/edits/[id]/mark-merged/route.js` | `POST` 머지 완료 처리 |
| `app/api/admin/edits/round/route.js` | `POST` 라운드 PR 생성 |
| `app/api/discord/interactions/route.js` | Discord interaction 핸들러 |
| `app/_components/CommentEditButton.js` | 진입 버튼 |
| `app/_components/CommentEditDialog.js` | 제안 모달 |
| `app/_components/CommentContributors.js` | 기여자 표시 라인 |
| `app/admin/edits/page.js` | server entry, admin 가드 |
| `app/admin/edits/AdminEditQueueClient.js` | 큐 UI (2-pane) |
| `docs/setup/comment-edits-schema.sql` | Supabase 콘솔에서 실행할 DDL |

### 수정 파일

| 파일 | 변경 |
|---|---|
| `lib/objectiveSessionData.server.js` | 해설 머지/contributors 노출 — 단, MVP에서 머지된 결과는 JSON 파일이 갱신되어 있으므로 추가 머지 로직 불필요. **contributors만** API에서 클라이언트가 추가 fetch (변경 최소화) |
| `app/test/[sessionId]/components/QuizInteractiveParts.js` 등 해설을 그리는 부분 | `<CommentEditButton>` + `<CommentContributors>` 삽입 (정확한 삽입 위치는 Task 9에서 grep으로 확정) |

---

## Environment Variables (사전 준비)

`.env.local`에 추가 — Task 시작 전 사용자가 직접 셋업:

```
# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/.../...
DISCORD_PUBLIC_KEY=<application public key>
DISCORD_BOT_TOKEN=<bot token>
DISCORD_APPLICATION_ID=<app id>

# GitHub
GITHUB_TOKEN=<repo write PAT>
GITHUB_REPO_OWNER=b-hyoung
GITHUB_REPO_NAME=Core-CBT
GITHUB_BASE_BRANCH=master

# Site
SITE_BASE_URL=http://localhost:3000
```

---

## Task 1: Supabase 스키마 작성 + 콘솔 실행

**Files:**
- Create: `docs/setup/comment-edits-schema.sql`

- [ ] **Step 1: SQL 파일 작성**

```sql
-- docs/setup/comment-edits-schema.sql

create table if not exists comment_edits (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  session_key text not null,
  problem_number int not null,
  original_comment text not null,
  proposed_comment text not null,
  final_comment text,
  editor_user_id text not null,
  editor_display_name text not null,
  is_anonymous boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'merged')),
  discord_message_id text,
  discord_channel_id text,
  admin_note text,
  pr_number int,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  merged_at timestamptz
);

create index if not exists comment_edits_problem_idx
  on comment_edits (subject, session_key, problem_number, status);

create index if not exists comment_edits_round_idx
  on comment_edits (status, pr_number)
  where status = 'approved' and pr_number is null;

create index if not exists comment_edits_ratelimit_idx
  on comment_edits (editor_user_id, subject, session_key, problem_number, created_at desc);

create table if not exists comment_contributors (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  session_key text not null,
  problem_number int not null,
  display_name text not null,
  is_anonymous boolean not null,
  edit_id uuid not null references comment_edits(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists comment_contributors_problem_idx
  on comment_contributors (subject, session_key, problem_number, created_at);
```

- [ ] **Step 2: 사용자에게 Supabase 콘솔 실행 안내**

사용자 액션 (자동화 불가):
1. Supabase Dashboard → SQL Editor 진입
2. 위 SQL 붙여넣고 Run
3. Table editor에서 두 테이블 존재 확인

- [ ] **Step 3: Commit**

```bash
git add docs/setup/comment-edits-schema.sql
git commit -m "feat(db): comment_edits / comment_contributors 스키마 추가"
```

---

## Task 2: `lib/commentPath.js` — path 빌더 + 화이트리스트

**Files:**
- Create: `lib/commentPath.js`

- [ ] **Step 1: 구현**

```js
// lib/commentPath.js
import fs from 'fs/promises';
import path from 'path';

const DATASETS_DIR = path.join(process.cwd(), 'datasets');

const ALLOWED_SUBJECT_PREFIXES = ['sqld', 'problem', 'pdfPacks'];

export function isAllowedSubject(subject) {
  const s = String(subject || '');
  if (!s) return false;
  return ALLOWED_SUBJECT_PREFIXES.some((p) =>
    p === 'problem' ? /^problem\d{4}$/.test(s) : s === p
  );
}

export async function isAllowedSessionKey(subject, sessionKey) {
  if (!isAllowedSubject(subject)) return false;
  const sk = String(sessionKey || '');
  if (!sk || sk.includes('..') || sk.includes('/') || sk.includes('\\')) return false;
  try {
    const dir = path.join(DATASETS_DIR, subject, sk);
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export function buildCommentPath(subject, sessionKey) {
  return `datasets/${subject}/${sessionKey}/comment1.json`;
}

export async function readCommentFromDisk(subject, sessionKey, problemNumber) {
  const fullPath = path.join(process.cwd(), buildCommentPath(subject, sessionKey));
  const raw = await fs.readFile(fullPath, 'utf8');
  const data = JSON.parse(raw);
  for (const section of data || []) {
    for (const c of section?.comments || []) {
      if (Number(c?.problem_number) === Number(problemNumber)) {
        return String(c?.comment ?? '');
      }
    }
  }
  return '';
}
```

- [ ] **Step 2: Verify (dev 서버 없이 node로)**

```bash
node -e "import('./lib/commentPath.js').then(m => m.readCommentFromDisk('sqld', '2025-first', 14).then(console.log))"
```

Expected output: 14번 해설 텍스트 (현재는 빈 문자열) 또는 빈 문자열.

```bash
node -e "import('./lib/commentPath.js').then(m => m.isAllowedSessionKey('sqld', '2025-first').then(console.log))"
```

Expected: `true`

```bash
node -e "import('./lib/commentPath.js').then(m => m.isAllowedSessionKey('sqld', '../etc').then(console.log))"
```

Expected: `false`

- [ ] **Step 3: Commit**

```bash
git add lib/commentPath.js
git commit -m "feat(lib): commentPath — 화이트리스트 검증 + 디스크 해설 조회"
```

---

## Task 3: `lib/commentEditStore.js` — Supabase CRUD

**Files:**
- Create: `lib/commentEditStore.js`

- [ ] **Step 1: 구현**

```js
// lib/commentEditStore.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDITS_TABLE = 'comment_edits';
const CONTRIB_TABLE = 'comment_contributors';

function hasConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function url(table) {
  return `${SUPABASE_URL}/rest/v1/${table}`;
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function toDb(edit) {
  return {
    subject: edit.subject,
    session_key: edit.sessionKey,
    problem_number: edit.problemNumber,
    original_comment: edit.originalComment,
    proposed_comment: edit.proposedComment,
    editor_user_id: edit.editorUserId,
    editor_display_name: edit.editorDisplayName,
    is_anonymous: Boolean(edit.isAnonymous),
  };
}

function fromDb(row) {
  return {
    id: row.id,
    subject: row.subject,
    sessionKey: row.session_key,
    problemNumber: row.problem_number,
    originalComment: row.original_comment,
    proposedComment: row.proposed_comment,
    finalComment: row.final_comment,
    editorUserId: row.editor_user_id,
    editorDisplayName: row.editor_display_name,
    isAnonymous: row.is_anonymous,
    status: row.status,
    discordMessageId: row.discord_message_id,
    discordChannelId: row.discord_channel_id,
    adminNote: row.admin_note,
    prNumber: row.pr_number,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    mergedAt: row.merged_at,
  };
}

export async function insertEdit(edit) {
  if (!hasConfig()) throw new Error('supabase not configured');
  const res = await fetch(url(EDITS_TABLE), {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(toDb(edit)),
  });
  if (!res.ok) throw new Error(`insertEdit failed: ${res.status}`);
  const rows = await res.json();
  return fromDb(rows[0]);
}

export async function getEditById(id) {
  if (!hasConfig()) return null;
  const res = await fetch(`${url(EDITS_TABLE)}?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`getEditById failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] ? fromDb(rows[0]) : null;
}

export async function listEditsByProblem(subject, sessionKey, problemNumber, status) {
  if (!hasConfig()) return [];
  const params = new URLSearchParams({
    subject: `eq.${subject}`,
    session_key: `eq.${sessionKey}`,
    problem_number: `eq.${problemNumber}`,
    select: '*',
    order: 'created_at.desc',
  });
  if (status) params.set('status', `eq.${status}`);
  const res = await fetch(`${url(EDITS_TABLE)}?${params}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listEditsByProblem failed: ${res.status}`);
  const rows = await res.json();
  return rows.map(fromDb);
}

export async function listAllEdits({ status, limit = 200 } = {}) {
  if (!hasConfig()) return [];
  const params = new URLSearchParams({
    select: '*',
    order: 'created_at.desc',
    limit: String(limit),
  });
  if (status) params.set('status', `eq.${status}`);
  const res = await fetch(`${url(EDITS_TABLE)}?${params}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listAllEdits failed: ${res.status}`);
  const rows = await res.json();
  return rows.map(fromDb);
}

export async function countRecentByUser(editorUserId, subject, sessionKey, problemNumber, hours = 24) {
  if (!hasConfig()) return 0;
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const params = new URLSearchParams({
    editor_user_id: `eq.${editorUserId}`,
    subject: `eq.${subject}`,
    session_key: `eq.${sessionKey}`,
    problem_number: `eq.${problemNumber}`,
    created_at: `gte.${since}`,
    select: 'id',
  });
  const res = await fetch(`${url(EDITS_TABLE)}?${params}`, {
    headers: headers({ Prefer: 'count=exact' }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`countRecentByUser failed: ${res.status}`);
  const range = res.headers.get('content-range') || '0/0';
  const total = Number(range.split('/')[1] || 0);
  return total;
}

export async function updateEdit(id, patch) {
  if (!hasConfig()) throw new Error('supabase not configured');
  const dbPatch = {};
  if ('status' in patch) dbPatch.status = patch.status;
  if ('finalComment' in patch) dbPatch.final_comment = patch.finalComment;
  if ('adminNote' in patch) dbPatch.admin_note = patch.adminNote;
  if ('discordMessageId' in patch) dbPatch.discord_message_id = patch.discordMessageId;
  if ('discordChannelId' in patch) dbPatch.discord_channel_id = patch.discordChannelId;
  if ('prNumber' in patch) dbPatch.pr_number = patch.prNumber;
  if ('decidedAt' in patch) dbPatch.decided_at = patch.decidedAt;
  if ('mergedAt' in patch) dbPatch.merged_at = patch.mergedAt;

  const res = await fetch(`${url(EDITS_TABLE)}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(dbPatch),
  });
  if (!res.ok) throw new Error(`updateEdit failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] ? fromDb(rows[0]) : null;
}

export async function listContributors(subject, sessionKey, problemNumber) {
  if (!hasConfig()) return [];
  const params = new URLSearchParams({
    subject: `eq.${subject}`,
    session_key: `eq.${sessionKey}`,
    problem_number: `eq.${problemNumber}`,
    select: 'display_name,is_anonymous,created_at,edit_id',
    order: 'created_at.asc',
  });
  const res = await fetch(`${url(CONTRIB_TABLE)}?${params}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listContributors failed: ${res.status}`);
  return await res.json();
}

export async function insertContributor({ subject, sessionKey, problemNumber, displayName, isAnonymous, editId }) {
  if (!hasConfig()) throw new Error('supabase not configured');
  const res = await fetch(url(CONTRIB_TABLE), {
    method: 'POST',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify({
      subject,
      session_key: sessionKey,
      problem_number: problemNumber,
      display_name: displayName,
      is_anonymous: isAnonymous,
      edit_id: editId,
    }),
  });
  if (!res.ok) throw new Error(`insertContributor failed: ${res.status}`);
}
```

- [ ] **Step 2: Verify**

dev 서버 켠 상태에서 (`npm run dev`) 다음 노드 스크립트로 round-trip 확인:

```bash
node --env-file=.env.local -e "
import('./lib/commentEditStore.js').then(async (m) => {
  const inserted = await m.insertEdit({
    subject: 'sqld', sessionKey: '2025-first', problemNumber: 99,
    originalComment: 'orig', proposedComment: 'proposed text more than 10 chars',
    editorUserId: 'test-user', editorDisplayName: '테스트', isAnonymous: false
  });
  console.log('inserted', inserted.id);
  const got = await m.getEditById(inserted.id);
  console.log('fetched status:', got.status);
  await m.updateEdit(inserted.id, { status: 'rejected', adminNote: 'test' });
  const after = await m.getEditById(inserted.id);
  console.log('after status:', after.status, 'note:', after.adminNote);
})
"
```

Expected: `inserted <uuid>`, `fetched status: pending`, `after status: rejected note: test`.

Supabase 콘솔에서 row 삭제 (test cleanup): `delete from comment_edits where problem_number = 99 and subject = 'sqld';`

- [ ] **Step 3: Commit**

```bash
git add lib/commentEditStore.js
git commit -m "feat(lib): commentEditStore — Supabase CRUD"
```

---

## Task 4: `POST /api/edits` — 제출 라우트

**Files:**
- Create: `app/api/edits/route.js`

- [ ] **Step 1: 구현**

```js
// app/api/edits/route.js
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAllowedSubject, isAllowedSessionKey, readCommentFromDisk } from '@/lib/commentPath';
import { insertEdit, countRecentByUser } from '@/lib/commentEditStore';

export const dynamic = 'force-dynamic';

function sanitizeText(s) {
  return String(s || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'invalid json' }, { status: 400 });
  }

  const subject = String(body?.subject || '').trim();
  const sessionKey = String(body?.sessionKey || '').trim();
  const problemNumber = Number(body?.problemNumber);
  const proposed = sanitizeText(body?.proposed);
  const isAnonymous = Boolean(body?.isAnonymous);

  if (!isAllowedSubject(subject)) {
    return NextResponse.json({ ok: false, message: 'invalid subject' }, { status: 400 });
  }
  if (!(await isAllowedSessionKey(subject, sessionKey))) {
    return NextResponse.json({ ok: false, message: 'invalid sessionKey' }, { status: 400 });
  }
  if (!Number.isFinite(problemNumber) || problemNumber <= 0) {
    return NextResponse.json({ ok: false, message: 'invalid problemNumber' }, { status: 400 });
  }
  if (proposed.length < 10 || proposed.length > 1000) {
    return NextResponse.json({ ok: false, message: 'proposed must be 10~1000 chars' }, { status: 400 });
  }

  const recent = await countRecentByUser(session.user.id, subject, sessionKey, problemNumber);
  if (recent > 0) {
    return NextResponse.json({ ok: false, message: 'rate_limited' }, { status: 429 });
  }

  const original = await readCommentFromDisk(subject, sessionKey, problemNumber);

  const editorDisplayName = String(session.user.name || session.user.email || session.user.id);

  const inserted = await insertEdit({
    subject,
    sessionKey,
    problemNumber,
    originalComment: original,
    proposedComment: proposed,
    editorUserId: session.user.id,
    editorDisplayName,
    isAnonymous,
  });

  // Discord notify는 Task 13에서 추가. 지금은 그냥 id 반환.
  return NextResponse.json({ ok: true, id: inserted.id });
}
```

- [ ] **Step 2: Verify**

dev 서버 가동 후:

```bash
# 1) 비로그인 호출 → 401
curl -i -X POST http://localhost:3000/api/edits \
  -H "Content-Type: application/json" \
  -d '{"subject":"sqld","sessionKey":"2025-first","problemNumber":14,"proposed":"테스트 제안 본문 십자 이상","isAnonymous":false}'
```

Expected: `HTTP/1.1 401`

브라우저에서 `testuser/test1234`로 로그인 후 DevTools 콘솔에서:

```js
await fetch('/api/edits', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({subject:'sqld', sessionKey:'2025-first', problemNumber:14, proposed:'14번 해설 보충: ROLLUP은 연결 그루핑으로 동작해서 col1 두 번 중복', isAnonymous:false})
}).then(r => r.json())
```

Expected: `{ok: true, id: "<uuid>"}`

Same call 즉시 재시도 → `{ok:false, message:'rate_limited'}` 429.

- [ ] **Step 3: Commit**

```bash
git add app/api/edits/route.js
git commit -m "feat(api): POST /api/edits — 해설 수정 제안 제출"
```

---

## Task 5: `GET /api/edits/[key]` — 기여자 + 본인 pending 조회

**Files:**
- Create: `app/api/edits/[key]/route.js`

- [ ] **Step 1: 구현**

```js
// app/api/edits/[key]/route.js
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listContributors, listEditsByProblem } from '@/lib/commentEditStore';
import { isAllowedSubject, isAllowedSessionKey } from '@/lib/commentPath';

export const dynamic = 'force-dynamic';

export async function GET(_request, context) {
  const { key } = await context.params;
  const decoded = decodeURIComponent(String(key || ''));
  const parts = decoded.split(':');
  if (parts.length !== 3) {
    return NextResponse.json({ ok: false, message: 'bad key' }, { status: 400 });
  }
  const [subject, sessionKey, problemNumberRaw] = parts;
  const problemNumber = Number(problemNumberRaw);
  if (!isAllowedSubject(subject) || !Number.isFinite(problemNumber)) {
    return NextResponse.json({ ok: false, message: 'invalid' }, { status: 400 });
  }
  if (!(await isAllowedSessionKey(subject, sessionKey))) {
    return NextResponse.json({ ok: false, message: 'invalid sessionKey' }, { status: 400 });
  }

  const session = await auth();
  const contributors = await listContributors(subject, sessionKey, problemNumber);

  let myPending = null;
  if (session?.user?.id) {
    const mine = await listEditsByProblem(subject, sessionKey, problemNumber, 'pending');
    myPending = mine.find((e) => e.editorUserId === session.user.id) || null;
  }

  return NextResponse.json({
    ok: true,
    contributors: contributors.map((c) => ({
      displayName: c.is_anonymous ? '익명' : c.display_name,
      createdAt: c.created_at,
    })),
    myPending: myPending ? { id: myPending.id, createdAt: myPending.createdAt } : null,
  });
}
```

- [ ] **Step 2: Verify**

```bash
curl -s "http://localhost:3000/api/edits/sqld:2025-first:14" | python -m json.tool
```

Expected: `{"ok": true, "contributors": [], "myPending": null}` (또는 Task 4에서 만든 pending이 있으면 `myPending`에 표시 — 로그인 쿠키 포함 필요).

- [ ] **Step 3: Commit**

```bash
git add "app/api/edits/[key]/route.js"
git commit -m "feat(api): GET /api/edits/[key] — 기여자 + 본인 pending 조회"
```

---

## Task 6: `CommentEditButton` 컴포넌트

**Files:**
- Create: `app/_components/CommentEditButton.js`

- [ ] **Step 1: 구현**

```jsx
// app/_components/CommentEditButton.js
'use client';

import { Pencil } from 'lucide-react';

export default function CommentEditButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 text-[0.8125rem] text-slate-500 transition-colors hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:text-sky-300"
    >
      <Pencil className="h-3.5 w-3.5" />
      <span>수정 제안</span>
    </button>
  );
}
```

- [ ] **Step 2: Commit (UI 통합은 Task 9)**

```bash
git add app/_components/CommentEditButton.js
git commit -m "feat(ui): CommentEditButton — 해설 수정 진입 버튼"
```

---

## Task 7: `CommentEditDialog` 컴포넌트

**Files:**
- Create: `app/_components/CommentEditDialog.js`

- [ ] **Step 1: 구현**

```jsx
// app/_components/CommentEditDialog.js
'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';

const MIN_LEN = 10;
const MAX_LEN = 1000;

export default function CommentEditDialog({
  open,
  onClose,
  subject,
  sessionKey,
  problemNumber,
  problemTitle,
  originalComment,
  onSubmitted,
}) {
  const [proposed, setProposed] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setProposed('');
    setIsAnonymous(false);
    setError('');
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const len = proposed.length;
  const lenColor =
    len < MIN_LEN ? 'text-rose-600 dark:text-rose-400'
    : len > MAX_LEN - 50 ? 'text-amber-600 dark:text-amber-400'
    : 'text-slate-500 dark:text-slate-400';
  const canSubmit = len >= MIN_LEN && len <= MAX_LEN && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, sessionKey, problemNumber, proposed, isAnonymous }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) setError('로그인이 필요해요.');
        else if (res.status === 429) setError('이미 이 문제에 제안하셨어요. 24시간 후 다시 시도해주세요.');
        else setError(data?.message || '제출에 실패했어요.');
        setSubmitting(false);
        return;
      }
      onSubmitted?.(data);
      onClose();
    } catch {
      setError('네트워크 오류');
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm dark:bg-slate-950/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-2xl bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.5)] dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--theme-border)] px-6 py-4">
          <h2 className="text-[1.375rem] font-semibold text-slate-900 dark:text-slate-100">
            해설 수정 제안 <span className="text-slate-400 dark:text-slate-500">·</span>{' '}
            <span className="text-slate-600 dark:text-slate-300">{problemTitle}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              기존 해설
            </p>
            <div className="rounded-lg bg-[var(--surface-muted)] px-4 py-3 text-[0.9375rem] text-slate-700 dark:text-slate-300">
              {originalComment || <span className="text-slate-400 dark:text-slate-500">(기존 해설 없음)</span>}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              제안 내용
            </p>
            <textarea
              ref={textareaRef}
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              maxLength={MAX_LEN}
              rows={6}
              placeholder="해설을 어떻게 바꾸면 좋을지 작성해주세요."
              className="w-full resize-y rounded-lg border border-[color:var(--theme-border)] bg-white px-4 py-3 text-[0.9375rem] text-slate-900 outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--theme-ring)] dark:bg-slate-800 dark:text-slate-100"
            />
            <p className={`mt-1 text-[0.75rem] ${lenColor}`}>
              최소 {MIN_LEN}자 · 최대 {MAX_LEN}자 (현재 {len}/{MAX_LEN})
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[0.875rem] text-slate-700 dark:text-slate-300">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded border ${
                isAnonymous
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-[color:var(--theme-border)] bg-white dark:bg-slate-800'
              }`}
            >
              {isAnonymous && <Check className="h-3.5 w-3.5" />}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <span>익명으로 표시</span>
          </label>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[color:var(--theme-border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[color:var(--theme-border)] px-4 py-2 text-[0.875rem] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="rounded-lg bg-sky-600 px-4 py-2 text-[0.875rem] font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
          >
            {submitting ? '제출 중...' : '제안 제출'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit (UI 통합은 Task 9)**

```bash
git add app/_components/CommentEditDialog.js
git commit -m "feat(ui): CommentEditDialog — 해설 수정 제안 모달"
```

---

## Task 8: `CommentContributors` 컴포넌트

**Files:**
- Create: `app/_components/CommentContributors.js`

- [ ] **Step 1: 구현**

```jsx
// app/_components/CommentContributors.js
'use client';

import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';

export default function CommentContributors({ subject, sessionKey, problemNumber }) {
  const [contributors, setContributors] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const key = `${subject}:${sessionKey}:${problemNumber}`;
    fetch(`/api/edits/${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok) setContributors(data.contributors || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [subject, sessionKey, problemNumber]);

  if (contributors.length === 0) return null;

  const visible = contributors.slice(0, 3).map((c) => c.displayName);
  const rest = contributors.length - visible.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center gap-2 border-t border-[color:var(--theme-border-soft)] pt-2 text-left text-[0.8125rem] text-slate-600 transition-colors hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300"
      >
        <Pencil className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        <span>수정 기여 · {visible.join(', ')}{rest > 0 ? ` 외 ${rest}명` : ''}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm dark:bg-slate-950/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-[1.125rem] font-semibold text-slate-900 dark:text-slate-100">전체 기여자</h3>
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {contributors.map((c, i) => (
                <li key={i} className="flex justify-between text-[0.875rem]">
                  <span className="text-slate-700 dark:text-slate-200">{c.displayName}</span>
                  <span className="text-slate-400 dark:text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/_components/CommentContributors.js
git commit -m "feat(ui): CommentContributors — 해설 기여자 라인"
```

---

## Task 9: 문제 페이지에 해설 UI 통합

**Files:**
- Modify: 해설을 그리는 페이지/컴포넌트 (정확한 위치는 Step 1에서 grep으로 결정)

- [ ] **Step 1: 해설 렌더링 위치 찾기**

```bash
# 해설 박스 그리는 부분 후보
grep -rn "comment\|해설" app --include="*.js" -l | head -20
```

`app/test/[sessionId]/components/QuizInteractiveParts.js` 와 `app/practical/[sessionId]/components/QuizInteractiveParts.js`, `app/test/pdf-pack/[slug]/quiz/page.js`가 우선 후보. 객관식 카테고리(`test/[sessionId]`)부터 시작.

`Read` 도구로 해설을 렌더하는 JSX 블록 찾기 (key: 보통 `comment` 단어가 prop으로 전달되거나, `commentsByNo` Map을 사용).

- [ ] **Step 2: subject/sessionKey/problemNumber를 prop으로 전달받는지 확인**

해설 컴포넌트가 이미 `sessionId` 같은 키를 받는지 확인. 보통 `subject + sessionKey`는 페이지 라우트 파라미터에 있음 (예: `app/sqld/SqldSelectionPageClient.js`가 `subject='sqld'` 컨텍스트). 라우트별로 매핑:

| 라우트 | subject | sessionKey 추출 |
|---|---|---|
| `/test/[sessionId]` | `sessionId` 첫 prefix가 곧 subject + sessionKey 통합 키일 수 있음 — `lib/objectiveSessionCatalog.js` 확인 후 매핑 |
| `/test/pdf-pack/[slug]/quiz` | `pdfPacks` | slug |
| `/sqld/...` | `sqld` | URL 또는 catalog에서 |

`Read app/test/[sessionId]/page.js` 및 `lib/objectiveSessionCatalog.js`로 `sessionId → (subject, sessionKey)` 매핑 함수가 있는지 확인. 없으면 **Step 2.5에서 작은 매퍼 추가**.

- [ ] **Step 2.5: 필요 시 `lib/sessionKeyMap.js` 추가**

`sessionId` 문자열이 `sqld-2025-first` 같은 형태라고 가정 (예시 — 실제 catalog 코드 확인 후 결정):

```js
// lib/sessionKeyMap.js — 실제 catalog 데이터 기반으로 작성
import { OBJECTIVE_SESSIONS } from '@/lib/objectiveSessionCatalog';

export function parseSessionId(sessionId) {
  const found = OBJECTIVE_SESSIONS.find((s) => s.id === sessionId);
  if (!found) return null;
  return { subject: found.subject, sessionKey: found.sessionKey };
}
```

> 주의: `OBJECTIVE_SESSIONS`의 실제 스키마를 먼저 `Read`로 확인. catalog가 다른 형태면 위 코드를 그 형태에 맞춰 수정.

- [ ] **Step 3: 해설 렌더 JSX 수정**

해설 박스가 다음과 같다면 (예시):

```jsx
{comment && (
  <div className="rounded-lg border ...">
    <h3>해설</h3>
    <p>{comment}</p>
  </div>
)}
```

다음과 같이 수정:

```jsx
{(comment || true) && (
  <div className="rounded-lg border ...">
    <div className="flex items-center justify-between">
      <h3>해설</h3>
      {ctx && (
        <CommentEditButton onClick={() => setEditOpen(true)} />
      )}
    </div>
    <p>{comment || <span className="text-slate-400">아직 해설이 없습니다.</span>}</p>
    {ctx && (
      <>
        <CommentContributors {...ctx} problemNumber={problemNumber} />
        <CommentEditDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          {...ctx}
          problemNumber={problemNumber}
          problemTitle={`${ctx.subject.toUpperCase()} ${ctx.sessionKey} · ${problemNumber}번`}
          originalComment={comment}
          onSubmitted={() => { /* 토스트는 기존 패턴 따름 */ }}
        />
      </>
    )}
  </div>
)}
```

`ctx = parseSessionId(sessionId)` 를 컴포넌트 상단에서 1회 계산. `setEditOpen` 은 `useState(false)`.

- [ ] **Step 4: Verify**

dev 서버 켜고 브라우저에서:
1. `testuser`로 로그인
2. SQLD 2025-1회 14번 페이지 진입
3. 해설 박스 우상단 "수정 제안" 버튼 클릭 → 모달 열림
4. 10자 미만 입력 → 버튼 disabled
5. 10자 이상 입력 → 제출 → 모달 닫힘 (토스트 또는 콘솔 log 확인)
6. 같은 페이지 새로고침 → 모달 다시 열어 같은 제출 시도 → 429 에러 메시지

- [ ] **Step 5: Commit**

```bash
git add app/test/[sessionId]/components/QuizInteractiveParts.js lib/sessionKeyMap.js
git commit -m "feat(ui): 객관식 페이지에 해설 수정 UI 통합"
```

> 다른 라우트(`/sqld`, `/practical`, `/test/pdf-pack`)는 같은 패턴으로 별도 commit. MVP는 `/test/[sessionId]` 한 곳만 통합하고 나머지는 후속.

---

## Task 10: `lib/discordNotify.js` — Discord webhook 전송

**Files:**
- Create: `lib/discordNotify.js`

- [ ] **Step 1: 구현**

```js
// lib/discordNotify.js
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const SITE_BASE_URL = process.env.SITE_BASE_URL || '';

function truncate(s, n) {
  const str = String(s || '');
  return str.length <= n ? str : str.slice(0, n - 1) + '…';
}

export async function notifyNewEdit(edit, problemUrl) {
  if (!WEBHOOK_URL) {
    return { messageId: null, channelId: null };
  }
  const adminUrl = `${SITE_BASE_URL}/admin/edits?focus=${edit.id}`;
  const submitter = edit.isAnonymous ? '익명' : edit.editorDisplayName;

  const payload = {
    embeds: [
      {
        title: '📝 해설 수정 제안',
        description: `**${edit.subject}** · ${edit.sessionKey} · ${edit.problemNumber}번\n제출자: ${submitter}`,
        fields: [
          { name: '원본', value: '```' + truncate(edit.originalComment || '(없음)', 900) + '```' },
          { name: '제안', value: '```' + truncate(edit.proposedComment, 900) + '```' },
        ],
        color: 0x0ea5e9,
        timestamp: edit.createdAt,
      },
    ],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: '수락', custom_id: `edit:approve:${edit.id}` },
          { type: 2, style: 4, label: '거부', custom_id: `edit:reject:${edit.id}` },
          { type: 2, style: 5, label: '문제 보기', url: problemUrl || adminUrl },
          { type: 2, style: 5, label: '사이트에서 편집', url: adminUrl },
        ],
      },
    ],
  };

  const res = await fetch(`${WEBHOOK_URL}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return { messageId: null, channelId: null };
  }
  const data = await res.json().catch(() => ({}));
  return { messageId: data?.id || null, channelId: data?.channel_id || null };
}

export async function updateInteractionMessage({ channelId, messageId, resultLabel, edit }) {
  if (!BOT_TOKEN || !channelId || !messageId) return;
  const submitter = edit.isAnonymous ? '익명' : edit.editorDisplayName;
  const payload = {
    embeds: [
      {
        title: `📝 해설 수정 제안 — ${resultLabel}`,
        description: `**${edit.subject}** · ${edit.sessionKey} · ${edit.problemNumber}번\n제출자: ${submitter}`,
        color: resultLabel === '수락 완료' ? 0x10b981 : resultLabel === '거부됨' ? 0xef4444 : 0x64748b,
      },
    ],
    components: [],
  };
  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${BOT_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
}
```

- [ ] **Step 2: Commit (verify는 Task 13에서)**

```bash
git add lib/discordNotify.js
git commit -m "feat(lib): discordNotify — 새 제안 webhook + 결과 메시지 업데이트"
```

---

## Task 11: `lib/discordVerify.js` — ed25519 서명 검증

**Files:**
- Create: `lib/discordVerify.js`

- [ ] **Step 1: 구현 (Web Crypto API 사용, 외부 의존성 X)**

```js
// lib/discordVerify.js
const PUBLIC_KEY_HEX = process.env.DISCORD_PUBLIC_KEY || '';

function hexToBytes(hex) {
  const clean = String(hex).replace(/[^0-9a-f]/gi, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

let cachedKey = null;
async function getKey() {
  if (cachedKey) return cachedKey;
  if (!PUBLIC_KEY_HEX) return null;
  cachedKey = await crypto.subtle.importKey(
    'raw',
    hexToBytes(PUBLIC_KEY_HEX),
    { name: 'Ed25519' },
    false,
    ['verify'],
  );
  return cachedKey;
}

export async function verifyDiscordSignature({ signature, timestamp, body }) {
  const key = await getKey();
  if (!key) return false;
  const sigBytes = hexToBytes(signature);
  const data = new TextEncoder().encode(timestamp + body);
  try {
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, sigBytes, data);
  } catch {
    return false;
  }
}
```

> Next.js 16 / Node 20+ 에서 Web Crypto Ed25519 지원. Node 18 이하면 별도 폴리필 필요 — 환경 확인.

- [ ] **Step 2: Verify (Node 버전 체크)**

```bash
node -v
```

Expected: `v20.x` 이상.

- [ ] **Step 3: Commit**

```bash
git add lib/discordVerify.js
git commit -m "feat(lib): discordVerify — ed25519 서명 검증 (Web Crypto)"
```

---

## Task 12: `POST /api/discord/interactions` — Discord 인터랙션 핸들러

**Files:**
- Create: `app/api/discord/interactions/route.js`

- [ ] **Step 1: 구현**

```js
// app/api/discord/interactions/route.js
import { NextResponse } from 'next/server';
import { verifyDiscordSignature } from '@/lib/discordVerify';
import { getEditById, updateEdit } from '@/lib/commentEditStore';

export const dynamic = 'force-dynamic';

const INTERACTION_PING = 1;
const INTERACTION_COMPONENT = 3;
const RESPONSE_PONG = 1;
const RESPONSE_UPDATE_MESSAGE = 7;
const RESPONSE_CHANNEL_MESSAGE = 4;
const FLAG_EPHEMERAL = 64;

export async function POST(request) {
  const signature = request.headers.get('x-signature-ed25519') || '';
  const timestamp = request.headers.get('x-signature-timestamp') || '';
  const rawBody = await request.text();

  const valid = await verifyDiscordSignature({ signature, timestamp, body: rawBody });
  if (!valid) {
    return new NextResponse('invalid request signature', { status: 401 });
  }

  let body;
  try { body = JSON.parse(rawBody); } catch { return new NextResponse('bad json', { status: 400 }); }

  if (body?.type === INTERACTION_PING) {
    return NextResponse.json({ type: RESPONSE_PONG });
  }

  if (body?.type !== INTERACTION_COMPONENT) {
    return NextResponse.json({ type: RESPONSE_CHANNEL_MESSAGE, data: { content: 'unsupported', flags: FLAG_EPHEMERAL } });
  }

  const customId = String(body?.data?.custom_id || '');
  const m = /^edit:(approve|reject):(.+)$/.exec(customId);
  if (!m) {
    return NextResponse.json({ type: RESPONSE_CHANNEL_MESSAGE, data: { content: 'unknown action', flags: FLAG_EPHEMERAL } });
  }
  const [, action, editId] = m;

  const edit = await getEditById(editId);
  if (!edit) {
    return NextResponse.json({ type: RESPONSE_CHANNEL_MESSAGE, data: { content: '요청을 찾을 수 없어요.', flags: FLAG_EPHEMERAL } });
  }
  if (edit.status !== 'pending') {
    return NextResponse.json({ type: RESPONSE_CHANNEL_MESSAGE, data: { content: `이미 처리됨 (${edit.status}).`, flags: FLAG_EPHEMERAL } });
  }

  const now = new Date().toISOString();
  let resultLabel;
  if (action === 'approve') {
    await updateEdit(editId, { status: 'approved', finalComment: edit.proposedComment, decidedAt: now });
    resultLabel = '수락 완료';
  } else {
    await updateEdit(editId, { status: 'rejected', decidedAt: now });
    resultLabel = '거부됨';
  }

  const submitter = edit.isAnonymous ? '익명' : edit.editorDisplayName;
  return NextResponse.json({
    type: RESPONSE_UPDATE_MESSAGE,
    data: {
      embeds: [
        {
          title: `📝 해설 수정 제안 — ${resultLabel}`,
          description: `**${edit.subject}** · ${edit.sessionKey} · ${edit.problemNumber}번\n제출자: ${submitter}`,
          color: action === 'approve' ? 0x10b981 : 0xef4444,
        },
      ],
      components: [],
    },
  });
}
```

- [ ] **Step 2: Verify (PING 회신)**

Discord Developer Portal에서 Interactions Endpoint URL을 ngrok 또는 임시 배포 URL로 설정 → PING 검증 시도. 응답 200 + `{type:1}`.

또는 로컬에서 수동 PING (서명 없이는 401):

```bash
curl -i -X POST http://localhost:3000/api/discord/interactions \
  -H "Content-Type: application/json" \
  -d '{"type":1}'
```

Expected: `401 invalid request signature` (서명 헤더 없으니 정상).

- [ ] **Step 3: Commit**

```bash
git add app/api/discord/interactions/route.js
git commit -m "feat(api): /api/discord/interactions — 수락/거부 버튼 핸들러"
```

---

## Task 13: `POST /api/edits`에 Discord 알림 연결

**Files:**
- Modify: `app/api/edits/route.js`

- [ ] **Step 1: notifyNewEdit 호출 + URL 매퍼 인라인 (Task 14 전까지 fallback)**

`app/api/edits/route.js` 의 마지막 `return` 직전에 추가:

```js
import { notifyNewEdit } from '@/lib/discordNotify';

// ... (기존 코드)

  // (return 직전)
  const siteBase = process.env.SITE_BASE_URL || '';
  const problemUrl = `${siteBase}/admin/edits?focus=${inserted.id}`; // Task 14에서 실제 문제 페이지 URL로 교체

  try {
    const { messageId, channelId } = await notifyNewEdit(inserted, problemUrl);
    if (messageId) {
      await updateEdit(inserted.id, { discordMessageId: messageId, discordChannelId: channelId });
    }
  } catch {
    // webhook 실패 시 DB는 저장 성공 — admin UI에서 재전송 가능 (Task 17)
  }

  return NextResponse.json({ ok: true, id: inserted.id });
```

`import { updateEdit } from '@/lib/commentEditStore';` 도 추가.

- [ ] **Step 2: Verify (실제 디코 webhook)**

`.env.local`에 `DISCORD_WEBHOOK_URL` 설정 후 dev 재시작 → 브라우저에서 새 제안 제출 → Discord 채널에 임베드 메시지 도착 확인.

- [ ] **Step 3: Commit**

```bash
git add app/api/edits/route.js
git commit -m "feat(api): 새 제안 시 Discord 알림 발송"
```

---

## Task 14: `lib/problemUrlMap.js` — 문제 페이지 URL 매퍼

**Files:**
- Create: `lib/problemUrlMap.js`

- [ ] **Step 1: 카탈로그 형태 확인**

```bash
grep -n "subject\|sessionKey\|sessionId" lib/objectiveSessionCatalog.js | head -30
```

`Read lib/objectiveSessionCatalog.js` 로 sessionId 형식 확인 후 매핑 규칙 결정. 가설:

- `subject='sqld' + sessionKey='2025-first'` → `/test/sqld-2025-first` 같은 sessionId
- `subject='pdfPacks' + sessionKey='industrial-2025-1'` → `/test/pdf-pack/industrial-2025-1/quiz`
- `subject='problem2024'+ sessionKey='first'` → `/test/problem2024-first`

(실제 형식은 catalog 코드 보고 결정.)

- [ ] **Step 2: 구현**

```js
// lib/problemUrlMap.js
const SITE_BASE_URL = process.env.SITE_BASE_URL || '';

export function buildProblemUrl(subject, sessionKey, problemNumber) {
  if (!SITE_BASE_URL) return '';
  if (subject === 'pdfPacks') {
    return `${SITE_BASE_URL}/test/pdf-pack/${sessionKey}/quiz?problem=${problemNumber}`;
  }
  // sqld / problem20XX — 객관식 라우트 (Task 14 Step 1에서 catalog 보고 정확한 형식으로 보정)
  const sessionId = `${subject}-${sessionKey}`;
  return `${SITE_BASE_URL}/test/${sessionId}?problem=${problemNumber}`;
}
```

> 매핑이 catalog와 다르면 catalog를 import해서 정확한 sessionId를 조회하는 함수로 변경.

- [ ] **Step 3: Task 13에서 만든 fallback URL을 실제 URL로 교체**

`app/api/edits/route.js`:

```js
import { buildProblemUrl } from '@/lib/problemUrlMap';
// ...
const problemUrl = buildProblemUrl(subject, sessionKey, problemNumber);
```

- [ ] **Step 4: Commit**

```bash
git add lib/problemUrlMap.js app/api/edits/route.js
git commit -m "feat(lib): problemUrlMap — 문제 페이지 URL 빌더 + Discord 메시지 연결"
```

---

## Task 15: `GET /api/admin/edits` — 큐 리스트

**Files:**
- Create: `app/api/admin/edits/route.js`

- [ ] **Step 1: 구현**

```js
// app/api/admin/edits/route.js
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { listAllEdits } from '@/lib/commentEditStore';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const edits = await listAllEdits({ status, limit: 200 });

  const roundReadyCount = (await listAllEdits({ status: 'approved', limit: 500 }))
    .filter((e) => e.prNumber == null).length;

  return NextResponse.json({ ok: true, edits, roundReadyCount });
}
```

- [ ] **Step 2: Verify**

브라우저 admin 로그인 후 콘솔에서:

```js
await fetch('/api/admin/edits').then(r => r.json())
```

Expected: `{ok: true, edits: [...], roundReadyCount: 0}`

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/edits/route.js
git commit -m "feat(api): GET /api/admin/edits — 큐 리스트"
```

---

## Task 16: `POST /api/admin/edits/[id]/decide` — 승인/거부

**Files:**
- Create: `app/api/admin/edits/[id]/decide/route.js`

- [ ] **Step 1: 구현**

```js
// app/api/admin/edits/[id]/decide/route.js
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { getEditById, updateEdit } from '@/lib/commentEditStore';
import { updateInteractionMessage } from '@/lib/discordNotify';

export const dynamic = 'force-dynamic';

export async function POST(request, context) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || '');
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ ok: false, message: 'invalid action' }, { status: 400 });
  }

  const edit = await getEditById(id);
  if (!edit) return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
  if (edit.status !== 'pending') {
    return NextResponse.json({ ok: false, message: 'already decided' }, { status: 409 });
  }

  const now = new Date().toISOString();
  if (action === 'approve') {
    const finalComment = body?.finalComment != null && String(body.finalComment).trim().length >= 10
      ? String(body.finalComment).trim()
      : edit.proposedComment;
    await updateEdit(id, { status: 'approved', finalComment, decidedAt: now });
  } else {
    const adminNote = body?.adminNote ? String(body.adminNote) : null;
    await updateEdit(id, { status: 'rejected', adminNote, decidedAt: now });
  }

  // Discord 메시지 업데이트 (Task 10)
  if (edit.discordMessageId && edit.discordChannelId) {
    await updateInteractionMessage({
      channelId: edit.discordChannelId,
      messageId: edit.discordMessageId,
      resultLabel: action === 'approve' ? '수락 완료' : '거부됨',
      edit,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit (verify는 Task 17 UI 완성 후)**

```bash
git add "app/api/admin/edits/[id]/decide/route.js"
git commit -m "feat(api): POST /api/admin/edits/[id]/decide — 승인/거부/재수정"
```

---

## Task 17: `/admin/edits` 큐 페이지 (UI)

**Files:**
- Create: `app/admin/edits/page.js`
- Create: `app/admin/edits/AdminEditQueueClient.js`

- [ ] **Step 1: server entry**

```jsx
// app/admin/edits/page.js
import { getAdminSession } from '@/lib/adminAccess';
import { redirect } from 'next/navigation';
import AdminEditQueueClient from './AdminEditQueueClient';

export const dynamic = 'force-dynamic';

export default async function AdminEditsPage() {
  const adminSession = await getAdminSession();
  if (!adminSession) redirect('/');
  return <AdminEditQueueClient />;
}
```

- [ ] **Step 2: client UI**

```jsx
// app/admin/edits/AdminEditQueueClient.js
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const STATUS_STYLES = {
  pending: { dot: 'bg-slate-400', label: 'pending', text: 'text-slate-600 dark:text-slate-300' },
  approved: { dot: 'bg-sky-500', label: 'approved', text: 'text-sky-700 dark:text-sky-300' },
  rejected: { dot: 'bg-rose-500', label: 'rejected', text: 'text-rose-700 dark:text-rose-300' },
  merged: { dot: 'bg-emerald-500', label: 'merged', text: 'text-emerald-700 dark:text-emerald-300' },
};

function relativeTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function AdminEditQueueClient() {
  const [edits, setEdits] = useState([]);
  const [roundReadyCount, setRoundReadyCount] = useState(0);
  const [filter, setFilter] = useState('pending');
  const [selectedId, setSelectedId] = useState(null);
  const [finalComment, setFinalComment] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const reload = useCallback(async () => {
    const url = filter === 'all' ? '/api/admin/edits' : `/api/admin/edits?status=${filter}`;
    const data = await fetch(url, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({}));
    if (data?.ok) {
      setEdits(data.edits || []);
      setRoundReadyCount(data.roundReadyCount || 0);
    }
  }, [filter]);

  useEffect(() => { reload(); }, [reload]);

  const selected = useMemo(() => edits.find((e) => e.id === selectedId) || null, [edits, selectedId]);
  useEffect(() => { setFinalComment(''); setAdminNote(''); }, [selectedId]);

  async function decide(action) {
    if (!selected) return;
    setBusy(true);
    const body = { action };
    if (action === 'approve' && finalComment.trim().length >= 10) body.finalComment = finalComment.trim();
    if (action === 'reject' && adminNote.trim()) body.adminNote = adminNote.trim();
    const res = await fetch(`/api/admin/edits/${selected.id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data?.ok) {
      setToast(action === 'approve' ? '승인됨' : '거부됨');
      setSelectedId(null);
      await reload();
    } else {
      setToast(`실패: ${data?.message || res.status}`);
    }
    setTimeout(() => setToast(''), 2000);
  }

  async function createRoundPr() {
    if (roundReadyCount === 0) return;
    if (!confirm(`${roundReadyCount}건을 묶어 PR을 생성합니다. 머지는 GitHub에서 진행해주세요. 진행할까요?`)) return;
    setBusy(true);
    const res = await fetch('/api/admin/edits/round', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data?.ok) {
      setToast('PR 생성됨');
      if (data.prUrl) window.open(data.prUrl, '_blank', 'noopener');
      await reload();
    } else {
      setToast(`PR 실패: ${data?.message || res.status}`);
    }
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[1.75rem] font-semibold text-slate-900 dark:text-slate-100">해설 수정 큐</h1>
        <button
          type="button"
          onClick={createRoundPr}
          disabled={roundReadyCount === 0 || busy}
          className={
            roundReadyCount === 0
              ? 'rounded-lg border border-dashed border-[color:var(--theme-border)] px-4 py-2 text-[0.875rem] text-slate-400'
              : 'rounded-lg bg-sky-600 px-4 py-2 text-[0.875rem] font-medium text-white transition-colors hover:bg-sky-700'
          }
        >
          이번 라운드 PR 생성 · {roundReadyCount}건
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {['pending', 'approved', 'rejected', 'merged', 'all'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${
              filter === f
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'border border-[color:var(--theme-border)] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-1.5">
          {edits.length === 0 && (
            <p className="rounded-lg border border-dashed border-[color:var(--theme-border)] px-4 py-6 text-center text-[0.875rem] text-slate-500 dark:text-slate-400">
              처리할 요청이 없어요
            </p>
          )}
          {edits.map((e) => {
            const isSel = e.id === selectedId;
            const s = STATUS_STYLES[e.status] || STATUS_STYLES.pending;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedId(e.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  isSel
                    ? 'border-l-2 border-sky-500 bg-sky-50 dark:bg-sky-950/30'
                    : 'border-[color:var(--theme-border)] hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[0.875rem] font-medium text-slate-900 dark:text-slate-100">
                    {e.subject} {e.sessionKey} · {e.problemNumber}번
                  </span>
                  <span className={`flex items-center gap-1 text-[0.75rem] ${s.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>
                <p className="mt-0.5 text-[0.75rem] text-slate-500 dark:text-slate-400">
                  {e.isAnonymous ? '익명' : e.editorDisplayName} · {relativeTime(e.createdAt)}
                </p>
              </button>
            );
          })}
        </aside>

        <section>
          {!selected && (
            <div className="rounded-lg border border-dashed border-[color:var(--theme-border)] px-6 py-12 text-center text-slate-500 dark:text-slate-400">
              좌측에서 항목을 선택하세요.
            </div>
          )}
          {selected && (
            <div className="space-y-5 rounded-lg border border-[color:var(--theme-border)] p-5">
              <div>
                <h2 className="text-[1.125rem] font-semibold text-slate-900 dark:text-slate-100">
                  {selected.subject} {selected.sessionKey} · {selected.problemNumber}번
                </h2>
                <p className="mt-0.5 text-[0.8125rem] text-slate-500 dark:text-slate-400">
                  제출자: {selected.isAnonymous ? '익명' : selected.editorDisplayName} · {relativeTime(selected.createdAt)}
                </p>
              </div>

              <div>
                <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">원본</p>
                <div className="rounded-md bg-[var(--surface-muted)] px-4 py-3 text-[0.9375rem] whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {selected.originalComment || <span className="text-slate-400">(없음)</span>}
                </div>
              </div>

              <div>
                <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">제안</p>
                <div className="rounded-md bg-[var(--surface-muted)] px-4 py-3 text-[0.9375rem] whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {selected.proposedComment}
                </div>
              </div>

              {selected.status === 'pending' && (
                <>
                  <div>
                    <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                      관리자 재수정 (비우면 제안 그대로 승인)
                    </p>
                    <textarea
                      value={finalComment}
                      onChange={(e) => setFinalComment(e.target.value)}
                      rows={5}
                      placeholder="필요하면 여기서 수정한 후 '재수정 후 승인' 클릭"
                      className="w-full rounded-md border border-[color:var(--theme-border)] bg-white px-3 py-2 text-[0.9375rem] outline-none focus:ring-2 focus:ring-[color:var(--theme-ring)] dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                      거부 사유 (optional)
                    </p>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="w-full rounded-md border border-[color:var(--theme-border)] bg-white px-3 py-2 text-[0.875rem] outline-none focus:ring-2 focus:ring-[color:var(--theme-ring)] dark:bg-slate-800"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => decide('reject')}
                      disabled={busy}
                      className="rounded-md border border-rose-200 px-3 py-1.5 text-[0.875rem] font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                    >
                      거부
                    </button>
                    <button
                      type="button"
                      onClick={() => decide('approve')}
                      disabled={busy || (finalComment.trim().length > 0 && finalComment.trim().length < 10)}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-[0.875rem] font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      {finalComment.trim().length > 0 ? '재수정 후 승인' : '그대로 승인'}
                    </button>
                  </div>
                </>
              )}

              {selected.status === 'approved' && selected.prNumber == null && (
                <p className="rounded-md bg-sky-50 px-3 py-2 text-[0.8125rem] text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                  다음 라운드 PR에 포함됩니다.
                </p>
              )}
              {selected.prNumber != null && (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-[0.8125rem] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  PR #{selected.prNumber} 포함됨. {selected.status === 'merged' ? '머지 완료.' : '머지 대기.'}
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-slate-900 px-4 py-2 text-[0.875rem] text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
          {toast}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

dev 서버 + admin 계정으로 `/admin/edits` 접근:
1. 비admin 접속 시 `/`로 리다이렉트
2. admin 접속 시 페이지 렌더, 좌측에 pending 목록
3. 항목 선택 → 우측 상세 표시
4. "그대로 승인" 클릭 → 토스트 + 큐에서 빠짐 (approved 필터로 옮겨가서 확인)
5. 다른 항목에 textarea 입력 후 "재수정 후 승인" → final_comment에 admin 버전 저장 (Supabase 콘솔에서 row 확인)
6. 거부 → status=rejected

- [ ] **Step 4: Commit**

```bash
git add app/admin/edits/page.js app/admin/edits/AdminEditQueueClient.js
git commit -m "feat(admin): /admin/edits — 큐 페이지 (2-pane)"
```

---

## Task 18: `lib/githubPr.js` — GitHub REST 래퍼

**Files:**
- Create: `lib/githubPr.js`

- [ ] **Step 1: 구현**

```js
// lib/githubPr.js
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_REPO_OWNER;
const REPO = process.env.GITHUB_REPO_NAME;
const BASE = process.env.GITHUB_BASE_BRANCH || 'main';

function ghHeaders(extra = {}) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  };
}

async function gh(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: ghHeaders(body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`github ${method} ${path} failed: ${res.status} ${text}`);
  }
  return await res.json();
}

function toBase64Utf8(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}
function fromBase64Utf8(b64) {
  return Buffer.from(b64, 'base64').toString('utf8');
}

async function getBaseSha() {
  const ref = await gh('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BASE}`);
  return ref.object.sha;
}

async function createBranch(branchName, baseSha) {
  await gh('POST', `/repos/${OWNER}/${REPO}/git/refs`, {
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });
}

async function getFileOnBranch(branch, filePath) {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURI(filePath)}?ref=${branch}`,
    { headers: ghHeaders() }
  );
  if (!res.ok) throw new Error(`github GET contents failed: ${res.status}`);
  const data = await res.json();
  return { sha: data.sha, content: fromBase64Utf8(data.content) };
}

async function putFileOnBranch(branch, filePath, newContent, prevSha, message) {
  await gh('PUT', `/repos/${OWNER}/${REPO}/contents/${encodeURI(filePath)}`, {
    message,
    content: toBase64Utf8(newContent),
    sha: prevSha,
    branch,
  });
}

function applyEditToJson(jsonText, problemNumber, finalComment) {
  const data = JSON.parse(jsonText);
  let touched = false;
  for (const section of data || []) {
    for (const c of section?.comments || []) {
      if (Number(c?.problem_number) === Number(problemNumber)) {
        c.comment = finalComment;
        touched = true;
      }
    }
  }
  if (!touched) throw new Error(`problem_number ${problemNumber} not found in comment json`);
  return JSON.stringify(data, null, 2) + '\n';
}

export async function createRoundPr(edits, buildPath) {
  if (!GITHUB_TOKEN || !OWNER || !REPO) throw new Error('github env missing');
  if (edits.length === 0) throw new Error('no edits');

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
  const branch = `edits/round-${stamp}`;

  const baseSha = await getBaseSha();
  await createBranch(branch, baseSha);

  const byFile = new Map();
  for (const e of edits) {
    const filePath = buildPath(e.subject, e.sessionKey);
    if (!byFile.has(filePath)) byFile.set(filePath, []);
    byFile.get(filePath).push(e);
  }

  for (const [filePath, groupEdits] of byFile) {
    const { sha, content } = await getFileOnBranch(branch, filePath);
    let next = content;
    for (const e of groupEdits) {
      next = applyEditToJson(next, e.problemNumber, e.finalComment);
    }
    const msg = `docs(comment): ${filePath} — ${groupEdits.length}건 수정\n\n${groupEdits.map((e) => `- ${e.problemNumber}번 (edit ${e.id})`).join('\n')}`;
    await putFileOnBranch(branch, filePath, next, sha, msg);
  }

  const bodyMd = [
    '## 해설 수정 라운드',
    '',
    `총 ${edits.length}건`,
    '',
    ...edits.map((e) => `- **${e.subject}** ${e.sessionKey} · ${e.problemNumber}번 (edit \`${e.id}\`)`),
  ].join('\n');

  const pr = await gh('POST', `/repos/${OWNER}/${REPO}/pulls`, {
    title: `해설 수정 라운드 ${new Date().toISOString().slice(0, 10)} (${edits.length}건)`,
    head: branch,
    base: BASE,
    body: bodyMd,
  });

  return { prNumber: pr.number, prUrl: pr.html_url, branch };
}
```

- [ ] **Step 2: Verify**

GitHub PAT 발급 (repo write) → `.env.local` 설정. 가짜 edit으로 단독 테스트:

```bash
node --env-file=.env.local -e "
import('./lib/githubPr.js').then(async (m) => {
  // 주의: 실제 PR이 생성됨. 테스트용 problem_number를 14로 두고, 끝나면 PR을 닫고 브랜치 삭제.
  const fake = [{
    id: 'test-' + Date.now(),
    subject: 'sqld',
    sessionKey: '2025-first',
    problemNumber: 14,
    finalComment: 'TEST 라운드 PR 동작 확인 - 이 내용은 머지하지 마세요'
  }];
  const r = await m.createRoundPr(fake, (s, sk) => 'datasets/' + s + '/' + sk + '/comment1.json');
  console.log(r);
})
"
```

Expected: PR URL 출력. GitHub에서 PR 생성됨 확인. **반드시 close + branch delete** (테스트 정리).

- [ ] **Step 3: Commit**

```bash
git add lib/githubPr.js
git commit -m "feat(lib): githubPr — 라운드 PR 생성 (브랜치 + 파일 PUT + PR open)"
```

---

## Task 19: `POST /api/admin/edits/round` — 라운드 PR 엔드포인트

**Files:**
- Create: `app/api/admin/edits/round/route.js`

- [ ] **Step 1: 구현**

```js
// app/api/admin/edits/round/route.js
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { listAllEdits, updateEdit } from '@/lib/commentEditStore';
import { createRoundPr } from '@/lib/githubPr';
import { buildCommentPath } from '@/lib/commentPath';

export const dynamic = 'force-dynamic';

export async function POST() {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });

  const approved = (await listAllEdits({ status: 'approved', limit: 500 }))
    .filter((e) => e.prNumber == null);
  if (approved.length === 0) {
    return NextResponse.json({ ok: false, message: 'no approved edits' }, { status: 409 });
  }

  let result;
  try {
    result = await createRoundPr(approved, buildCommentPath);
  } catch (err) {
    return NextResponse.json({ ok: false, message: String(err?.message || err) }, { status: 500 });
  }

  await Promise.all(approved.map((e) => updateEdit(e.id, { prNumber: result.prNumber })));

  return NextResponse.json({ ok: true, prNumber: result.prNumber, prUrl: result.prUrl });
}
```

- [ ] **Step 2: Verify**

1. admin 사이트 큐에서 1~2건 승인 → `/admin/edits` 상단 "이번 라운드 PR 생성" 버튼 활성화 확인
2. 버튼 클릭 → 확인 모달 → 새 탭에 PR 열림 + 토스트 표시
3. Supabase에서 해당 row들의 `pr_number` 채워짐 확인
4. GitHub PR 본문 + 파일 변경 내용 검수
5. **테스트 PR 닫고 브랜치 삭제**

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/edits/round/route.js
git commit -m "feat(api): POST /api/admin/edits/round — 승인분 라운드 PR 생성"
```

---

## Task 20: `mark-merged` 엔드포인트 + UI 버튼

**Files:**
- Create: `app/api/admin/edits/[id]/mark-merged/route.js`
- Modify: `app/admin/edits/AdminEditQueueClient.js`

- [ ] **Step 1: 엔드포인트 구현**

```js
// app/api/admin/edits/[id]/mark-merged/route.js
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { getEditById, updateEdit, insertContributor } from '@/lib/commentEditStore';

export const dynamic = 'force-dynamic';

export async function POST(_request, context) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });

  const { id } = await context.params;
  const edit = await getEditById(id);
  if (!edit) return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
  if (edit.status !== 'approved') {
    return NextResponse.json({ ok: false, message: 'not approved' }, { status: 409 });
  }
  if (edit.prNumber == null) {
    return NextResponse.json({ ok: false, message: 'not in pr yet' }, { status: 409 });
  }

  const now = new Date().toISOString();
  await updateEdit(id, { status: 'merged', mergedAt: now });
  await insertContributor({
    subject: edit.subject,
    sessionKey: edit.sessionKey,
    problemNumber: edit.problemNumber,
    displayName: edit.isAnonymous ? '익명' : edit.editorDisplayName,
    isAnonymous: edit.isAnonymous,
    editId: edit.id,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: 큐 UI에 "머지 완료 처리" 버튼 추가**

`AdminEditQueueClient.js` 의 `selected.prNumber != null && selected.status !== 'merged'` 블록에 버튼 추가:

```jsx
{selected.prNumber != null && selected.status === 'approved' && (
  <div className="flex justify-end">
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/admin/edits/${selected.id}/mark-merged`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (data?.ok) {
          setToast('머지 완료 처리됨');
          setSelectedId(null);
          await reload();
        } else {
          setToast(`실패: ${data?.message || res.status}`);
        }
        setTimeout(() => setToast(''), 2000);
      }}
      className="rounded-md bg-emerald-600 px-3 py-1.5 text-[0.875rem] font-medium text-white hover:bg-emerald-700"
    >
      GitHub에서 머지 완료 → 머지 처리
    </button>
  </div>
)}
```

- [ ] **Step 3: Verify**

1. GitHub에서 PR 머지 (또는 머지된 척 — 실제 머지하면 JSON이 main에 반영됨)
2. admin 사이트 큐에서 approved 필터 → 항목 선택 → "머지 완료 처리" 클릭
3. 큐에서 merged로 옮겨감, Supabase contributors 테이블에 새 row 추가됨
4. 해당 문제 페이지 새로고침 → 해설 박스 아래 "수정 기여 · <이름>" 표시됨

- [ ] **Step 4: Commit**

```bash
git add "app/api/admin/edits/[id]/mark-merged/route.js" app/admin/edits/AdminEditQueueClient.js
git commit -m "feat(admin): 머지 완료 처리 + contributors 기록"
```

---

## Task 21: 사후 점검 + README 업데이트

**Files:**
- Modify: `README.md` (또는 새 `docs/setup/comment-edits.md` 생성)

- [ ] **Step 1: 운영 가이드 작성**

```markdown
# 해설 수정 제안 시스템 운영

## 환경 변수
- `DISCORD_WEBHOOK_URL`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`
- `GITHUB_TOKEN` (repo write), `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BASE_BRANCH=master`
- `SITE_BASE_URL`

## 초기 설정
1. Supabase 콘솔에서 `docs/setup/comment-edits-schema.sql` 실행
2. Discord Application 생성 → Public Key, Bot Token 확보
3. Discord Application의 Interactions Endpoint URL을 `<SITE_BASE_URL>/api/discord/interactions`로 설정 → PING 검증 통과 확인
4. Discord 채널 webhook 생성 → URL 저장

## 라운드 PR 흐름
1. 사용자가 해설 박스에서 "수정 제안" → 모달 제출
2. 관리자 Discord에 알림 → 디코에서 [수락]/[거부] 또는 사이트 큐에서 처리
3. 승인분이 N건 모이면 `/admin/edits`에서 "이번 라운드 PR 생성" 클릭
4. GitHub에서 PR 검토 후 머지
5. 사이트 큐에서 해당 항목 선택 → "머지 완료 처리" 클릭 (contributors 기록)
```

- [ ] **Step 2: Commit**

```bash
git add README.md docs/setup/comment-edits.md
git commit -m "docs: 해설 수정 시스템 운영 가이드"
```

---

## Self-Review Notes

- **Spec coverage**
  - §2 결정사항: 모든 항목 Task에 매핑 (subject 화이트리스트 = Task 2, PR 라운드 = Task 18-19, Discord Bot = Task 10-12 등)
  - §3 아키텍처 다이어그램 전체 경로: 제출(Task 4) → Discord(Task 13) → 인터랙션(Task 12) → 사이트 재수정(Task 16-17) → 라운드 PR(Task 18-19) → 머지(Task 20)
  - §6 UI 컴포넌트 모두 구현 (CommentEditButton/Dialog/Contributors/AdminEditQueue)
  - §7 에러/어뷰징: rate_limit(Task 4), drift(읽기만, 표시는 후속), webhook 실패 fallback(Task 13)
- **Phase 6 webhook 자동화**는 spec에서 후속으로 분리한 항목 — 본 plan은 MVP의 "사이트 머지 완료 버튼"으로 구현 (Task 20). 자동화는 별도 plan.
- **테스트 프레임워크 미도입**: spec §8 명시한 unit/integration/E2E는 본 코드베이스에 테스트 인프라가 없어 manual 검증 + curl로 대체. 별도 도입은 본 plan 범위 밖.
- **드리프트 표시 UI**: spec §7에서 admin UI에 ⚠️ 표시 언급했으나 본 plan에서는 데이터(`originalComment` 저장)만 보존하고 UI 표시는 후속 작업.
