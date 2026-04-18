export const OBJECTIVE_SESSION_CONFIG = {
  'sqld-2024-1': {
    type: 'sqld',
    label: '2024-1',
    title: 'SQLD 2024년 1회',
    basePath: ['datasets', 'sqld', '2024-first'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'sqld-2024-2': {
    type: 'sqld',
    label: '2024-2',
    title: 'SQLD 2024년 2회',
    basePath: ['datasets', 'sqld', '2024-second'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'sqld-2024-3': {
    type: 'sqld',
    label: '2024-3',
    title: 'SQLD 2024년 3회',
    basePath: ['datasets', 'sqld', '2024-third'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'sqld-2025-1': {
    type: 'sqld',
    label: '2025-1',
    title: 'SQLD 2025년 1회',
    basePath: ['datasets', 'sqld', '2025-first'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'sqld-2025-2': {
    type: 'sqld',
    label: '2025-2',
    title: 'SQLD 2025년 2회',
    basePath: ['datasets', 'sqld', '2025-second'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'sqld-2025-3': {
    type: 'sqld',
    label: '2025-3',
    title: 'SQLD 2025년 3회',
    basePath: ['datasets', 'sqld', '2025-third'],
    sessionProps: {
      backHref: '/sqld',
      lobbySubtitle: '총 50문항 / 2과목(SQLD 객관식)',
      durationSeconds: 90 * 60,
      examProfile: {
        totalPassMin: 30,
        subjects: [
          { id: 1, label: '1과목', start: 1, end: 10, passMin: 4 },
          { id: 2, label: '2과목', start: 11, end: 50, passMin: 16 },
        ],
      },
    },
  },
  'aiprompt-2-1': {
    type: 'aiprompt',
    label: '2급 A형',
    title: 'AI 프롬프트엔지니어링 2급 기출문제 A형',
    basePath: ['datasets', 'aiPromptEngineering', 'grade2-first'],
    sessionProps: {
      backHref: '/aiprompt',
      lobbySubtitle: '총 40문항 / AI 프롬프트엔지니어링 2급 (A형)',
      durationSeconds: 60 * 60,
      examProfile: {
        totalPassMin: 28,
        subjects: [],
      },
    },
  },
  'aiprompt-2-b': {
    type: 'aiprompt',
    label: '2급 B형',
    title: 'AI 프롬프트엔지니어링 2급 기출문제 B형',
    basePath: ['datasets', 'aiPromptEngineering', 'grade2-b'],
    sessionProps: {
      backHref: '/aiprompt',
      lobbySubtitle: '총 40문항 / AI 프롬프트엔지니어링 2급 (B형)',
      durationSeconds: 60 * 60,
      examProfile: {
        totalPassMin: 28,
        subjects: [],
      },
    },
  },
  'aiprompt-mock-1': {
    type: 'aiprompt',
    label: '모의고사 1회',
    title: 'AI 프롬프트엔지니어링 2급 기출모의고사 1회',
    basePath: ['datasets', 'aiPromptEngineering', 'grade2-c'],
    sessionProps: {
      backHref: '/aiprompt',
      lobbySubtitle: '총 40문항 / 기출모의고사 1회',
      durationSeconds: 60 * 60,
      examProfile: {
        totalPassMin: 28,
        subjects: [],
      },
    },
  },
  'aiprompt-mock-2': {
    type: 'aiprompt',
    label: '모의고사 2회',
    title: 'AI 프롬프트엔지니어링 2급 기출모의고사 2회',
    basePath: ['datasets', 'aiPromptEngineering', 'mock-2'],
    sessionProps: {
      backHref: '/aiprompt',
      lobbySubtitle: '총 40문항 / 기출모의고사 2회',
      durationSeconds: 60 * 60,
      examProfile: {
        totalPassMin: 28,
        subjects: [],
      },
    },
  },
  'aiprompt-mock-3': {
    type: 'aiprompt',
    label: '모의고사 3회',
    title: 'AI 프롬프트엔지니어링 2급 기출모의고사 3회',
    basePath: ['datasets', 'aiPromptEngineering', 'mock-3'],
    sessionProps: {
      backHref: '/aiprompt',
      lobbySubtitle: '총 40문항 / 기출모의고사 2회',
      durationSeconds: 60 * 60,
      examProfile: {
        totalPassMin: 28,
        subjects: [],
      },
    },
  },
  'quiz-round-3': {
    type: 'aiprompt',
    label: '개념 정리',
    title: '누군가의 노션 정리',
    basePath: ['datasets', 'quizNow', 'round3'],
    sessionProps: {
      backHref: '/aiprompt',
      lobbySubtitle: '총 25문항 / 챕터 1~5 (AI 기초, NLP, 프롬프트 엔지니어링)',
      durationSeconds: 30 * 60,
      examProfile: {
        totalPassMin: 15,
        subjects: [],
      },
    },
  },
};

export const SQLD_SESSIONS_BY_YEAR = [
  {
    year: 2025,
    sessions: [
      { id: 'sqld-2025-1', round: '1회', description: 'SQLD 2025년 1회 객관식 50문항' },
      { id: 'sqld-2025-2', round: '2회', description: 'SQLD 2025년 2회 객관식 50문항' },
      { id: 'sqld-2025-3', round: '3회', description: 'SQLD 2025년 3회 객관식 50문항' },
    ],
  },
  {
    year: 2024,
    sessions: [
      { id: 'sqld-2024-1', round: '1회', description: 'SQLD 2024년 1회 객관식 50문항' },
      { id: 'sqld-2024-2', round: '2회', description: 'SQLD 2024년 2회 객관식 50문항' },
      { id: 'sqld-2024-3', round: '3회', description: 'SQLD 2024년 3회 객관식 50문항' },
    ],
  },
];

export const AIPROMPT_SESSIONS = [
  {
    id: 'aiprompt-2-1',
    round: '2급 기출문제 A형',
    description: 'AI 프롬프트엔지니어링 2급 A형 40문항',
  },
  {
    id: 'aiprompt-2-b',
    round: '2급 기출문제 B형',
    description: 'AI 프롬프트엔지니어링 2급 B형 40문항',
  },
  {
    id: 'aiprompt-mock-1',
    round: '기출모의고사 1회',
    description: '기출모의고사 1회 40문항',
  },
  {
    id: 'aiprompt-mock-2',
    round: '기출모의고사 2회',
    description: '기출모의고사 2회 40문항',
  },
  {
    id: 'aiprompt-mock-3',
    round: '기출모의고사 3회',
    description: '기출모의고사 3회 40문항',
  },
  {
    id: 'quiz-round-3',
    round: '개념 정리',
    description: 'AI 기초, NLP, 프롬프트 엔지니어링 정리 25문항',
  },
];

export function isSqldSessionId(sessionId) {
  return OBJECTIVE_SESSION_CONFIG[String(sessionId || '')]?.type === 'sqld';
}

export function isAiPromptSessionId(sessionId) {
  return OBJECTIVE_SESSION_CONFIG[String(sessionId || '')]?.type === 'aiprompt';
}

export function objectiveSessionLabel(sessionId) {
  return OBJECTIVE_SESSION_CONFIG[String(sessionId || '')]?.label || String(sessionId || '');
}
