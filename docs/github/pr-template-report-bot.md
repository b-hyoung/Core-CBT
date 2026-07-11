# PR 본문 템플릿 — `report-bot`

n8n 의 `GH: Create PR` 노드 **Body** 필드에 그대로 붙여넣는다. `{{ ... }}` 는 n8n 표현식이다.

```markdown
> :robot: 이 PR 은 신고 처리 봇(`cbt-report-handler`)이 자동 생성했습니다. 반드시 사람이 리뷰 후 머지하세요.

## 신고 정보

- **report_id**: `{{$node["Parse Dify"].json.report_id}}`
- **회차 / 문항**: `{{$node["Parse Dify"].json.origin_session_id}}` / `{{$node["Parse Dify"].json.problem_number}}`
- **신고 사유**: {{$node["Report Webhook"].json.body.report.reason}}
- **신고자 메시지**: {{$node["Report Webhook"].json.body.report.user_message}}
- **신고 시각**: {{$node["Report Webhook"].json.body.reported_at}}

## Dify 판단

- **verdict**: `{{$node["Parse Dify"].json.verdict}}`
- **target_field**: `{{$node["Parse Dify"].json.target_field}}`
- **confidence**: `{{$node["Parse Dify"].json.confidence}}`
- **근거**:
  > {{$node["Parse Dify"].json.reasoning}}

## 수정 대상

- **파일**: `{{$node["Parse Dify"].json.target_file}}`
- **수정 영역**: `{{$node["Parse Dify"].json.target_field}}`
- **변경 후 값**:
  ```json
  {{ JSON.stringify($node["Parse Dify"].json.new_value, null, 2) }}
  ```

## 리뷰 체크리스트

- [ ] 신고 사유와 수정안이 일치한다
- [ ] `problem_number` 가 정확히 일치한다 (인덱스 의존 X)
- [ ] JSON 들여쓰기 2칸 + 끝줄 개행 1개 (기존 포맷 유지)
- [ ] 보기는 정확히 4개 (객관식의 경우)
- [ ] `correct_answer_index` 와 `correct_answer_text` 가 일관된다
- [ ] 해설은 평문, 5자 이상 5000자 이하

## 관련 링크

- Slack 스레드: `thread_ts={{$node["Parse Dify"].json.slack_thread_ts}}` (채널 `{{$env.SLACK_REPORT_CHANNEL}}`)
- Supabase row: `report_analysis.report_id = '{{$node["Parse Dify"].json.report_id}}'`
- Dify run: `{{$node["Parse Dify"].json.dify_workflow_run_id}}`

---
labels: `report-bot`, `needs-review`
```

## 사용 메모

- 위 본문 안의 ` ```json ... ``` ` 펜스 안에는 n8n 표현식 결과(JSON 문자열)가 그대로 들어간다. `JSON.stringify(..., null, 2)` 로 들여쓰기를 보존한다.
- n8n 의 `GH: Create PR` 노드는 `Labels` 필드를 별도로 받으므로, 본문 마지막의 `labels:` 줄은 가시성용 메모일 뿐이다.
- `target_file` 은 n8n `Parse Dify` Set 노드에서 `dataset_path` + 파일명으로 조합되어 들어온다 (Dify 자체에서 결정하지 않는다).
