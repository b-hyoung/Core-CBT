# 실기 UX — 입력 투명성 + 결과 피드백 강화 설계

- **작성일**: 2026-04-15
- **브랜치**: `feat/practical-ux-revamp`
- **범위**: Phase 1 (기능). Phase 2 impeccable 리뉴얼은 별도 spec
- **목표**: 실기 풀이에서 (a) "무엇이 정답으로 인정되는지" 입력 전 명확화, (b) 채점 후 내 답 vs 정답 비교 + 관대 채점 이유 노출

## 문제 정의

- `input_type`이 5종(`single / ordered_sequence / unordered_symbol_set / multi_blank / textarea`)이지만 `answer_format_hint`는 일부 문항에만 존재 → 사용자가 입력 규칙 추측
- `isPracticalAnswerMatch`(`PracticalQuiz.js` ~90줄 + normalizer 8개)가 관대하게 채점하지만, 그 관대함을 사용자가 신뢰할 수 없어 여러 포맷 시도
- 채점 직후 `multi_blank`/`ordered_sequence`에서 라벨별·위치별 정오 구분 없음
- 내 답과 정답의 diff 시각화 없음 → 오답 원인 학습 효율 낮음

## 설계 결정

| 결정 | 값 | 이유 |
|---|---|---|
| 힌트 데이터 소스 | Hybrid: 자동 추론 + Supabase override | 운영 루프와 정합, 점진 개선 |
| 결과 피드백 수준 | Level 3 (per-field + diff + 채점 이유) | 관대 채점의 블랙박스 해소 |
| Override 저장소 | Supabase (`practical_hint_overrides`) | 기존 이벤트/신고/캐시 패턴 일치 |
| 관리자 UI | 기존 `/admin` 대시보드 탭 추가 | 운영 흐름 단일화 |
| 채점 모듈 위치 | `app/practical/[sessionId]/_lib/gradePracticalAnswer.js` | PracticalQuiz.js 본체 수정 최소화 |

## 아키텍처

```
app/practical/[sessionId]/
├── _lib/
│   ├── practicalData.js             (수정) hint override 병합
│   ├── gradePracticalAnswer.js      (신규) 채점 모듈, reasons/fieldResults/diff 반환
│   └── inferAnswerFormat.js         (신규) 자동 포맷 추론
├── components/
│   ├── AnswerHint.js                (신규) 입력 힌트 표시
│   └── ResultFeedback.js            (신규) 채점 후 diff·reasons·per-field
└── PracticalQuiz.js                 (부분 수정) UI 삽입 지점만 변경

app/api/
├── practical-hints/route.js         (신규) GET
└── admin/practical-hints/route.js   (신규) PUT / DELETE

app/admin/practical-hints/page.js    (신규) 관리자 UI

supabase.practical_hint_overrides    (신규 테이블)
```

### 데이터 흐름

1. SSR `loadPracticalQuizData(sessionId)` — 원본 JSON + Supabase overrides 병합 (회차당 1 쿼리)
2. 합성 세션(`random`, `100`, `high-wrong`, `high-unknown`)은 문제마다 `source_session_id`/`source_problem_number`로 override 조회
3. 각 문제에 최종 `answer_format_hint` (override → dataset → null) 병합
4. 클라이언트: `AnswerHint`가 hint 있으면 표시, 없으면 `inferAnswerFormat` 호출
5. 답안 확인 시 `gradePracticalAnswer`로 채점 → `ResultFeedback` 렌더

## 상세 설계

### Supabase 스키마

```sql
create table practical_hint_overrides (
  id              bigserial primary key,
  session_id      text not null,
  problem_number  int  not null,
  hint_text       text not null,
  updated_at      timestamptz not null default now(),
  updated_by      text,
  unique (session_id, problem_number)
);

create index practical_hint_overrides_session_idx
  on practical_hint_overrides (session_id);
```

- RLS: anon은 `select`만, insert/update/delete는 서비스 롤.
- 예상 row ≤ 200.

### 채점 모듈 (`gradePracticalAnswer.js`)

