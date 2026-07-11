# n8n 워크플로 구축 가이드: `cbt-report-handler`

신고 1건을 받아 Slack 알림 → Dify 분석 → Supabase 기록 → (필요 시) GitHub PR → Slack 회신까지 처리하는 워크플로다. n8n.cloud UI에서 노드를 하나씩 추가하며 따라 만들 수 있도록 정리했다.

## 0. 사전 준비

### 0.1 Credentials 등록

| 이름 | 종류 | 입력값 |
|---|---|---|
| `Slack Bot` | Slack API | Bot User OAuth Token (`xoxb-...`) |
| `Supabase` | Supabase | Host `https://<proj>.supabase.co`, Service Role Key |
| `GitHub Bot` | GitHub API | Fine-grained PAT (Contents R/W, Pull requests R/W, Metadata R) |
| `Dify Bearer` | HTTP Header Auth | Name `Authorization`, Value `Bearer app-xxxxx` |

> n8n.cloud → Settings → Credentials → New 에서 각각 등록한다.

### 0.2 환경변수 등록 위치

n8n.cloud → Settings → Variables 에서 추가한다 (모든 워크플로에서 `$env.NAME` 으로 참조 가능).

```
WEBHOOK_SECRET=<Next.js .env 의 N8N_REPORT_WEBHOOK_SECRET 과 동일>
DIFY_WORKFLOW_URL=https://api.dify.ai/v1/workflows/run
SUPABASE_URL=https://<proj>.supabase.co
GH_OWNER=<github-user-or-org>
GH_REPO=jchsanGi
SLACK_REPORT_CHANNEL=#cbt-reports
SLACK_ADMIN_USER_ID=U01XXX
REPORT_DRY_RUN=false
```

## 1. 노드 구성

### 1.1 노드 흐름 요약

```
Webhook
  → IF (시크릿 검증)
  → Slack: Post (1차 알림, ts 캡처)
  → HTTP: Dify Workflow Run
  → Set: outputs 평탄화
  → Supabase: Insert report_analysis
  → Switch (verdict)
       ├─ valid_fix → GitHub Get File → Code(Function) → GitHub Create Branch
       │              → GitHub Edit File → GitHub Create PR
       │              → Slack Thread Reply → Supabase Update
       ├─ invalid_report → Slack Thread Reply
       └─ needs_human   → Slack Thread Reply (@admin 멘션)
  → Respond to Webhook
```

### 1.2 노드별 상세

#### 1) Webhook Trigger

| 항목 | 값 |
|---|---|
| 노드 종류 | Webhook |
| 이름 | `Report Webhook` |
| HTTP Method | `POST` |
| Path | `cbt-report` |
| Authentication | None (헤더 검증은 다음 IF 노드) |
| Response Mode | `Using 'Respond to Webhook' Node` |

#### 2) IF — 시크릿 검증

| 항목 | 값 |
|---|---|
| 노드 종류 | If |
| 이름 | `Verify Secret` |
| Condition (String, equal) | `{{$json.headers["x-webhook-secret"]}}` === `{{$env.WEBHOOK_SECRET}}` |

FALSE 분기는 곧장 `Respond to Webhook` (401) 로 연결한다.

#### 3) Slack: Post Message — 1차 알림

| 항목 | 값 |
|---|---|
| 노드 종류 | Slack |
| 이름 | `Slack: First Notice` |
| Credential | `Slack Bot` |
| Operation | `Send a message` |
| Channel | `{{$env.SLACK_REPORT_CHANNEL}}` |
| Text | (아래 예제) |
| Options → Reply in Thread | OFF |

Text 예제:
```
:rotating_light: *신규 신고 접수* (분석 중...)
회차: `{{$json.body.origin.session_id}}`  |  문항: `{{$json.body.origin.problem_number}}`
사유: {{$json.body.report.reason}}
신고자: {{$json.body.reporter.email ? $json.body.reporter.email.replace(/(.{2}).*(@.*)/, '$1****$2') : 'anonymous'}}
report_id: `{{$json.body.report_id}}`
```

> 응답 객체의 `ts` 가 스레드 식별자다. 이후 `{{$node["Slack: First Notice"].json["ts"]}}` 로 참조한다.

#### 4) HTTP Request — Dify Workflow

| 항목 | 값 |
|---|---|
| 노드 종류 | HTTP Request |
| 이름 | `Dify: Judge` |
| Method | `POST` |
| URL | `={{$env.DIFY_WORKFLOW_URL}}` |
| Authentication | Generic / Header Auth → `Dify Bearer` |
| Send Headers | `Content-Type: application/json` |
| Send Body | JSON |
| Body (raw) | (아래) |
| Options → Timeout | `90000` ms |
| Options → Retry On Fail | 1회, 2000ms 간격 |

