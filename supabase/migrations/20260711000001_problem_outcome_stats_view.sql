-- 문제별 오답/모름 사전 집계 뷰
-- 설계 참조: docs/superpowers/specs/2026-07-11-problem-outcome-stats-view-design.md
-- 기존: 페이지 진입마다 problem_outcomes 전체(1.5만+행)를 다운로드해 JS에서 집계
-- 변경: DB가 문제 단위로 집계한 결과(수백 행)만 1회 조회

CREATE OR REPLACE VIEW public.problem_outcome_stats AS
SELECT
  btrim(source_session_id)                                          AS source_session_id,
  source_problem_number,
  COUNT(*)::int                                                     AS attempts,
  COUNT(*) FILTER (WHERE COALESCE(is_correct, false))::int          AS correct,
  COUNT(*) FILTER (WHERE NOT COALESCE(is_correct, false))::int      AS wrong,
  COUNT(*) FILTER (WHERE COALESCE(is_unknown, false))::int          AS "unknown",
  MAX("timestamp")                                                  AS last_seen_at
FROM public.problem_outcomes
WHERE COALESCE(btrim(source_session_id), '') <> ''
  AND COALESCE(source_problem_number, 0) > 0
GROUP BY btrim(source_session_id), source_problem_number;

-- 집계 원본 스캔 가속 (뷰 조회 시 GROUP BY 대상)
CREATE INDEX IF NOT EXISTS idx_problem_outcomes_source
  ON public.problem_outcomes (source_session_id, source_problem_number);
