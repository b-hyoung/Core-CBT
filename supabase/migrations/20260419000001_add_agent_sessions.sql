-- Core-CBT AI 학습 튜터 에이전트 세션 저장 테이블
-- 설계 참조: docs/superpowers/specs/2026-04-19-ai-tutor-agent-design.md §4.1

CREATE TABLE IF NOT EXISTS agent_sessions (
  id                  BIGSERIAL PRIMARY KEY,
  user_email          TEXT        NOT NULL,
  source_session_id   TEXT        NOT NULL,
  problem_number      INT         NOT NULL,
  category            TEXT,
  subcategory         TEXT,
  messages            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  tools_called        TEXT[]      NOT NULL DEFAULT '{}',
  turn_count          INT         NOT NULL DEFAULT 0,
  generated_problems  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  user_evaluations    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  prompt_version      TEXT        NOT NULL DEFAULT 'v1.0',
  quality_flag        TEXT,
  quality_note        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agent_sessions_unique UNIQUE (user_email, source_session_id, problem_number)
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user
  ON agent_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_problem
  ON agent_sessions(source_session_id, problem_number);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_category
  ON agent_sessions(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_updated
  ON agent_sessions(updated_at DESC);

-- RLS: 유저는 자신의 대화만 접근 가능
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_sessions_own ON agent_sessions;
CREATE POLICY agent_sessions_own ON agent_sessions
  FOR ALL
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

COMMENT ON TABLE agent_sessions IS 'AI 학습 튜터 에이전트 대화 세션 (per user × source_session × problem)';
COMMENT ON COLUMN agent_sessions.messages IS 'OpenAI chat completions 메시지 배열 (system/user/assistant/tool)';
COMMENT ON COLUMN agent_sessions.generated_problems IS 'present_similar_problem으로 생성한 문제들 (expected_answer 포함, 서버 전용)';
COMMENT ON COLUMN agent_sessions.user_evaluations IS 'submit_evaluation 결과 누적';
COMMENT ON COLUMN agent_sessions.quality_flag IS 'V2 파인튜닝용 수동 태그: good|bad|NULL';
