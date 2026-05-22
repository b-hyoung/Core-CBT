# Code 문제 세부 유형 태깅 & 유사 문제 생성 개선 설계

## 1. 배경 및 목적

### 현재 문제점
1. **분류 체계가 너무 넓음**: `Code → C/Java/Python` 수준까지만 분류. 사용자는 "C 포인터를 자주 틀린다" 같은 세부 약점을 파악할 수 없음.
2. **유사 문제 품질 저하**: AI(GPT-4o-mini)가 유사 문제를 생성할 때 원래 문제와 거의 동일한 코드를 뱉음. 프롬프트에 "무엇을 테스트하는 문제인지" 맥락이 없기 때문.
3. **중복 방지 로직 부족**: `dispatch.py`의 `_check_answer_duplicate`는 정답 텍스트만 비교. 코드 구조가 같아도 정답만 다르면 통과됨.

### 목표
- 83개 Code 문제에 대해 3단계 세부 유형 태깅 완료 (완료됨)
- 태그 데이터를 AI 프롬프트에 주입하여 유사 문제 생성 정확도 향상
- 사용자에게 개념별 약점 분석 데이터 제공

---

## 2. 태깅 스키마

### 파일 위치
```
datasets/tags/code-tags.json    ← Code 문제 (완료)
datasets/tags/sql-tags.json     ← SQL 문제 (향후)
datasets/tags/theory-tags.json  ← 이론 문제 (향후)
```

### 스키마 구조
```json
{
  "practical-industrial-2024-1:3": {
    "language": "Python",
    "concept": "클래스 상속",
    "detail": "super()를 이용한 부모 생성자 호출",
    "tags": ["OOP", "상속", "super()"],
    "required_knowledge": ["클래스 정의", "생성자(__init__)", "상속 문법"],
    "problem_style": "실행결과 예측"
  }
}
```

### 필드 정의

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `language` | string | O | `"C"` / `"Java"` / `"Python"` |
| `concept` | string | O | 2단계 핵심 개념 (예: "포인터", "재귀 함수") |
| `detail` | string \| null | O | 3단계 세부 패턴. 단순 문제는 `null` |
| `tags` | string[] | O | 검색/필터용 키워드 배열 |
| `required_knowledge` | string[] | O | 이 문제를 풀기 위한 선수 지식 목록 |
| `problem_style` | string | O | 고정 4종: `"실행결과 예측"` / `"빈칸 채우기"` / `"코드 작성"` / `"오류 수정"` |

### 키 형식
```
{session_id}:{problem_number}
예: practical-industrial-2024-1:3
```

---

## 3. 태깅 현황 (완료)

| 항목 | 수치 |
|------|------|
| 총 태깅 문제 | 83개 |
| C | 47개 |
| Java | 27개 |
| Python | 9개 |
| 실행결과 예측 | 73개 |
| 빈칸 채우기 | 10개 |

### 주요 concept 분포 (상위 10)
| concept | 수 |
|---------|-----|
| 재귀 함수 | 4 |
| 반복문을 이용한 누적 합산 | 3 |
| 반복문 | 3 |
| 포인터 | 3 |
| 반복문과 조건문 | 2 |
| 퀵 정렬 | 2 |
| 정렬 알고리즘 | 2 |
| 2차원 배열 | 2 |
| 이중 포인터 | 2 |
| 상속과 다형성 | 2 |

---

## 4. 프롬프트 개선 설계

### 4-1. 현재 프롬프트 문제점 (`prompts.py:70-74`)

```
· Code: 변수값·연산·반복 횟수 등을 변경해서 출력이 달라지게.
```

이것만으로는:
- AI가 원래 문제의 **핵심 개념**을 모름
- "구조는 같되 다른 문제"를 설계할 기반 정보가 없음
- 결과: 코드를 거의 복사하고 숫자만 바꾸는 패턴

### 4-2. 개선: 태그 데이터 주입

`build_main_system_prompt`에서 태그 데이터를 함께 주입:

```python
def build_main_system_prompt(
    source_session_id: str,
    problem_number: int,
    category: str,
    subcategory: str | None,
    problem_tags: dict | None = None,  # 새로 추가
) -> str:
```

### 4-3. 프롬프트 변경안

기존 유사 문제 생성 규칙 (프롬프트 4번 항목)에 아래를 추가:

