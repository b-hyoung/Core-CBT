export const PDF_PACKS = {
  'industrial-2025-1': {
    slug: 'industrial-2025-1',
    title: '2025년 1회 정보처리산업기사 필기',
    shortTitle: '2025년 1회 산업기사 필기',
    description: '2025년 1회 정보처리산업기사 필기 문제입니다.',
    kindLabel: '정보처리산업기사 필기',
  },
  'industrial-2025-2': {
    slug: 'industrial-2025-2',
    title: '2025년 2회 정보처리산업기사 필기',
    shortTitle: '2025년 2회 산업기사 필기',
    description: '2025년 2회 정보처리산업기사 필기 문제입니다.',
    kindLabel: '정보처리산업기사 필기',
  },
  'industrial-2025-3': {
    slug: 'industrial-2025-3',
    title: '2025년 3회 정보처리산업기사 필기',
    shortTitle: '2025년 3회 산업기사 필기',
    description: '2025년 3회 정보처리산업기사 필기 문제입니다.',
    kindLabel: '정보처리산업기사 필기',
  },

  // 네트워크관리사 2급 필기 (comcbt 교사용 PDF 추출본, 50문항 / 4과목)
  'network2-20240225': {
    slug: 'network2-20240225',
    title: '2024년 2월 25일 네트워크관리사 2급 필기',
    shortTitle: '2024.02.25 네트워크관리사 2급',
    description: '2024년 2월 25일 네트워크관리사 2급 필기 기출문제입니다.',
    kindLabel: '네트워크관리사 2급 필기',
  },
  'network2-20240519': {
    slug: 'network2-20240519',
    title: '2024년 5월 19일 네트워크관리사 2급 필기',
    shortTitle: '2024.05.19 네트워크관리사 2급',
    description: '2024년 5월 19일 네트워크관리사 2급 필기 기출문제입니다.',
    kindLabel: '네트워크관리사 2급 필기',
  },
  'network2-20240825': {
    slug: 'network2-20240825',
    title: '2024년 8월 25일 네트워크관리사 2급 필기',
    shortTitle: '2024.08.25 네트워크관리사 2급',
    description: '2024년 8월 25일 네트워크관리사 2급 필기 기출문제입니다.',
    kindLabel: '네트워크관리사 2급 필기',
  },
  'network2-20241103': {
    slug: 'network2-20241103',
    title: '2024년 11월 3일 네트워크관리사 2급 필기',
    shortTitle: '2024.11.03 네트워크관리사 2급',
    description: '2024년 11월 3일 네트워크관리사 2급 필기 기출문제입니다.',
    kindLabel: '네트워크관리사 2급 필기',
  },
  'network2-20250223': {
    slug: 'network2-20250223',
    title: '2025년 2월 23일 네트워크관리사 2급 필기',
    shortTitle: '2025.02.23 네트워크관리사 2급',
    description: '2025년 2월 23일 네트워크관리사 2급 필기 기출문제입니다.',
    kindLabel: '네트워크관리사 2급 필기',
  },
  'network2-20250525': {
    slug: 'network2-20250525',
    title: '2025년 5월 25일 네트워크관리사 2급 필기',
    shortTitle: '2025.05.25 네트워크관리사 2급',
    description: '2025년 5월 25일 네트워크관리사 2급 필기 기출문제입니다.',
    kindLabel: '네트워크관리사 2급 필기',
  },
  'network2-20250824': {
    slug: 'network2-20250824',
    title: '2025년 8월 24일 네트워크관리사 2급 필기',
    shortTitle: '2025.08.24 네트워크관리사 2급',
    description: '2025년 8월 24일 네트워크관리사 2급 필기 기출문제입니다.',
    kindLabel: '네트워크관리사 2급 필기',
  },
  'network2-20251102': {
    slug: 'network2-20251102',
    title: '2025년 11월 2일 네트워크관리사 2급 필기',
    shortTitle: '2025.11.02 네트워크관리사 2급',
    description: '2025년 11월 2일 네트워크관리사 2급 필기 기출문제입니다.',
    kindLabel: '네트워크관리사 2급 필기',
  },
  'network2-20260201': {
    slug: 'network2-20260201',
    title: '2026년 2월 1일 네트워크관리사 2급 필기',
    shortTitle: '2026.02.01 네트워크관리사 2급',
    description: '2026년 2월 1일 네트워크관리사 2급 필기 기출문제입니다.',
    kindLabel: '네트워크관리사 2급 필기',
  },
  'network2-20260517': {
    slug: 'network2-20260517',
    title: '2026년 5월 17일 네트워크관리사 2급 필기',
    shortTitle: '2026.05.17 네트워크관리사 2급',
    description: '2026년 5월 17일 네트워크관리사 2급 필기 기출문제입니다.',
    kindLabel: '네트워크관리사 2급 필기',
  },
};

export function getPdfPackConfig(slug) {
  return PDF_PACKS[String(slug)] || null;
}

export function listPdfPackConfigs() {
  return Object.values(PDF_PACKS);
}

