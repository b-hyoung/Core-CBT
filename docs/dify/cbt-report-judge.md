# Dify 워크플로 구축 가이드: `cbt-report-judge`

신고 1건을 입력받아 `verdict / target_field / new_value / reasoning / confidence` 를 산출하는 워크플로다. Dify Cloud UI 에서 따라 만들 수 있도록 정리했다.

## 0. 워크플로 생성

1. Dify Cloud → Studio → Create from Blank → **Workflow** 선택.
2. 이름: `cbt-report-judge`, 설명: `CBT 문제 신고 1건을 분석해 수정안을 산출한다.`
3. 생성 후 캔버스에서 Start → LLM → Code → End 노드를 차례로 연결한다.

## 1. Start 노드 — 입력 변수

| 변수명 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `report_id` | string | Y | 신고 ID (멱등성 키) |
| `question_text` | paragraph | Y | 문항 본문 |
| `options_json` | string | Y | 보기 4개를 직렬화한 JSON 문자열. 예: `["A","B","C","D"]` |
| `correct_answer_index` | number | Y | 현재 정답 인덱스 (0-based) |
| `correct_answer_text` | string | Y | 현재 정답 텍스트 |
| `current_comment` | paragraph | Y | 현재 해설 |
| `report_reason` | string | Y | 신고 사유 (사용자 선택지) |
| `user_message` | paragraph | N | 신고자 자유 입력 |

## 2. LLM 노드

### 2.1 모델 설정

| 항목 | 값 |
|---|---|
| Provider / Model | Anthropic / `claude-sonnet-4-6` (비용 절감 시 `claude-haiku-4-5`) |
| Temperature | `0.2` |
| Max tokens | `1500` |
| Response Format | `JSON` |
| Memory | OFF |

### 2.2 시스템 프롬프트 (그대로 붙여넣기)

```
당신은 한국 정보처리산업기사 / SQLD CBT 문제의 신고를 검토하는 시니어 출제 검토관이다.
사용자가 1건의 문항 신고를 보냈다. 너의 임무는 신고가 타당한지 판단하고, 타당하다면 데이터셋의 어느 필드를 어떻게 고칠지 한국어로 제안하는 것이다.

다음 입력을 받는다:
- question_text: 문항 본문
- options: 보기 배열 (JSON 문자열, 4개)
- correct_answer_index: 현재 정답의 0-based 인덱스
- correct_answer_text: 현재 정답 텍스트
- current_comment: 현재 해설
- report_reason: 신고 카테고리
- user_message: 신고자 자유 입력 (없을 수 있음)

판단 기준:
1. 신고 내용을 근거로 문항/정답/해설이 실제로 틀렸거나 미흡한지 검토한다.
2. 신고가 단순 오해이거나 근거 없는 항의면 invalid_report.
3. 명백한 오류가 있고 수정안이 자명하면 valid_fix.
4. 오류 가능성은 있으나 confidence 가 낮거나 출제 의도를 알 수 없으면 needs_human.

출력은 반드시 아래 JSON 단일 객체만 반환한다. 코드펜스, 주석, 설명문 절대 금지.

{
  "verdict": "valid_fix" | "invalid_report" | "needs_human",
  "target_field": "comment" | "answer" | "problem" | null,
  "new_value": <아래 형식> | null,
  "reasoning": "한국어 2~4문장. 판단 근거.",
  "confidence": 0.0 ~ 1.0
}

new_value 형식 (target_field 에 따라):
- "comment": string — 개선된 해설 전문. 마크다운 금지, 평문.
- "answer":  { "correct_answer_index": int(0~3), "correct_answer_text": string }
- "problem": { "question_text": string, "options": [4개 string] }
- target_field 가 null 이면 new_value 도 null.

제약:
- options 는 정확히 4개 유지.
- correct_answer_index 는 0,1,2,3 중 하나.
- 해설은 한국어, 평문, 5자 이상 5000자 이하.
- verdict 가 valid_fix 인데 target_field/new_value 중 하나라도 누락되면 needs_human 으로 강등될 것임을 의식할 것.
- confidence 가 0.6 미만이면 verdict 를 needs_human 으로 둘 것.
```

### 2.3 User 프롬프트 템플릿

```
report_id: {{report_id}}
report_reason: {{report_reason}}
user_message: {{user_message}}

[문항]
{{question_text}}

[보기 JSON]
{{options_json}}

[현재 정답]
index={{correct_answer_index}}, text={{correct_answer_text}}

[현재 해설]
{{current_comment}}
```

