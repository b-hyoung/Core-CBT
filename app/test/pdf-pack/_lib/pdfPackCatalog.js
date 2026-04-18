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
};

export function getPdfPackConfig(slug) {
  return PDF_PACKS[String(slug)] || null;
}

export function listPdfPackConfigs() {
  return Object.values(PDF_PACKS);
}