```
[원래 문제의 유형 분석]
- concept: {concept}
- detail: {detail}
- required_knowledge: {required_knowledge}
- problem_style: {problem_style}

[유사 문제 생성 규칙 - Code]
1. **같은 concept를 테스트**하되, 완전히 새로운 코드를 작성할 것.
   - 원래 코드를 복사하거나 변수명만 바꾸는 것은 금지.
   - 같은 concept를 테스트하는 새로운 시나리오를 설계하라.

2. **변형 전략** (아래 중 1개 이상 적용):
   a) 코드 구조 변형: 같은 개념이지만 다른 코드 패턴 사용
      예) 포인터 swap → 세 변수 순환 교환, 배열 원소 교환
   b) 복합 개념: required_knowledge 중 2개 이상을 결합한 문제
      예) 포인터 + 구조체, 재귀 + 배열
   c) problem_style 변형: 실행결과 예측 → 빈칸 채우기 (또는 반대)
   d) 난이도 조절: 같은 concept에서 단계를 올리거나 내림

3. **정답이 반드시 달라야 한다** (기존 규칙 유지).

4. **자기 검증**: 생성한 코드를 한 줄씩 추적하여 expected_answer가 맞는지 확인.
   확신도(confidence)가 3 이하면 코드를 다시 작성.
```

### 4-4. 프롬프트 주입 예시

포인터 문제를 복습 중인 유저에게 AI가 유사 문제를 낼 때:

**Before (현재):**
```
Code: 변수값·연산·반복 횟수 등을 변경해서 출력이 달라지게.
```

**After (개선):**
```
[원래 문제의 유형 분석]
- concept: 포인터를 이용한 값 교환
- detail: 포인터 매개변수로 두 변수의 값을 교환(swap)하는 함수
- required_knowledge: ["포인터 매개변수", "역참조를 통한 값 변경", "함수 반환값", "산술 연산"]
- problem_style: 실행결과 예측

[유사 문제 생성 규칙 - Code]
1. 같은 concept(포인터를 이용한 값 교환)를 테스트하되, 완전히 새로운 코드를 작성.
2. 변형 전략:
   a) 두 변수 swap → 세 변수 순환 교환(a→b→c→a)
   b) swap 함수 + 배열 역순 정렬 결합
   c) 실행결과 예측 대신 빈칸 채우기로 변형
3. 원래 코드를 복사하지 말 것. 새 시나리오를 설계할 것.
```

---

## 5. 데이터 흐름

### 5-1. 태그 로드 경로

```
datasets/tags/code-tags.json
  ↓
fastapi_app/tools/question.py (get_question_detail에서 태그 병합)
  ↓
fastapi_app/constants/prompts.py (시스템 프롬프트에 주입)
  ↓
GPT-4o-mini가 concept/detail/required_knowledge를 참고하여 유사 문제 생성
```

### 5-2. 프론트엔드 활용 경로

```
datasets/tags/code-tags.json
  ↓
app/practical/_lib/practicalData.js (태그 로드 헬퍼 추가)
  ↓
CoachProblemListClient.js
  ├── concept별 그룹핑/필터 UI
  ├── 약점 분석 표시 (자주 틀리는 concept 하이라이트)
  └── required_knowledge 기반 학습 경로 제안
```

---

## 6. 구현 범위

### Phase 1 (이번 작업)
- [x] Code 문제 83개 태깅 완료 → `datasets/tags/code-tags.json`
- [ ] `prompts.py` 개선: 태그 데이터 주입 블록 추가
- [ ] `build_main_system_prompt` 시그니처 확장
- [ ] `get_question_detail`에서 태그 데이터 병합하여 반환
- [ ] 프롬프트 버전 `v1.0` → `v1.1` 업데이트

### Phase 2 (후속)
- [ ] 프론트엔드 concept별 필터/그룹핑 UI
- [ ] 약점 분석 대시보드 (concept별 정답률)
- [ ] SQL/이론 문제 태깅 확장
- [ ] `_check_answer_duplicate`에 코드 구조 유사도 체크 추가

---

## 7. 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `datasets/tags/code-tags.json` | 신규 생성 (완료) |
| `fastapi_app/constants/prompts.py` | 프롬프트 개선 + 태그 주입 블록 |
| `fastapi_app/tools/question.py` | 태그 데이터 로드 및 병합 |
| `app/practical/_lib/practicalData.js` | 태그 로드 헬퍼 (Phase 2) |
| `app/practical/coach/[category]/CoachProblemListClient.js` | concept 필터 UI (Phase 2) |
