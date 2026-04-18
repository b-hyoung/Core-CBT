-- 테스트유저 더미 데이터
-- testuser@test.com 으로 로그인 후 /mypage 에서 오답노트 확인용
-- Supabase 대시보드 > SQL Editor 에서 실행

INSERT INTO analytics_events (id, type, client_id, session_id, payload, path, timestamp, user_agent)
VALUES
(
  'dummy_test_001',
  'finish_exam',
  'dummy-client-testuser',
  '1',
  '{
    "isOverallPass": false,
    "totalCorrect": 42,
    "__meta": {
      "userEmail": "testuser@test.com",
      "userName": "테스트유저"
    },
    "problemOutcomes": [
      {
        "sessionId": "1",
        "problemNumber": 3,
        "localProblemNumber": 3,
        "selectedAnswer": "2",
        "correctAnswer": "4",
        "isCorrect": false,
        "isUnknown": false
      },
      {
        "sessionId": "1",
        "problemNumber": 7,
        "localProblemNumber": 7,
        "selectedAnswer": "1",
        "correctAnswer": "3",
        "isCorrect": false,
        "isUnknown": false
      },
      {
        "sessionId": "1",
        "problemNumber": 12,
        "localProblemNumber": 12,
        "selectedAnswer": "__UNKNOWN_OPTION__",
        "correctAnswer": "2",
        "isCorrect": false,
        "isUnknown": true
      },
      {
        "sessionId": "1",
        "problemNumber": 15,
        "localProblemNumber": 15,
        "selectedAnswer": "3",
        "correctAnswer": "3",
        "isCorrect": true,
        "isUnknown": false
      },
      {
        "sessionId": "1",
        "problemNumber": 20,
        "localProblemNumber": 20,
        "selectedAnswer": "__UNKNOWN_OPTION__",
        "correctAnswer": "1",
        "isCorrect": false,
        "isUnknown": true
      }
    ]
  }'::jsonb,
  '/test/1',
  '2026-04-01T10:00:00.000Z',
  'Mozilla/5.0 (test)'
),
(
  'dummy_test_002',
  'finish_exam',
  'dummy-client-testuser',
  '2',
  '{
    "isOverallPass": false,
    "totalCorrect": 38,
    "__meta": {
      "userEmail": "testuser@test.com",
      "userName": "테스트유저"
    },
    "problemOutcomes": [
      {
        "sessionId": "2",
        "problemNumber": 5,
        "localProblemNumber": 5,
        "selectedAnswer": "1",
        "correctAnswer": "2",
        "isCorrect": false,
        "isUnknown": false
      },
      {
        "sessionId": "2",
        "problemNumber": 9,
        "localProblemNumber": 9,
        "selectedAnswer": "__UNKNOWN_OPTION__",
        "correctAnswer": "4",
        "isCorrect": false,
        "isUnknown": true
      },
      {
        "sessionId": "2",
        "problemNumber": 18,
        "localProblemNumber": 18,
        "selectedAnswer": "4",
        "correctAnswer": "1",
        "isCorrect": false,
        "isUnknown": false
      }
    ]
  }'::jsonb,
  '/test/2',
  '2026-04-01T14:00:00.000Z',
  'Mozilla/5.0 (test)'
);
