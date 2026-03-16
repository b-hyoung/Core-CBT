export const ADMIN_EXAM_TYPE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'written', label: '필기' },
  { value: 'practical', label: '실기' },
  { value: 'sqld', label: 'SQLD' },
  { value: 'aiprompt', label: 'AI 프롬프트' },
];

export const EXAM_TYPE_LABELS = {
  all: '전체',
  written: '필기',
  practical: '실기',
  sqld: 'SQLD',
  aiprompt: 'AI-Prompt',
};

export function normalizeExamType(v) {
  const x = String(v || 'all').toLowerCase();
  if (x === 'written') return 'written';
  if (x === 'practical') return 'practical';
  if (x === 'sqld') return 'sqld';
  if (x === 'aiprompt') return 'aiprompt';
  return 'all';
}

export function classifySessionId(sessionId) {
  const sid = String(sessionId || '').trim();
  if (!sid) return '';
  if (sid.startsWith('sqld-') || sid === 'sqld-index') return 'sqld';
  if (sid.startsWith('practical-')) return 'practical';
  if (sid.startsWith('aiprompt-') || sid === 'aiprompt-index') return 'aiprompt';
  return 'written';
}

export function classifyEventCategory(event) {
  const direct = classifySessionId(event?.sessionId);
  if (direct) return direct;

  const path = String(event?.path || '').trim();
  if (path.startsWith('/sqld')) return 'sqld';
  if (path.startsWith('/practical')) return 'practical';
  if (path.startsWith('/aiprompt')) return 'aiprompt';
  if (path.startsWith('/test')) return 'written';

  const originSessionId = String(event?.payload?.originSessionId || '').trim();
  if (originSessionId) return classifySessionId(originSessionId);

  const outcomes = Array.isArray(event?.payload?.problemOutcomes) ? event.payload.problemOutcomes : [];
  const sourceSessionId = String(outcomes[0]?.sessionId || '').trim();
  if (sourceSessionId) return classifySessionId(sourceSessionId);

  return '';
}

export function examTypeLabel(examType) {
  return EXAM_TYPE_LABELS[String(examType || '').toLowerCase()] || '기타';
}
