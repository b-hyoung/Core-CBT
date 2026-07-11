# 문제 통계 집계 뷰 (problem_outcome_stats) 설계

## 배경 (진단 결과)

실서버(Netlify)에서 `/practical`, `/test` 진입 시 1분 가까이 걸린다. 원인:

1. `getUtilityAvailability()`가 `readProblemOutcomes()`로 `problem_outcomes` 테이블
   전체(15,382행)를 1,000행씩 순차 페이지네이션으로 다운로드 (실측 13.8초).
2. 이 작업이 SSR에서 한 번, 클라이언트 `/api/user/review-availability` 호출로 한 번 더 실행.
3. Netlify 람다 ↔ Supabase 왕복 지연 + 콜드 스타트 가산.

`app/practical/high-wrong`, `high-unknown` 출제 페이지와 어드민 대시보드도 동일 패턴.
집계 결과는 어디에도 저장되지 않고 매 요청마다 원본에서 재계산된다.

## 결정

**읽기 시점 원본 전체 다운로드 → DB 집계 뷰 1회 조회**로 전환. (대안이었던
쓰기 시점 집계 테이블 갱신은 쓰기 로직 수정 범위가 커서 보류 — YAGNI.)

### 1. Supabase 뷰 (SQL 마이그레이션)

`supabase/migrations/20260711000001_problem_outcome_stats_view.sql`

`problem_outcomes`를 `(source_session_id, source_problem_number)`로 GROUP BY 하여
`attempts / correct / wrong / unknown / last_seen_at`을 집계하는 뷰.
15,382행 다운로드 → 결과 수백 행(문제 수만큼) 1요청.

**적용 방법:** Supabase 대시보드 → SQL Editor에서 파일 내용 실행 (DDL은 REST로 불가).

### 2. 코드 변경

- `lib/analyticsStore.js`
  - `readProblemOutcomeStats()`: 뷰 조회 (1요청, 페이지네이션 유지). 뷰 미존재/오류 시 `null` 반환.
  - `rankProblemWrongRatesFromStats()`, `rankProblemUnknownRatesFromStats()`: 뷰 행을
    기존 `aggregateProblem*RatesFromOutcomes()`와 **동일한 출력**(rate 계산·필터·정렬)으로 변환하는 순수 함수.
- `lib/reviewAvailability.js` — `getUtilityAvailability()`: 뷰 우선, `null`이면 기존 전체 다운로드 폴백.
- `app/practical/high-wrong/page.js`, `high-unknown/page.js`: 뷰 우선, 폴백 동일.
- `app/practical/page.js`, `app/test/page.js`: SSR에서 `getUtilityAvailability` 대기 제거
  (`initialUtilityAvailability=null` 전달). 클라이언트는 이미 null이면 'loading' 표시 후
  API로 채우는 설계라 동작 변화 없음. 페이지는 뷰 적용 전에도 즉시 뜬다.

### 3. 폴백 전략

뷰가 아직 없어도(SQL 미실행) 코드는 기존 경로로 동작한다. 배포 순서 무관.

## 테스트

`tests/problemOutcomeStats.test.js` — 동일 원본 데이터에 대해
`rank*FromStats(뷰 행)` 결과가 `aggregate*FromOutcomes(원본 행)` 결과와 정확히 일치함을 검증
(오라클 비교), minAttempts 필터·정렬·rate 반올림 포함.

## 기대 효과

- `/practical`, `/test` 진입: 즉시 렌더 (SSR 대기 제거)
- 가용성 API·고오답/고모름 출제: 13.8초+ → 1요청 (~0.3초)
- 어드민 대시보드는 후속 작업에서 같은 뷰 활용 가능 (이번 범위 아님)
