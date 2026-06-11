# CBT 신고 자동 수정 — GitHub PR 반영 설계

날짜: 2026-06-11
상태: 설계 승인됨 (구현 전)

## 배경

n8n 워크플로우 `cbt-report-handler`(uRc4aH89U3lTTLT7)는 문제 신고를 받아
Dify AI로 판정(valid_fix / invalid_report / needs_human)까지 수행하지만,
valid_fix여도 실제 수정 없이 Slack 드라이런 알림만 보낸다.
이 설계는 valid_fix 판정 시 Core-CBT 저장소에 수정 PR을 자동 생성하는 기능을 추가한다.

## 결정사항

| 항목 | 결정 | 근거 |
|---|---|---|
| 반영 방식 | **PR 생성** (직접 커밋 아님) | 서비스 노출 데이터라 사람이 diff 확인 후 머지 |
| 수정 허용 범위 | 자동 수정은 **해설(comment)·힌트(hint)·답번호(correct_answer_index) 3종 필드만** — 프롬프트 가중치와 출력 계약으로 강제 | 문제 지문/보기 변경이 필요한 건은 needs_human으로 사람이 처리 |
| 아키텍처 | **B안: n8n → repository_dispatch → GitHub Action** | 역할 분리로 디버깅 용이, 수정 로직이 저장소 코드로 관리됨 |
| 파일 특정 | **신고 payload에 `origin.dataset_path` 포함** (프론트엔드가 전송) | 동명 회차 폴더가 여러 팩에 존재하므로 검색 방식은 오탐 위험 |

## 아키텍처

```
[Core-CBT 앱]               [n8n cbt-report-handler]        [GitHub Core-CBT]
 신고 (dataset_path 포함) → 시크릿 검증
                            → Slack 접수 알림
                            → Dify 판정 (개선된 프롬프트)
                            → Supabase 저장
                            → valid_fix → IF (REPORT_DRY_RUN?)
                               ├ true  → 드라이런 Slack 알림 (현행)
                               └ false → repository_dispatch ──→ Action: apply-report-fix
                                          → Slack "PR 요청됨"        → JSON 필드 교체 (스크립트)
                                                                     → 브랜치 → 커밋 → PR 생성
                                                                     → 사람이 리뷰 후 머지
```

## 구성요소별 변경

### ① 프론트엔드 (Core-CBT 앱)

신고 요청 body의 `origin`에 현재 문제의 출처 폴더 경로 추가:

```json
"origin": {
  "session_id": "2024-third",
  "problem_number": 7,
  "dataset_path": "datasets/practicalIndustrial/2024-third"
}
```

### ② Dify 프롬프트 (Dify 화면에서 적용)

- 출력 계약 고정: `verdict`, `target_field` ∈ {`comment`, `hint`, `correct_answer_index`},
  `new_value`, `reasoning`(필수, 한국어), `confidence`
- 가중치 지시: 해설/힌트/답번호 수정으로 해결 가능하면 valid_fix + 해당 필드 지정.
  문제 지문·보기 텍스트 자체를 바꿔야 하면 needs_human.
- 현재 빈 값으로 나오는 `reasoning` 출력 변수 매핑 수정 (선결 과제)

### ③ n8n 워크플로우 (MCP로 적용)

- valid_fix 분기에 IF 노드 추가: `REPORT_DRY_RUN` true면 현행 드라이런 알림,
  false면 HTTP Request 노드로 `POST /repos/b-hyoung/Core-CBT/dispatches`
  (기존 "GitHub account" 자격증명 사용, `event_type: cbt-report-fix`)
- dispatch 후 Slack "수정 PR 생성 요청됨" 알림
- dispatch payload:

```json
{
  "event_type": "cbt-report-fix",
  "client_payload": {
    "report_id": "...",
    "dataset_path": "datasets/practicalIndustrial/2024-third",
    "problem_number": 7,
    "target_field": "comment",
    "new_value": "...",
    "reasoning": "...",
    "confidence": 0.92
  }
}
```

### ④ GitHub Action + 스크립트 (이 저장소에 추가)

- `.github/workflows/cbt-report-fix.yml`: `repository_dispatch(types: [cbt-report-fix])` 트리거
- `scripts/apply-report-fix.mjs`:
  1. payload 검증, `dataset_path`가 `datasets/` 하위인지 확인 (경로 탈출 방지)
  2. `target_field` → 파일 매핑: comment→`comment*.json`, hint→`hint*.json`,
     correct_answer_index→`answer*.json` (폴더 내에서 해당 `problem_number`를 포함한 파일 선택)
  3. 배열에서 `problem_number` 항목을 찾아 해당 필드만 교체, 타입 검증 후 재직렬화
  4. 브랜치 `report-fix/<report_id>` → 커밋 → PR 생성 (본문에 reasoning·confidence·report_id)
- 로컬 단독 실행 지원 (`node scripts/apply-report-fix.mjs --test`)

## 에러 처리

| 실패 지점 | 동작 |
|---|---|
| dispatch 발송 실패 (n8n) | Slack 🔴 알림 + 관리자 멘션 |
| 스크립트 실패 (파일/항목 없음, JSON 깨짐) | 수정 없이 Action 실패 종료, 커밋 안 함 |
| new_value 타입 불일치 | 스크립트가 검증 후 거부 |
| 동일 report_id 재발송 | 같은 브랜치명 재사용 → 기존 PR 갱신, 중복 PR 없음 |

원칙: 검증을 전부 통과했을 때만 커밋한다. 어떤 실패도 잘못된 상태의 커밋을 만들지 않는다.

## 테스트 계획

1. 스크립트 단독: 가짜 payload로 로컬 실행, 커밋 없이 변경 결과 확인
2. Action 단독: `gh api`로 dispatch 수동 발송 → PR 생성 확인 (n8n 무관)
3. E2E 드라이런: `REPORT_DRY_RUN=true`로 신고 → 드라이런 Slack 메시지 확인
4. E2E 실전: `REPORT_DRY_RUN=false` → 테스트 신고 → PR 확인 → 테스트 PR 닫기

## 선결 과제

- Dify 출력 변수 매핑 수정: `reasoning`이 빈 값으로 반환되는 문제.
  `target_field`/`new_value`도 계약대로 나오는지 valid_fix 케이스로 검증 필요.

## v1 제외 (YAGNI)

- Action → Slack PR 링크 알림 (저장소 Secret 추가 필요, GitHub 알림으로 대체)
- payload에 경로 없을 때의 검색 폴백
