# 해설 수정 제안 / 승인 시스템 설계

- **작성일**: 2026-05-30
- **상태**: Draft → 사용자 리뷰 대기
- **범위**: SQLD + problem20XX + pdfPacks 객관식 해설

## 1. 배경 & 목표

현재 해설(`comment`)은 `datasets/<subject>/<session>/comment1.json` 정적 파일로 git에 커밋되어 있다. 오타 발견이나 보충 설명 추가는 코드 PR을 직접 올려야만 가능해서 일반 사용자가 기여할 길이 없다.

**목표**
- 사용자가 사이트에서 해설 수정을 제안할 수 있다.
- 관리자는 Discord 봇 + 사이트 큐에서 검토·승인·재수정·거부할 수 있다.
- 승인된 수정은 라운드 단위로 묶여 GitHub PR로 생성되고, 관리자가 GitHub에서 머지하면 자동 배포된다.
- 머지된 수정의 기여자 이름이 해당 문제 해설 아래에 누적 표시된다.

**비목표 (MVP 제외)**
- 실기/주관식 해설 수정
- Markdown 본문, 이미지 첨부
- 기여 점수/뱃지 시스템
- 자동 머지 (admin이 GitHub에서 수동 머지 유지)

## 2. 결정사항 요약

| 항목 | 결정 |
|---|---|
| 적용 범위 | SQLD + problem20XX + pdfPacks |
| 수정본 반영 방식 | GitHub PR 생성 |
| PR 머지 | admin이 GitHub에서 수동 머지 |
| PR 묶음 단위 | 라운드 단위 (admin이 사이트에서 수동 트리거) |
| 편집자 이름 출처 | NextAuth 로그인 강제 |
| 기여자 표시 정책 | 전체 누적 + 익명 체크박스 |
| Discord 연동 | Bot + 버튼 인터랙션 (수락/거부/문제 보기/사이트에서 편집) |

## 3. 아키텍처

```
[User]                          [Next.js]                       [Supabase]
  │                                 │                                │
  ├─ 해설 옆 "수정 제안" 클릭 ──→  │                                │
  │                                 ├─ POST /api/edits ────────→ comment_edits insert
  │                                 │                                │
  │                          [Discord 채널]                          │
  │                                 │  ◄── webhook (제안 카드 + 버튼)
  │                                 │
  │                          [Admin]                                 │
  │                          디코 버튼 클릭                          │
  │                                 │
  │                                 │  Discord → POST /api/discord/interactions
  │                                 │  → ed25519 signature 검증
  │                                 │  → status approved | rejected ─→ comment_edits update
  │                                 │
  │                          [Admin 사이트]                          │
  │                          /admin/edits 에서 재수정/검토            │
  │                                 │
  │                          [라운드 PR 생성 (수동 버튼)]            │
  │                                 │
  │                                 ├─ POST /api/admin/edits/round ─→ GitHub API
  │                                 │  · 브랜치 edits/round-YYYYMMDD-HHMM
  │                                 │  · approved && pr IS NULL 항목 commit
  │                                 │  · PR 오픈, pr_number 기록
  │                                 │
  │                          [Admin → GitHub PR 머지]               │
  │                                 │  → main reflect → Vercel 자동 재배포
  │                                 │  → (선택) GitHub webhook → status=merged + contributors insert
```

### 컴포넌트 단위

| 단위 | 책임 | 인터페이스 |
|---|---|---|
| `CommentEditButton` | 해설 박스 진입점 | `{subject, sessionKey, problemNumber, currentComment}` |
| `CommentEditDialog` | 제안 작성 모달 | 위 + `onSubmit({proposed, isAnonymous})` |
| `CommentContributors` | 해설 아래 기여자 표시 | `{contributors: [{name, isAnonymous, ...}]}` |
| `AdminEditQueue` | 관리자 큐 페이지 | server fetch `comment_edits` |
| `POST /api/edits` | 제출 처리 + Discord 알림 | body: `{subject, sessionKey, problemNumber, proposed, isAnonymous}` |
| `POST /api/discord/interactions` | Discord 인터랙션 처리 | Discord 표준 payload |
| `GET /api/edits/[key]` | 문제별 contributors / pending 조회 | key: `subject:sessionKey:problemNumber` |
| `POST /api/admin/edits/:id/decide` | 사이트에서 승인/거부 | body: `{action, finalComment?, adminNote?}` |
| `POST /api/admin/edits/round` | 라운드 PR 생성 | body: `{}` |
| `lib/githubPr.js` | GitHub API wrapper (브랜치/파일/PR) | `createRoundPr({edits})` |
| `lib/commentPath.js` | `(subject, session_key) → 'datasets/<subject>/<session_key>/comment1.json'` 빌더. 화이트리스트 검증 (subject/session_key가 실제 디렉터리 목록에 있는지 확인) | `buildCommentPath(subject, sessionKey)` |
| `lib/discordNotify.js` | Discord webhook 전송 | `notifyNewEdit(edit)` / `updateMessage(messageId, status)` |
| `lib/commentEditStore.js` | Supabase CRUD | 표준 store 패턴 |