**반환형**
```ts
type GradeResult = {
  matched: boolean;
  reasons: Reason[];
  fieldResults?: FieldResult[];   // multi_blank / ordered_sequence
  diff?: { user: string; correct: string; segments: Segment[] };  // single / textarea
};

type Reason =
  | 'exact'
  | 'case_insensitive'
  | 'whitespace_ignored'
  | 'punctuation_ignored'
  | 'korean_english_pair'
  | 'label_normalized'
  | 'accepted_alternative'
  | 'order_independent';

type FieldResult = {
  label: string;
  userValue: string;
  correctValue: string;
  matched: boolean;
  reasons: Reason[];
};

type Segment = { type: 'equal' | 'added' | 'removed'; text: string };
```

**구현 전략**
- 기존 `isPracticalAnswerMatch` + 8 normalizer를 그대로 이관, 로직 변경 없음
- 각 normalizer 경로에 reason 태그 추가
- matched=true인 첫 경로에서 reasons 수집 후 리턴
- 호환 래퍼 유지: `export const isPracticalAnswerMatch = (...args) => gradePracticalAnswer(...).matched`
- diff: LCS 기반 문자 단위 (자체 구현 ~50줄), 길이 > 200자일 경우 단어 단위 폴백

### 자동 포맷 추론 (`inferAnswerFormat.js`)

- `[A-Z]+` → "영문 대문자"
- `[A-Z]{N}` 고정 길이 → "영문 대문자 N글자"
- 숫자 단일 → "숫자"
- `/` 또는 `,` 포함 → "쉼표로 구분"
- 한글·영문 혼재 → "한글 또는 영문 약어 모두 인정"
- 매칭 실패 시 `input_type` 기본 문구

### UI: `AnswerHint.js`

- 위치: 답안 입력 카드 헤더("답안 입력") 바로 아래, 입력 필드 위
- override 있으면 본문만, 자동 추론이면 "자동 추론" 작은 뱃지 포함
- 💡 아이콘 + 한 단계 작은 텍스트 + 회색 박스
- 상세 시각 디자인은 Phase 2 impeccable에서 정돈

### UI: `ResultFeedback.js`

현행 "정답/오답 + 해설" 영역 **대체**.

**구성 (3영역)**
1. **판정 헤더**: ✓/✗ + reasons 뱃지 (단, `reasons === ['exact']`면 뱃지 숨김)
2. **비교 영역**
   - `single`/`textarea`: side-by-side 2카드, diff.segments로 배경 하이라이트
   - `multi_blank`: 라벨·내 답·정답·✓/✗ 표, 틀린 행만 빨강 테두리
   - `ordered_sequence`: 슬롯별 칩, 내 답 줄 / 정답 줄 2줄
   - `unordered_symbol_set`: 기호 집합 2줄, 교집합=초록 / 차집합=빨강
3. **해설**: 기존 컴포넌트 재사용, `showExplanationWhenCorrect/Incorrect` 토글 유지

**접근성**
- 색상 외 ✓/✗ 텍스트 병행 (색맹 대응)
- `--theme-*` 토큰 준수 (다크모드)
- 모바일에서 side-by-side 세로 스택, 표는 카드 리스트로 전환

### API

**GET `/api/practical-hints?sessionId=...`** — 공용 조회
```json
{ "hints": { "3": "예: ① Degree ② Cardinality" } }
```

**PUT `/api/admin/practical-hints`** — 관리자 인증
```json
{ "sessionId": "2025-first", "problemNumber": 3, "hintText": "..." }
```

**DELETE `/api/admin/practical-hints`** — 관리자 인증
```json
{ "sessionId": "2025-first", "problemNumber": 3 }
```

**가드**
- 기존 `auth.js` 관리자 세션 검증 재사용
- `sessionId` 화이트리스트: `PRACTICAL_SESSION_CONFIG` 키 집합
- `problemNumber`: 양의 정수, 해당 세션 문항 수 이하
- `hintText`: 1–200자, 저장 시 원문 그대로 (렌더는 JSX 기본 escape)

### 관리자 UI (`/admin/practical-hints`)