### 2.4 출력 변수

| 변수명 | 타입 |
|---|---|
| `llm_text` | string |

## 3. Code 노드 (Python) — 파싱 + 안전장치

| 항목 | 값 |
|---|---|
| Runtime | Python 3 |
| Input variables | `llm_text` (string), `report_reason` (string) |
| Output variables | 아래 코드의 return dict 키 그대로 |

> ⚠ Dify Code 노드의 Output Variables 는 타입이 엄격해서 `None` 반환을 거부한다 ("Not all output parameters are validated" 에러). 빈 문자열 `''` / 빈 dict `{}` 로 대체한다. `new_value` 가 string 인 경우 (`target_field == 'comment'`) 도 dict 로 래핑해서 타입을 일관되게 유지한다.

```python
import json, re

def main(llm_text: str, report_reason: str) -> dict:
    text = (llm_text or '').strip()
    # 코드펜스 제거
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)

    def fail(msg: str) -> dict:
        return {
            'verdict': 'needs_human',
            'target_field': '',
            'new_value': {},
            'reasoning': msg,
            'confidence': 0.0,
        }

    try:
        obj = json.loads(text)
        if not isinstance(obj, dict):
            raise ValueError('not an object')
    except Exception as e:
        return fail(f'Dify LLM 응답 파싱 실패: {e}')

    verdict = obj.get('verdict')
    target_field = obj.get('target_field') or ''
    new_value = obj.get('new_value')
    # new_value 를 항상 dict 로 정규화 (Dify Object 타입 호환)
    if new_value is None:
        new_value = {}
    elif isinstance(new_value, str):
        new_value = {'value': new_value}
    reasoning = (obj.get('reasoning') or '').strip()
    try:
        confidence = float(obj.get('confidence') or 0.0)
    except Exception:
        confidence = 0.0

    if verdict not in ('valid_fix', 'invalid_report', 'needs_human'):
        verdict = 'needs_human'
        reasoning = (reasoning + ' [verdict invalid]').strip()

    if verdict == 'valid_fix':
        if target_field not in ('comment', 'answer', 'problem') or not new_value:
            verdict = 'needs_human'
            reasoning = (reasoning + ' [target_field/new_value missing]').strip()

    if confidence < 0.6 and verdict == 'valid_fix':
        verdict = 'needs_human'
        reasoning = (reasoning + ' [confidence<0.6]').strip()

    # 사이즈 가드 (comment 길이)
    if verdict == 'valid_fix' and target_field == 'comment':
        s = new_value.get('value', '') if isinstance(new_value, dict) else ''
        if len(s) < 5 or len(s) > 5000:
            verdict = 'needs_human'
            reasoning = (reasoning + ' [comment length out of range]').strip()

    return {
        'verdict': verdict,
        'target_field': target_field if verdict == 'valid_fix' else '',
        'new_value': new_value if verdict == 'valid_fix' else {},
        'reasoning': reasoning,
        'confidence': round(confidence, 2),
    }
```

### 3.1 Output Variables 선언 (Dify UI)

Code 노드 하단 **Output Variables** 에 정확히 다음 5개를 등록해야 한다:

| Variable Name | Type |
|---|---|
| `verdict` | String |
| `target_field` | String |
| `new_value` | Object |
| `reasoning` | String |
| `confidence` | Number |

`target_field` / `new_value` 를 nullable 로 두지 말고, valid_fix 가 아닐 때 빈 문자열/빈 dict 로 채워 보내는 것이 코드와 일치한다.

### 3.2 new_value 페이로드 형식 (호출자가 알아야 할 계약)

`target_field` 별로 `new_value` 의 dict 구조가 다르다:

| target_field | new_value 키 |
|---|---|
| `comment` | `{ "value": <개선된 해설 string> }` |
| `answer` | `{ "correct_answer_index": int, "correct_answer_text": string }` |
| `problem` | `{ "question_text": string, "options": [4개 string] }` |
| `''` (verdict != valid_fix) | `{}` |

> n8n 측 PR 빌더에서 `target_field` 로 분기 후 위 키들을 그대로 꺼내 쓰면 된다. comment 만 `.value` 한 단계 더 내려간다는 점 주의.

> `target_file` 과 `problem_number` 는 Dify 만으로 결정할 수 없다 (데이터셋 경로 매핑은 Next.js 책임). n8n 측 `Parse Dify` Set 노드에서 `target_file = $node["Report Webhook"].json.body.dataset_path + "/" + ({comment:"comment1.json", answer:"answer1.json", problem:"problem1.json"}[target_field])`, `problem_number = $node["Report Webhook"].json.body.origin.problem_number` 로 채운다.