## 4. 데이터 모델

### 4-1. `comment_edits`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid PK | |
| `subject` | text NOT NULL | `datasets/` 직속 폴더명. 예: `'sqld'`, `'problem2022'`, `'problem2023'`, `'problem2024'`, `'pdfPacks'` |
| `session_key` | text NOT NULL | 해당 subject 아래 하위 폴더명. 예: `'2025-first'`, `'industrial-2025-1'`, `'first'` |
| `problem_number` | int NOT NULL | |
| `original_comment` | text NOT NULL | 제출 시점 원본 (drift 감지) |
| `proposed_comment` | text NOT NULL | 사용자 제안. 10~1000자 |
| `final_comment` | text | 승인 시 확정 (기본=proposed, 재수정 시 admin 버전) |
| `editor_user_id` | text NOT NULL | NextAuth user.id |
| `editor_display_name` | text NOT NULL | 익명이어도 NextAuth 이름 저장 (audit) |
| `is_anonymous` | bool NOT NULL DEFAULT false | true면 표시는 "익명" |
| `status` | text NOT NULL DEFAULT 'pending' | `pending` \| `approved` \| `rejected` \| `merged` |
| `discord_message_id` | text | webhook 응답에서 받은 메시지 id |
| `discord_channel_id` | text | 인터랙션에서 메시지 업데이트 시 사용 |
| `admin_note` | text | 거부 사유 또는 메모 |
| `pr_number` | int | 라운드 PR 번호 |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `decided_at` | timestamptz | 승인/거부 시각 |
| `merged_at` | timestamptz | merged 시각 |

**인덱스**
- `(subject, session_key, problem_number, status)` — 문제별 pending 조회
- `(status, pr_number)` — 라운드 PR 생성 대상 조회 (`status='approved' AND pr_number IS NULL`)
- `(editor_user_id, problem_number, created_at)` — rate limit 체크

### 4-2. `comment_contributors`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid PK | |
| `subject` | text NOT NULL | |
| `session_key` | text NOT NULL | |
| `problem_number` | int NOT NULL | |
| `display_name` | text NOT NULL | 익명이면 `'익명'`, 아니면 NextAuth 이름 |
| `is_anonymous` | bool NOT NULL | |
| `edit_id` | uuid NOT NULL REFERENCES comment_edits(id) | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |

**인덱스**: `(subject, session_key, problem_number, created_at)`

**삽입 시점**: `comment_edits.status` 가 `'merged'` 로 전환될 때 트리거. MVP에서는 명시적 코드 경로(라운드 PR 머지 webhook 또는 admin 사이트의 "merged 처리" 버튼)에서 insert.

## 5. 데이터 플로우 상세

### 5-1. 제출

1. 사용자가 문제 카드에서 `CommentEditButton` 클릭. 미로그인 시 로그인 모달 노출 후 중단.
2. `CommentEditDialog`에서 제안 작성, 익명 체크 선택, "제출" 클릭.
3. `POST /api/edits` body: `{subject, sessionKey, problemNumber, proposed, isAnonymous}`.
4. 서버 검증
   - 세션 인증 (`auth()` from NextAuth)
   - 길이 10~1000자, sanitize (텍스트만, HTML strip)
   - rate limit: 같은 user_id + 같은 문제로 24h 내 row 있으면 429
   - `original_comment` 는 서버에서 현재 JSON을 읽어 채움
5. `comment_edits` insert (status=pending).
6. `lib/discordNotify.js`로 webhook 호출. 응답에서 `id`, `channel_id` 추출 → 해당 row update.
7. 클라이언트에 토스트 표시 후 모달 닫기.