Body:
```json
{
  "inputs": {
    "report_id": "{{$json.body.report_id}}",
    "question_text": "{{$json.body.problem.question_text}}",
    "options_json": "{{ JSON.stringify($json.body.problem.options) }}",
    "correct_answer_index": {{$json.body.problem.correct_answer_index}},
    "correct_answer_text": "{{$json.body.problem.correct_answer_text}}",
    "current_comment": "{{$json.body.problem.current_comment}}",
    "report_reason": "{{$json.body.report.reason}}",
    "user_message": "{{$json.body.report.user_message}}"
  },
  "response_mode": "blocking",
  "user": "n8n-cbt-report"
}
```

#### 5) Set — outputs 평탄화

| 항목 | 값 |
|---|---|
| 노드 종류 | Set |
| 이름 | `Parse Dify` |
| Keep Only Set | ON |

추가할 필드 (모두 Expression):
```
verdict             = {{$json.data.outputs.verdict}}
target_field        = {{$json.data.outputs.target_field}}
new_value           = {{$json.data.outputs.new_value}}
reasoning           = {{$json.data.outputs.reasoning}}
confidence          = {{$json.data.outputs.confidence}}
dify_workflow_run_id= {{$json.workflow_run_id}}
report_id           = {{$node["Report Webhook"].json.body.report_id}}
origin_session_id   = {{$node["Report Webhook"].json.body.origin.session_id}}
origin_problem_number = {{$node["Report Webhook"].json.body.origin.problem_number}}
slack_thread_ts     = {{$node["Slack: First Notice"].json.ts}}
dataset_path        = {{$node["Report Webhook"].json.body.dataset_path}}
target_file         = {{ $node["Report Webhook"].json.body.dataset_path + '/' + ({comment:'comment',answer:'answer',problem:'problem'}[$json.data.outputs.target_field] || 'comment') + ($node["Report Webhook"].json.body.origin.session_id.match(/^\d+$/) ? $node["Report Webhook"].json.body.origin.session_id : '1') + '.json' }}
problem_number      = {{$node["Report Webhook"].json.body.origin.problem_number}}
```

> `target_file` / `problem_number` 는 Dify 가 모른다. Webhook 페이로드의 `dataset_path` 와 `origin` 으로 n8n 측에서 조립한다. 파일명 규칙은 `{comment|answer|problem}{회차번호}.json` 인데, 회차가 숫자가 아닌 dataset (예: `random22`, `aiprompt-...`) 일 때는 별도 로직 필요 — Phase 1 단계에서는 written/sqld/practical 의 숫자 회차만 지원하고, 그 외는 verdict 가 `valid_fix` 라도 PR 단계에서 안전하게 실패하도록 8a-2 Code 노드에서 검증한다.

#### 6) Supabase — Insert (upsert)

| 항목 | 값 |
|---|---|
| 노드 종류 | Supabase |
| 이름 | `Supabase: Insert Analysis` |
| Credential | `Supabase` |
| Operation | `Insert` |
| Table | `report_analysis` |
| On Conflict (raw query 모드일 때) | `report_id` |

매핑할 컬럼:
```
report_id              = {{$json.report_id}}
origin_session_id      = {{$json.origin_session_id}}
origin_problem_number  = {{$json.origin_problem_number}}
verdict                = {{$json.verdict}}
target_field           = {{$json.target_field}}
target_file            = {{$json.target_file}}
confidence             = {{$json.confidence}}
reasoning              = {{$json.reasoning}}
new_value              = {{$json.new_value}}
slack_thread_ts        = {{$json.slack_thread_ts}}
dify_workflow_run_id   = {{$json.dify_workflow_run_id}}
```

> Supabase 노드가 upsert를 지원하지 않으면 HTTP Request 노드로 대체:
> `POST {{$env.SUPABASE_URL}}/rest/v1/report_analysis`, 헤더 `Prefer: resolution=merge-duplicates`, `apikey`/`Authorization` = Service Role Key.

#### 7) Switch — verdict 분기

| 항목 | 값 |
|---|---|
| 노드 종류 | Switch |
| 이름 | `Route by Verdict` |
| Mode | `Expression` |
| Value | `{{$json.verdict}}` |

분기:
- `valid_fix` → 8a-1
- `invalid_report` → 8b
- `needs_human` → 8c

#### 8a) `valid_fix` 경로 — GitHub PR 생성

##### 8a-1) GitHub: Get File

| 항목 | 값 |
|---|---|
| 노드 종류 | GitHub |
| 이름 | `GH: Get File` |
| Credential | `GitHub Bot` |
| Resource | `File` |
| Operation | `Get` |
| Owner | `={{$env.GH_OWNER}}` |
| Repository | `={{$env.GH_REPO}}` |
| File Path | `={{$json.target_file}}` |
| Reference | `main` |
| Additional Fields → As Binary Property | OFF (content 필드를 base64 문자열로 받음) |

