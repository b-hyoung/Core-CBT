-- 오늘의 복습: LLM 생성 변형 문제 저장
-- 설계: docs/superpowers/specs/2026-07-13-daily-review-design.md
-- 실행: Supabase SQL Editor에서 수동 실행 (CLI 없음)

CREATE TABLE IF NOT EXISTS public.generated_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  source_session_id text NOT NULL,
  source_problem_number int NOT NULL,
  kind text NOT NULL DEFAULT 'variant',        -- variant | expansion | coverage
  concept_tag text,
  problem jsonb NOT NULL,                      -- 데이터셋 problem 객체 shape
  answer text NOT NULL,
  accepted_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  comment text NOT NULL DEFAULT '',
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',      -- pending | done | discarded
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_result_at timestamptz
);

-- due 조회 (풀이 페이지의 핵심 쿼리)
CREATE INDEX IF NOT EXISTS idx_generated_problems_due
  ON public.generated_problems (user_email, status, due_date);

-- origin 매칭 (결과 반영·중복 생성 방지)
CREATE INDEX IF NOT EXISTS idx_generated_problems_origin
  ON public.generated_problems (user_email, source_session_id, source_problem_number, status);