### 5-2. Discord 인터랙션

1. admin이 디코에서 `[수락]` 또는 `[거부]` 클릭.
2. Discord가 `POST /api/discord/interactions` 호출.
3. 서버는 `X-Signature-Ed25519`, `X-Signature-Timestamp` 헤더로 서명 검증 (`DISCORD_PUBLIC_KEY`). 실패 시 401.
4. `type === 1` (PING) 이면 `{type: 1}` 응답 (Discord verification).
5. `type === 3` (MESSAGE_COMPONENT) 인 경우 `custom_id` 파싱.
   - 형식: `edit:<action>:<edit_id>` (action ∈ {`approve`, `reject`})
6. DB에서 row 조회. status가 이미 `pending`이 아니면 "이미 처리됨" ephemeral 응답.
7. 액션에 따라 update:
   - approve: `status='approved'`, `final_comment = proposed_comment`, `decided_at = now()`
   - reject: `status='rejected'`, `decided_at = now()`
8. Discord에 `type=7` (UPDATE_MESSAGE) 응답으로 같은 메시지를 새 페이로드로 교체. 페이로드는 버튼 모두 disable + 결과 라벨("수락 완료" / "거부됨")을 포함한 임베드. 별도 PATCH 호출 불필요.
9. 응답 타임아웃(3초) 우려가 있는 작업이 추후 추가되면 `type=6` (DEFERRED_UPDATE_MESSAGE) ACK + `PATCH /webhooks/{app_id}/{token}/messages/@original` followup으로 전환. MVP는 type=7로 충분.

### 5-3. 사이트에서 재수정

1. admin이 `/admin/edits`에서 항목 선택.
2. "재수정" 영역(textarea)에 입력 후 "재수정 후 승인" 클릭.
3. `POST /api/admin/edits/:id/decide` body: `{action, finalComment?, adminNote?}`.
   - `action='approve'` + `finalComment` 미지정 → "그대로 승인". 서버가 `final_comment = proposed_comment`로 채움
   - `action='approve'` + `finalComment` 지정 → "재수정 후 승인". `final_comment = body.finalComment`
   - `action='reject'` → `status='rejected'`, `admin_note = body.adminNote` (optional)
4. 서버에서 admin 세션 검증 (`getAdminSession`).
5. row update: `decided_at = now()`, 위 규칙대로 status / final_comment 설정.
6. (선택) Discord 메시지가 있으면 업데이트해서 "사이트에서 처리됨" 표시.

### 5-4. 라운드 PR 생성

1. admin이 `/admin/edits` 상단 "이번 라운드 PR 생성 · N건" 버튼 클릭. N은 `status='approved' AND pr_number IS NULL` 개수.
2. 확인 모달 표시 후 `POST /api/admin/edits/round`.
3. 서버는 대상 edits 조회.
4. `lib/githubPr.js.createRoundPr(edits)`
   - 브랜치명: `edits/round-${YYYYMMDD-HHMM}` (`GET /repos/.../git/refs/heads/main` → `POST /repos/.../git/refs`)
   - edits를 `(subject, session_key)` 그룹으로 묶음
   - 각 그룹별로:
     - `GET /repos/.../contents/datasets/<subject>/<session_key>/comment1.json?ref=<branch>` → `sha` + decoded JSON
     - JSON 안에서 해당 `problem_number` 의 `comment` 필드를 `final_comment` 로 교체
     - `PUT /repos/.../contents/...` (sha, message, content base64, branch)
   - `POST /repos/.../pulls` (head=branch, base=main, title=`해설 수정 라운드 YYYY-MM-DD (N건)`, body=목록 마크다운)
5. 응답 PR 번호로 모든 대상 edits에 `pr_number` update.
6. 클라이언트에 PR URL 토스트 + 새 탭 열기.
7. 실패 시: 이미 commit 된 항목은 skip 가능 (idempotent: PUT은 sha 기반이라 충돌 감지). 부분 실패 시 PR 미생성 상태로 두고 "재시도" 버튼 노출.

### 5-5. 머지 후 처리

옵션 A: GitHub webhook 수신
- `POST /api/github/webhook` 에 PR closed + merged 이벤트.
- 해당 PR의 모든 edits를 `status='merged'`, `merged_at=now()`로 update.
- 각각 `comment_contributors` insert.