##### 8a-2) Code (Function) — JSON 수정

| 항목 | 값 |
|---|---|
| 노드 종류 | Code |
| 이름 | `Build New Content` |
| Mode | Run Once for Each Item |
| Language | JavaScript |

```js
const file = $json;                       // GH Get File 응답
const analysis = $node["Parse Dify"].json;
const buf = Buffer.from(file.content, 'base64').toString('utf8');
const data = JSON.parse(buf);

const target = analysis.target_field; // 'comment' | 'answer' | 'problem'
const pn = Number(analysis.problem_number);
// Dify 는 new_value 를 항상 object 로 반환 (comment 도 { value: "..." } 로 래핑됨)
const nv = typeof analysis.new_value === 'string'
  ? JSON.parse(analysis.new_value)
  : analysis.new_value;

const keyByField = { comment: 'comments', answer: 'answers', problem: 'problems' };
const arrKey = keyByField[target];
if (!arrKey) throw new Error('unknown target_field: ' + target);
if (!nv || typeof nv !== 'object') throw new Error('new_value must be an object');

let patched = 0;
for (const section of data) {
  const list = Array.isArray(section[arrKey]) ? section[arrKey] : [];
  for (const item of list) {
    if (Number(item.problem_number) !== pn) continue;
    if (target === 'comment') {
      const text = String(nv.value || '');
      if (text.length < 5) throw new Error('comment too short');
      item.comment = text;
    } else if (target === 'answer') {
      item.correct_answer_index = Number(nv.correct_answer_index);
      item.correct_answer_text = String(nv.correct_answer_text);
    } else if (target === 'problem') {
      if (!Array.isArray(nv.options) || nv.options.length !== 4) {
        throw new Error('options must be 4-length array');
      }
      item.question_text = String(nv.question_text);
      item.options = nv.options.map(String);
    }
    patched += 1;
  }
}
if (patched === 0) throw new Error('problem_number not found: ' + pn);

const out = JSON.stringify(data, null, 2) + '\n';
return [{
  json: {
    branch: `bot/report-${analysis.report_id}`,
    path: analysis.target_file,
    sha: file.sha,
    base64: Buffer.from(out, 'utf8').toString('base64'),
    commitMessage: `fix(dataset): ${analysis.origin_session_id} ${pn}번 ${target} 수정 (report:${analysis.report_id})`,
  },
}];
```

##### 8a-3) GitHub: Create Branch

n8n GitHub 노드에는 `Create Branch` 가 없을 수 있으므로 HTTP Request 로 처리:

| 항목 | 값 |
|---|---|
| 노드 종류 | HTTP Request |
| 이름 | `GH: Create Branch` |
| Method | `POST` |
| URL | `https://api.github.com/repos/{{$env.GH_OWNER}}/{{$env.GH_REPO}}/git/refs` |
| Auth | GitHub PAT (Header Auth: `Authorization: Bearer <PAT>`) |
| Headers | `Accept: application/vnd.github+json` |
| Body | `{ "ref": "refs/heads/{{$json.branch}}", "sha": "<main HEAD sha>" }` |

> main HEAD sha 는 별도 `GET /repos/.../git/refs/heads/main` 호출 결과를 Set 노드로 들고 와 참조한다. 또는 Edit File 단계에서 `branch` 파라미터에 새 브랜치명을 주면 GitHub 가 자동으로 생성하지 않으므로, 위 단계가 필요하다.

##### 8a-4) GitHub: Edit File

| 항목 | 값 |
|---|---|
| 노드 종류 | GitHub |
| 이름 | `GH: Edit File` |
| Operation | `Edit` |
| Owner / Repository | env |
| File Path | `={{$json.path}}` |
| Branch | `={{$json.branch}}` |
| Commit Message | `={{$json.commitMessage}}` |
| File Content (Base64) | `={{$json.base64}}` |
| Existing File SHA | `={{$json.sha}}` |

##### 8a-5) GitHub: Create PR

| 항목 | 값 |
|---|---|
| 노드 종류 | GitHub |
| 이름 | `GH: Create PR` |
| Resource | `Pull Request` |
| Operation | `Create` |
| Owner / Repository | env |
| Title | `[report-bot] {{$node["Parse Dify"].json.origin_session_id}} {{$node["Parse Dify"].json.problem_number}}번 {{$node["Parse Dify"].json.target_field}} 수정` |
| Body | (`docs/github/pr-template-report-bot.md` 참고) |
| Head | `={{$node["Build New Content"].json.branch}}` |
| Base | `main` |
| Labels | `report-bot,needs-review` |

##### 8a-6) Slack: Reply In Thread

