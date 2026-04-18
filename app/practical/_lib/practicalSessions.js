export const PRACTICAL_SESSION_CONFIG = {
  'practical-industrial-2022-1': { year: 2022, round: 1, title: '정보처리산업기사 실기 2022년 1회', basePath: ['datasets', 'practicalIndustrial', '2022-first'] },
  'practical-industrial-2022-2': { year: 2022, round: 2, title: '정보처리산업기사 실기 2022년 2회', basePath: ['datasets', 'practicalIndustrial', '2022-second'] },
  'practical-industrial-2022-3': { year: 2022, round: 3, title: '정보처리산업기사 실기 2022년 3회', basePath: ['datasets', 'practicalIndustrial', '2022-third'] },
  'practical-industrial-2023-1': { year: 2023, round: 1, title: '정보처리산업기사 실기 2023년 1회', basePath: ['datasets', 'practicalIndustrial', '2023-first'] },
  'practical-industrial-2023-2': { year: 2023, round: 2, title: '정보처리산업기사 실기 2023년 2회', basePath: ['datasets', 'practicalIndustrial', '2023-second'] },
  'practical-industrial-2023-3': { year: 2023, round: 3, title: '정보처리산업기사 실기 2023년 3회', basePath: ['datasets', 'practicalIndustrial', '2023-third'] },
  'practical-industrial-2024-1': { year: 2024, round: 1, title: '정보처리산업기사 실기 2024년 1회', basePath: ['datasets', 'practicalIndustrial', '2024-first'] },
  'practical-industrial-2024-2': { year: 2024, round: 2, title: '정보처리산업기사 실기 2024년 2회', basePath: ['datasets', 'practicalIndustrial', '2024-second'] },
  'practical-industrial-2024-3': { year: 2024, round: 3, title: '정보처리산업기사 실기 2024년 3회', basePath: ['datasets', 'practicalIndustrial', '2024-third'] },
  'practical-industrial-2025-1': { year: 2025, round: 1, title: '정보처리산업기사 실기 2025년 1회', basePath: ['datasets', 'practicalIndustrial', '2025-first'] },
  'practical-industrial-2025-2': { year: 2025, round: 2, title: '정보처리산업기사 실기 2025년 2회', basePath: ['datasets', 'practicalIndustrial', '2025-second'] },
  'practical-industrial-2025-3': { year: 2025, round: 3, title: '정보처리산업기사 실기 2025년 3회', basePath: ['datasets', 'practicalIndustrial', '2025-third'] },
};

export const PRACTICAL_SESSIONS_BY_YEAR = [2025, 2024, 2023, 2022].map((year) => ({
  year,
  sessions: [1, 2, 3].map((round) => ({
    id: `practical-industrial-${year}-${round}`,
    title: `${round}회`,
    description: `정보처리산업기사 실기 ${year}년 ${round}회`,
  })),
}));

export function isPracticalSessionId(sessionId) {
  return Object.prototype.hasOwnProperty.call(PRACTICAL_SESSION_CONFIG, String(sessionId || ''));
}

export function practicalSessionLabel(sessionId) {
  const cfg = PRACTICAL_SESSION_CONFIG[String(sessionId || '')];
  if (!cfg) return String(sessionId || '');
  return `${cfg.year}-${cfg.round}`;
}