옵션 B (MVP): admin이 GitHub에서 머지한 뒤 사이트에서 "머지 완료 처리" 버튼 클릭 → 같은 update를 수동으로.

MVP는 옵션 B로 시작, webhook은 후속 작업으로 분리.

## 6. UI 컴포넌트 (IMPECCABLE 디자인)

전 컴포넌트 원칙: sky/slate 팔레트, type scale 토큰(`text-caption`/`text-secondary`/`text-body`/`text-heading`), 다크모드 대응, 데스크탑 우선.

### 6-1. `CommentEditButton`
- 해설 박스 우상단 인라인 텍스트 버튼 (`Pencil` 14px + "수정 제안")
- Default `text-slate-500 dark:text-slate-400`, hover `text-sky-700 dark:text-sky-300`
- 미로그인 시 클릭 → 기존 `StartLoginModalButton` 패턴으로 로그인 유도

### 6-2. `CommentEditDialog`
- 폭 640px, 모바일 full-width
- 헤더: 제목 `text-heading`, 우상단 닫기
- "기존 해설" / "제안 내용" 라벨: `text-caption` uppercase tracking `text-slate-500`
- 기존 해설: `bg-[var(--surface-muted)] rounded-lg px-4 py-3 text-body` read-only
- textarea: `border-[color:var(--theme-border)]`, focus `ring-2 ring-[color:var(--theme-ring)]`
- 글자수 카운터: 미달 rose, 한계 직전 amber
- 익명 체크박스: `ReportReasonPicker` 스타일 통일
- 풋터: 취소 outline / 제출 `bg-sky-600 hover:bg-sky-700 text-white`
- 모션: 열림 fade+scale 200ms `--ease-out-quart`
- 백드롭: `bg-slate-900/40 backdrop-blur-sm`

### 6-3. `CommentContributors`
- 해설 박스 하단 `border-t border-[color:var(--theme-border-soft)]`
- `text-secondary text-slate-600 dark:text-slate-400`
- "✎ 수정 기여 · 홍길동, 김철수, 익명 외 3명 →"
- 최대 3명 노출 + "외 N명", 클릭 시 전체 리스트 모달
- 0명이면 렌더 안 함

### 6-4. `AdminEditQueue` (`/admin/edits`)
- 데스크탑 2-pane: 좌 360px 리스트 / 우 가변 상세
- 상단 우측: "이번 라운드 PR 생성 · N건" 버튼 (N=0이면 `border-dashed text-slate-400` disabled)
- 좌 리스트 항목:
  - 선택 시 `border-l-2 border-sky-500 bg-sky-50 dark:bg-sky-950/30`
  - status dot: pending(slate)/approved(sky)/rejected(rose)/merged(emerald)
- 우 상세:
  - 원본/제안 본문 `text-body`
  - diff 토글: 줄단위 색상(`bg-emerald-50/60`/`bg-rose-50/60`)
  - 재수정 textarea (빈 상태=제안 그대로 승인)
- 액션:
  - 거부 outline rose
  - 재수정 후 승인 `bg-slate-900 text-white` (intent 강조)
  - 그대로 승인 `bg-sky-600 text-white`
- 키보드: `J/K` 이동, `A` 승인, `R` 거부, `E` 재수정 포커스
- 빈 상태: 텍스트만, 아이콘 없음

### 6-5. Discord 임베드
- title: "📝 해설 수정 제안"
- description: `<subject> · <session_key> · <problem_number>번` + 제출자
- fields: 원본 / 제안 (각 코드블록)
- buttons (action row, 최대 5개 중 4개 사용)
  - `[수락]` `custom_id=edit:approve:<id>` style=success
  - `[거부]` `custom_id=edit:reject:<id>` style=danger
  - `[문제 보기]` link button → 실제 문제 페이지. 실제 URL은 subject/session_key에 따라 라우트가 다르므로(`/test/[sessionId]`, `/test/pdf-pack/[slug]/quiz`, `/sqld/...` 등) `lib/problemUrlMap.js` 같은 매퍼에서 `(subject, session_key, problem_number) → URL` 변환. 매핑 미존재 시 admin 큐 페이지로 fallback
  - `[사이트에서 편집]` link button → `/admin/edits?focus=<id>`