- 상단: 회차 필터 드롭다운
- 리스트 테이블: `회차 | 번호 | 질문 요약 | 현재 힌트 | 출처(override/dataset/auto) | 액션`
- 수정 모달: 원본 질문 + examples 미리보기 (read-only), 현재 힌트/자동 추론/데이터셋 원본 참고 표시, textarea + 저장
- 합성 세션은 숨김 (원본 회차만 편집 대상)

## 테스트

- `gradePracticalAnswer.test.js`: 반환형/reasons/fieldResults/diff — 20 케이스
- `inferAnswerFormat.test.js`: 추론 규칙별 1케이스 — 10 케이스
- 컴포넌트 스냅샷: `AnswerHint` 3경로, `ResultFeedback` 4 input_type × 정/오답
- 수동 QA: 회차별 첫 문항 12개 / input_type 각 1문항 오답 / 관리자 CRUD / 모바일

## 롤아웃

1. Supabase 테이블 + RLS
2. `GET /api/practical-hints` (override 없어도 noop)
3. `AnswerHint` + `ResultFeedback` (override 비어도 자동 추론으로 동작)
4. 관리자 UI
5. 관리자가 점진적으로 override 채움

피처 플래그 없음. 각 단계 자체 안전.

## Phase 2 연결 (impeccable)

- `arrange` — 레이아웃/여백
- `typeset` — examples(표/코드/제시문) 타이포
- `harden` — 입력 오버플로, 긴 텍스트, 한자/특수문자 엣지
- `animate` — 채점 피드백 등장, 슬롯 focus 전환
- `polish` — 최종 디테일

Phase 1 완료 후 별도 spec으로 재개.

## 사전 코드 리뷰 반영 (Phase 1 범위 추가)

### P0 — 착수 직후 선처리

1. **GPT 상태 저장 effect 무한 루프 방어** (`PracticalQuiz.js:1094-1105`)
   - `buildGptStatePayloadWithPrune`가 항상 새 객체 참조를 반환 → `saved.conversations !== state` 참조 비교가 항상 true
   - 해결: `prunedCount > 0`일 때만 setState, 또는 내용 기반 shallow equality 비교
2. **`buildGptStatePayloadWithPrune`의 `nextUsed[key]` 무차별 삭제** (line 99)
   - `usedProblems`와 `conversations`의 키 체계 정합성 검증 후 선별 삭제
3. **`gradePracticalAnswer` 모듈 계약 문서화**
   - 필수 `problem` 필드: `input_type`, `input_labels`, `accepted_answers`, `examples`, `question_text`
   - 시그니처: `gradePracticalAnswer({ userAnswer, correctAnswer, problem })`

### P1 — 채점 모듈 추출 작업 내부에서 동시 수정

4. `parseLabeledMultiBlankValuesByKnownLabels`의 `indexOf` 기반 라벨 탐색을 word-boundary / 경계 문자 기반으로 교체 (`"가"` vs `"가격"` 오매칭)
5. `getSequenceMeta`: `mode === 'ordered' && markersCount === 0`일 때 `correctAnswer` 토큰을 분석해 count 결정
6. `splitMultiBlankDraft`: 한글 다문자 라벨(`"카디널리티"` 등)에서 공백 없이 이어지는 값 파싱 지원
7. `handleSequenceSlotInput`의 stale closure — `multiBlankDraftsRef` 패턴과 동일하게 ref 기반으로 교체
8. `buildAcceptedPracticalAnswers`의 paren 분할 regex — SQL 서브쿼리 오매칭 방지 (anchored 또는 unbalanced paren 가드)

### P2 — Phase 2 이월

- `estimateLocalStorageBytes` 정확도, `getLabeledTokenMatches` 분기 순서, `altAnswers` 렌더 dedupe 등 타이포·polish 수준 항목

## YAGNI 제외 항목

- 감사 로그 별도 테이블 (updated_at으로 충분)
- 힌트 버전 이력 관리
- PracticalQuiz.js 전체 리팩터 (Phase 2)
- 힌트 A/B 테스트, i18n