## 4. End 노드 — 출력 변수 매핑

| End 노드 변수 | 소스 |
|---|---|
| `verdict` | Code 노드 `verdict` |
| `target_field` | Code 노드 `target_field` |
| `new_value` | Code 노드 `new_value` |
| `reasoning` | Code 노드 `reasoning` |
| `confidence` | Code 노드 `confidence` |

> n8n 의 `Parse Dify` Set 노드는 `$json.data.outputs.<name>` 으로 접근하므로 변수 이름이 정확히 일치해야 한다.

## 5. API 키 발급 / 사용

1. 워크플로 우상단 **Publish** → **Access API**.
2. **API Keys** 탭에서 새 키를 발급 (`app-xxxxxxxxxx`).
3. n8n 의 `Dify Bearer` Credential 에 `Bearer app-xxxxxxxxxx` 형태로 등록.
4. 엔드포인트: `POST https://api.dify.ai/v1/workflows/run`.

응답 예 (성공):
```json
{
  "workflow_run_id": "...",
  "task_id": "...",
  "data": {
    "outputs": {
      "verdict": "valid_fix",
      "target_field": "answer",
      "new_value": { "correct_answer_index": 0, "correct_answer_text": "BGP" },
      "reasoning": "...",
      "confidence": 0.92
    },
    "status": "succeeded"
  }
}
```

## 6. 테스트 페이로드

Dify Studio → 우상단 **Preview** → **Run** 에서 직접 입력하거나, 아래 curl 로 단독 호출.

```bash
curl -X POST https://api.dify.ai/v1/workflows/run \
  -H 'Authorization: Bearer app-xxxxxxxxxx' \
  -H 'Content-Type: application/json' \
  -d @payload.json
```

### 6.1 정답 오류 신고 (valid_fix 기대)

```json
{
  "inputs": {
    "report_id": "t_answer_wrong",
    "question_text": "라우팅(Routing) 프로토콜이 아닌 것은?",
    "options_json": "[\"BGP\",\"OSPF\",\"SMTP\",\"RIP\"]",
    "correct_answer_index": 0,
    "correct_answer_text": "BGP",
    "current_comment": "BGP는 라우팅이 아닙니다.",
    "report_reason": "정답 오류",
    "user_message": "BGP는 대표적인 외부 라우팅 프로토콜인데 정답이 BGP로 표시됩니다. SMTP가 맞을 것 같습니다."
  },
  "response_mode": "blocking",
  "user": "test"
}
```

### 6.2 무효 신고 (invalid_report 기대)

```json
{
  "inputs": {
    "report_id": "t_invalid",
    "question_text": "라우팅(Routing) 프로토콜이 아닌 것은?",
    "options_json": "[\"BGP\",\"OSPF\",\"SMTP\",\"RIP\"]",
    "correct_answer_index": 2,
    "correct_answer_text": "SMTP",
    "current_comment": "SMTP는 전자 우편 전송 프로토콜이므로 라우팅 프로토콜이 아닙니다.",
    "report_reason": "기타",
    "user_message": "SMTP가 정답으로 표시되는데, 최근 IETF 자료에서 SMTP relay 동작이 path 기반 라우팅과 유사하다고 본 적이 있어 정답이 의심됩니다. 또한 RIP은 현업에서 거의 안 쓰이는 deprecated 프로토콜이라 보기에 포함되는 게 적절한지도 의문입니다. 정답을 BGP로 정정해야 한다고 봅니다."
  },
  "response_mode": "blocking",
  "user": "test"
}
```

### 6.3 해설 부족 신고 (valid_fix, target_field='comment' 기대)

```json
{
  "inputs": {
    "report_id": "t_comment_short",
    "question_text": "프로세스의 정의 중 틀린 것은?",
    "options_json": "[\"동기적 행위를 일으키는 주체\",\"실행중인 프로그램\",\"PCB를 가진 프로그램\",\"프로세서가 할당되는 실체\"]",
    "correct_answer_index": 0,
    "correct_answer_text": "동기적 행위를 일으키는 주체",
    "current_comment": "비동기입니다.",
    "report_reason": "해설 부족",
    "user_message": "왜 동기적이 틀렸는지, 정확한 정의가 무엇인지 설명이 너무 짧습니다."
  },
  "response_mode": "blocking",
  "user": "test"
}
```