## 7. 에러 처리 / 어뷰징 대응

| 영역 | 처리 |
|---|---|
| Rate limit | 같은 user_id + 같은 문제: 24h 내 1회. 위반 시 429 + 토스트 "이미 이 문제에 제안하셨어요" |
| 길이 | 10~1000자. 서버 + 클라 양쪽 검증 |
| Sanitize | 텍스트만 저장, HTML/script strip. Markdown 미허용 (MVP) |
| 로그인 강제 | 미로그인 POST 401, 클라 로그인 모달 prompt |
| Drift | `original_comment` ≠ 현재 JSON 시 admin UI에 ⚠️ 표시, 승인 전 확인 모달 |
| Discord webhook 실패 | DB 저장은 성공, `discord_message_id IS NULL`. admin UI에 "재전송" 버튼 |
| Discord signature 실패 | 401 (Discord verification에 필수) |
| GitHub API 실패 | 라운드 PR 트랜잭션 idempotent. 부분 commit 후 실패 시 PR 미생성 상태로 두고 "재시도" |
| 중복 승인 레이스 | 디코/사이트 동시 클릭 시 status 검사 후 unconditional update 거부, "이미 처리됨" 응답 |

## 8. 테스트 전략

**Unit**
- `lib/githubPr.js`: 브랜치 생성, 파일 fetch+modify+commit, PR 생성 (GitHub API mock)
- Discord ed25519 서명 검증 (공식 테스트 벡터)
- JSON path 빌더: `(subject, session_key)` → `datasets/.../comment1.json`
- Rate limit 체크

**Integration (API route 레벨)**
- `POST /api/edits` 성공 / 401 / 429 / 길이 위반
- `POST /api/discord/interactions` approve / reject / 잘못된 서명
- `POST /api/admin/edits/:id/decide` 재수정 후 승인 / 권한 없음
- `POST /api/admin/edits/round` 7건 묶음 PR mock 생성 검증
- `GET /api/edits/[key]` pending + contributors 조회

**E2E (수동 또는 Playwright, 기존 의존성에 따름)**
- 제출 → admin 큐 표시 → 그대로 승인 → 라운드 PR 생성 → PR URL 응답

**테스트 안 함**
- 실제 Discord/GitHub API 호출
- 정적 JSON 렌더링 회귀

## 9. 환경 변수

| 키 | 용도 |
|---|---|
| `DISCORD_WEBHOOK_URL` | 새 제안 알림 채널 webhook |
| `DISCORD_PUBLIC_KEY` | ed25519 서명 검증 |
| `DISCORD_BOT_TOKEN` | 메시지 PATCH (버튼 disable 등) |
| `DISCORD_APPLICATION_ID` | 인터랙션 응답 시 사용 |
| `GITHUB_TOKEN` | repo write 권한 PAT 또는 GitHub App 토큰 |
| `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME` | 대상 리포 |
| `GITHUB_BASE_BRANCH` | 기본 `main` |
| `SITE_BASE_URL` | Discord 메시지 link button용 |

기존 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 재사용.

## 10. 단계적 출시 계획

1. **Phase 1 — DB & 기반 API**: 마이그레이션, `lib/commentEditStore.js`, `POST /api/edits`, `GET /api/edits/[key]`
2. **Phase 2 — 사용자 UI**: `CommentEditButton`, `CommentEditDialog`, `CommentContributors` (문제 페이지에 통합)
3. **Phase 3 — Discord 연동**: webhook 전송, 인터랙션 라우트, signature 검증
4. **Phase 4 — Admin 큐**: `/admin/edits` 페이지, 재수정/승인/거부 라우트
5. **Phase 5 — 라운드 PR**: `lib/githubPr.js`, `POST /api/admin/edits/round`, 상단 버튼
6. **Phase 6 — 머지 처리**: 사이트 "머지 완료" 버튼 (MVP) → 후속으로 GitHub webhook 자동화

## 11. 미해결 / 후속 작업

- GitHub webhook 기반 자동 `status='merged'` (Phase 6에서 결정)
- 머지 후 Vercel 재배포 완료 알림 (Discord)
- 기여 점수/뱃지/리더보드 (별도 spec)
- 실기/주관식 해설 수정 확장 (별도 spec)
- 다국어 (현재 한국어 전제)