| 항목 | 값 |
|---|---|
| 노드 종류 | Slack |
| Operation | `Send a message` |
| Channel | `={{$env.SLACK_REPORT_CHANNEL}}` |
| Options → Reply in Thread | ON, Thread TS = `={{$node["Parse Dify"].json.slack_thread_ts}}` |
| Text | `:white_check_mark: PR 생성됨: <{{$json.html_url}}\|#{{$json.number}}> — confidence {{$node["Parse Dify"].json.confidence}}` |

##### 8a-7) Supabase: Update

| 항목 | 값 |
|---|---|
| 노드 종류 | Supabase |
| Operation | `Update` |
| Table | `report_analysis` |
| Filter | `report_id = {{$node["Parse Dify"].json.report_id}}` |
| Fields | `pr_number={{$node["GH: Create PR"].json.number}}`, `pr_url={{$node["GH: Create PR"].json.html_url}}`, `pr_state=open` |

#### 8b) `invalid_report` 경로 — Slack 회신만

| 항목 | 값 |
|---|---|
| 노드 종류 | Slack |
| 이름 | `Slack: Invalid Reply` |
| Operation | `Send a message` |
| Channel | env |
| Options → Reply in Thread | ON, Thread TS = `={{$node["Parse Dify"].json.slack_thread_ts}}` |
| Text | `:large_yellow_circle: *무효 신고로 판단됨*\n근거: {{$node["Parse Dify"].json.reasoning}}\nconfidence: {{$node["Parse Dify"].json.confidence}}` |

#### 8c) `needs_human` 경로 — Slack 멘션

| 항목 | 값 |
|---|---|
| 노드 종류 | Slack |
| 이름 | `Slack: Needs Human` |
| Channel | env |
| Reply in Thread | ON |
| Text | `:red_circle: <@{{$env.SLACK_ADMIN_USER_ID}}> *사람 판단 필요*\n근거: {{$node["Parse Dify"].json.reasoning}}\nconfidence: {{$node["Parse Dify"].json.confidence}}` |

#### 9) Respond to Webhook

| 항목 | 값 |
|---|---|
| 노드 종류 | Respond to Webhook |
| Response Code | 200 |
| Response Body | `={{ { ok: true, report_id: $node["Parse Dify"].json.report_id, verdict: $node["Parse Dify"].json.verdict } }}` |

## 2. Dry-run / 레이트 리밋 (옵션)

- `REPORT_DRY_RUN=true` 면 8a-3 ~ 8a-5 를 건너뛰고 8a-6 에서 "would-create PR" 문구로 회신하도록 IF 노드를 8a-2 다음에 끼운다.
- 같은 `(origin_session_id, origin_problem_number)` 24h 내 `pr_state='open'` 있는지 8a-1 직전에 Supabase Select 로 조회해, 있으면 8a-6 으로 점프해 기존 PR 링크 회신.

## 3. 단독 테스트 (Next.js 없이)

Postman 또는 curl 로 직접 호출한다. `WEBHOOK_SECRET` 은 n8n 환경변수와 일치시킨다.

```bash
curl -X POST 'https://<your>.app.n8n.cloud/webhook/cbt-report' \
  -H 'Content-Type: application/json' \
  -H 'X-Webhook-Secret: <WEBHOOK_SECRET>' \
  -d '{
    "report_id": "test_001",
    "reported_at": "2026-06-08T12:00:00.000Z",
    "reporter": { "email": "tester@example.com", "name": "tester", "ip": "127.0.0.1" },
    "origin": { "session_id": "1", "problem_number": 1, "exam_type": "written" },
    "report": { "reason": "정답 오류", "user_message": "SMTP가 라우팅 프로토콜이 맞는 것 같아요" },
    "problem": {
      "question_text": "라우팅(Routing) 프로토콜이 아닌 것은?",
      "options": ["BGP","OSPF","SMTP","RIP"],
      "correct_answer_index": 2,
      "correct_answer_text": "SMTP",
      "current_comment": "SMTP는 전자 우편 전송 프로토콜입니다."
    },
    "dataset_path": "datasets/problem2024/first"
  }'
```

기대 동작:
1. Slack `#cbt-reports` 채널에 1차 알림.
2. Dify 호출 → verdict 산출.
3. Supabase `report_analysis` 에 row 1개 insert.
4. verdict 가 `valid_fix` 면 GitHub PR 생성 + 스레드에 PR 링크.
5. 200 응답.

## 4. 에러 트리거 (선택)

별도 워크플로 `cbt-report-errors` 를 만들고 Trigger 노드를 `Error Trigger` 로 두면, 위 워크플로의 unhandled error 가 Slack `#cbt-reports-errors` 채널로 흘러간다. 본 워크플로의 Settings → Error Workflow 에서 지정.
