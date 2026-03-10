# Core-CBT 문제 데이터 관리 자동화

## 목적
AI가 DB를 직접 수정하지 않고, GitHub PR 기반으로 문제 데이터(JSON) 변경 제안과 검수를 수행하는 운영 구조를 정의한다.

## 문제 데이터 저장 구조
현재 프로젝트 기준 문제 데이터는 `datasets/` 하위에 연도/세트 단위로 저장한다.

```text
datasets/
 ├ problem2022/
 │  ├ first/
 │  │  ├ problem1.json
 │  │  ├ answer1.json
 │  │  └ comment1.json
 │  ├ second/
 │  └ third/
 ├ problem2023/
 ├ problem2024/
 ├ problemNow_60/
 │  └ first/
 │     ├ problem1.json
 │     ├ answer1.json
 │     └ comment1.json
 └ problem100/
    ├ raw.txt
    ├ README.md
    └ first/
       ├ problem1.json
       ├ answer1.json
       └ comment1.json
```

운영 시 동일 구조를 `core-cbt-content` GitHub 저장소에 동기화하여 PR로만 변경한다.

## 사용자 신고 데이터 예시
```json
{
  "problem_id": "problem2024_first_q012",
  "type": "typo",
  "message": "보기 3번 문장이 이상합니다"
}
```

## AI 수정 제안 예시
```json
{
  "file": "datasets/problem2024/first/problem1.json",
  "changes": {
    "problems[11].options[2]": "수정된 보기 문장"
  }
}
```

## GitHub PR 생성 구조
브랜치 예시:

```text
fix/problem2024-first-q012-typo
```

PR 내용 예시:

```md
## 신고 정보
- problem_id: problem2024_first_q012
- type: typo
- message: 보기 3번 문장이 이상합니다

## AI 제안 변경
- file: datasets/problem2024/first/problem1.json
- field: problems[11].options[2]
- before: 기존 보기 문장
- after: 수정된 보기 문장

## 검수 체크
- [ ] 문장/오탈자 검수
- [ ] 정답 영향 여부 확인
- [ ] 서비스 반영 승인
```

## 전체 시스템 흐름
```text
사용자 신고
↓
AI 수정 제안
↓
GitHub PR 생성
↓
관리자 검수
↓
서비스 반영
```

## 운영 규칙
- AI는 DB 직접 수정 금지
- 정답 변경은 반드시 관리자 검수
- 문제 데이터는 GitHub 버전관리
